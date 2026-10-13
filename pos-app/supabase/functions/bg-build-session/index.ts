// Supabase Edge Function: bg-build-session
// The Session Builder. Writes a day's Brain Gym session with the content agents (generators.ts,
// news.ts) and stores it. Runs nightly from pg_cron and on demand from the app.
//
// Access:
//   - Owner (signed-in JWT): any date in the program, and force=true to rebuild an untouched day.
//   - Anyone else, including the cron job: only "build today or tomorrow if it is missing". That is
//     idempotent, so an unauthenticated caller can at most trigger a build that was due anyway.
// Never overwrites a day that has any completed module.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ModuleKey, ModuleOut } from '../_shared/content.ts';
import { buildBriefing } from './news.ts';
import {
  BuildContext, CLOSE, SyllabusPart, WEEKLY_REVIEW,
  buildHistory, buildInterviewRep, buildLesson, buildMockInterview, buildNumbers, buildTeardown, buildThink, planSyllabus,
} from './generators.ts';

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const OWNER_USER_ID = Deno.env.get('OWNER_USER_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const DEFAULT_SERIES: Record<'lesson' | 'history', string[]> = {
  lesson: ['Game Theory', 'How Consciousness Works', "Carl Jung's Psychology", 'Quantum Physics Without the Maths', 'The Big Questions of Philosophy', 'Identity: What Makes You You'],
  history: ['The Cold War', 'The Rise and Fall of Rome', 'The Industrial Revolution', 'The World Wars', 'The Silk Roads', 'The Age of Revolutions'],
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const dateInZone = (d: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const dayKindOf = (date: string) => {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  return dow === 6 ? 'saturday' : dow === 0 ? 'sunday' : 'weekday';
};

// ── Series state ──────────────────────────────────────────────────────────────

interface SeriesRow { id: string; kind: 'lesson' | 'history'; name: string; status: string; position: number; syllabus: SyllabusPart[]; next_part: number }

// reusePart: when rebuilding a day, regenerate the part it already had instead of moving on
const seriesPart = async (db: SupabaseClient, userId: string, kind: 'lesson' | 'history', reuse?: { name: string; part: number }) => {
  let { data: rows } = await db.from('bg_series').select('*').eq('user_id', userId).eq('kind', kind).order('position');
  if (!rows?.length) {
    await db.from('bg_series').insert(DEFAULT_SERIES[kind].map((name, i) => ({ user_id: userId, kind, name, position: i, status: i === 0 ? 'active' : 'queued' })));
    ({ data: rows } = await db.from('bg_series').select('*').eq('user_id', userId).eq('kind', kind).order('position'));
  }
  let series = (rows as SeriesRow[]).find(r => r.status === 'active') ?? (rows as SeriesRow[]).find(r => r.status === 'queued');
  if (!series) throw new Error(`No ${kind} series left in the queue`);
  if (series.status !== 'active') {
    await db.from('bg_series').update({ status: 'active' }).eq('id', series.id);
    series = { ...series, status: 'active' };
  }
  if (!series.syllabus?.length) {
    const syllabus = await planSyllabus(GEMINI_API_KEY!, kind, series.name);
    await db.from('bg_series').update({ syllabus }).eq('id', series.id);
    series = { ...series, syllabus };
  }
  const partNumber = reuse && reuse.name === series.name ? reuse.part : series.next_part;
  const part = series.syllabus[partNumber - 1] ?? series.syllabus[series.syllabus.length - 1];
  return { series, part, advance: !(reuse && reuse.name === series.name) };
};

const advanceSeries = async (db: SupabaseClient, series: SeriesRow) => {
  const next = series.next_part + 1;
  await db.from('bg_series').update(next > series.syllabus.length ? { next_part: next, status: 'done' } : { next_part: next }).eq('id', series.id);
};

// ── Build ─────────────────────────────────────────────────────────────────────

interface BuildResult { status: 'built' | 'skipped'; date: string; reason?: string; modules?: string[]; failed?: { module: string; error: string }[]; seconds?: number }

const buildDay = async (db: SupabaseClient, userId: string, date: string, force: boolean): Promise<BuildResult> => {
  const started = Date.now();
  const { data: program } = await db.from('bg_programs').select('*').eq('user_id', userId).maybeSingle();
  if (!program) return { status: 'skipped', date, reason: 'No program' };
  const end = addDays(program.start_date, program.length_days - 1);
  if (date < program.start_date || date > end) return { status: 'skipped', date, reason: 'Outside the program' };

  const { data: existing } = await db.from('bg_days').select('id, source, bg_modules(completed_at, module_key, content)').eq('user_id', userId).eq('day_date', date).maybeSingle();
  if (existing) {
    const started = (existing.bg_modules as { completed_at: string | null }[]).some(m => m.completed_at);
    if (started) return { status: 'skipped', date, reason: 'Day already started' };
    if (existing.source === 'agent' && !force) return { status: 'skipped', date, reason: 'Already built' };
  }

  // Context: a slice of the strategy memo for personalisation, and recent titles to avoid repeats
  const { data: memo } = await db.from('user_facts').select('fact_value').eq('user_id', userId).eq('fact_key', 'strategy_memo').maybeSingle();
  const profile = typeof memo?.fact_value === 'string' ? memo.fact_value.slice(0, 3500) : 'Product manager preparing for PM and AI PM interviews.';
  const { data: recent } = await db.from('bg_modules').select('module_key, content, bg_days!inner(day_date)')
    .eq('user_id', userId).gte('bg_days.day_date', addDays(date, -21)).lt('bg_days.day_date', date);
  const recentTitles: Record<string, string[]> = {};
  for (const r of recent ?? []) {
    const intro = (r.content as { intro?: string })?.intro;
    if (intro) (recentTitles[r.module_key] ??= []).push(intro);
  }
  const { data: usedNews } = await db.from('bg_news_items').select('url').eq('user_id', userId);
  const usedUrls = new Set((usedNews ?? []).map(n => n.url as string));

  const ctx: BuildContext = { apiKey: GEMINI_API_KEY!, date, profile, recentTitles };

  // A rebuild keeps the series parts the day already had
  const previousPart = (kind: 'lesson' | 'history') => {
    const m = (existing?.bg_modules as { module_key: string; content: { series?: { name: string; part: number } } }[] | undefined)
      ?.find(x => x.module_key === kind);
    return m?.content?.series;
  };
  const kind = dayKindOf(date);
  const failed: { module: string; error: string }[] = [];
  const settle = async <T>(name: string, p: Promise<T>): Promise<T | null> => {
    try { return await p; } catch (e) { failed.push({ module: name, error: e instanceof Error ? e.message : String(e) }); return null; }
  };

  let modules: (ModuleOut | null)[] = [];
  let newsUsed: { url: string; title: string; source: string; published?: string }[] = [];
  const seriesToAdvance: SeriesRow[] = [];

  if (kind === 'weekday') {
    const briefingAndThink = (async () => {
      const briefing = await settle('ai_briefing', buildBriefing(GEMINI_API_KEY!, new Date(), usedUrls));
      if (briefing) newsUsed = briefing.used;
      const think = await settle('think', buildThink(ctx, briefing?.headlines ?? []));
      return [briefing?.module ?? null, think];
    })();
    const lesson = settle('lesson', (async () => {
      const { series, part, advance } = await seriesPart(db, userId, 'lesson', previousPart('lesson'));
      const m = await buildLesson(ctx, { name: series.name, total: series.syllabus.length }, part, series.syllabus);
      if (advance) seriesToAdvance.push(series);
      return m;
    })());
    const history = settle('history', (async () => {
      const { series, part, advance } = await seriesPart(db, userId, 'history', previousPart('history'));
      const m = await buildHistory(ctx, { name: series.name, total: series.syllabus.length }, part, series.syllabus);
      if (advance) seriesToAdvance.push(series);
      return m;
    })());
    const [[briefing, think], interview, numbers, l, h] = await Promise.all([
      briefingAndThink, settle('interview_rep', buildInterviewRep(ctx)), settle('numbers', buildNumbers(ctx)), lesson, history,
    ]);
    modules = [briefing, interview, think, numbers, l, h, CLOSE];
  } else if (kind === 'saturday') {
    modules = [await settle('mock_interview', buildMockInterview(ctx)), CLOSE];
  } else {
    modules = [WEEKLY_REVIEW, await settle('teardown', buildTeardown(ctx)), CLOSE];
  }

  const built = modules.filter((m): m is ModuleOut => !!m);
  if (built.every(m => m.moduleKey === 'close' || m.moduleKey === 'weekly_review')) {
    throw new Error(`Every agent module failed: ${failed.map(f => `${f.module}: ${f.error}`).join('; ')}`);
  }

  // Replace an untouched existing day, then insert. A unique violation means another build won the race.
  if (existing) {
    const { data: recheck } = await db.from('bg_modules').select('completed_at').eq('day_id', existing.id).not('completed_at', 'is', null);
    if (recheck?.length) return { status: 'skipped', date, reason: 'Day was started during the build' };
    await db.from('bg_days').delete().eq('id', existing.id);
  }
  const buildLog = { built: built.map(m => m.moduleKey), failed, seconds: Math.round((Date.now() - started) / 1000), at: new Date().toISOString() };
  const { data: day, error: dayError } = await db.from('bg_days').insert({ user_id: userId, day_date: date, day_kind: kind, source: 'agent', build_log: buildLog }).select('id').single();
  if (dayError) {
    if (dayError.code === '23505') return { status: 'skipped', date, reason: 'Built by another run' };
    throw dayError;
  }
  const { error: modError } = await db.from('bg_modules').insert(built.map((m, i) => ({
    day_id: day.id, user_id: userId, module_key: m.moduleKey as ModuleKey, position: i, title: m.title, minutes: m.minutes, content: m.content,
  })));
  if (modError) {
    await db.from('bg_days').delete().eq('id', day.id);
    throw modError;
  }

  if (newsUsed.length) {
    await db.from('bg_news_items').upsert(
      newsUsed.map(n => ({ user_id: userId, url: n.url, title: n.title, source: n.source, published_at: n.published ?? null, used_on: date })),
      { onConflict: 'user_id,url', ignoreDuplicates: true },
    );
  }
  for (const s of seriesToAdvance) await advanceSeries(db, s);

  return { status: 'built', date, modules: built.map(m => m.moduleKey), failed, seconds: Math.round((Date.now() - started) / 1000) };
};

// ── HTTP ──────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!GEMINI_API_KEY || !OWNER_USER_ID) return json({ error: 'Session Builder is not configured' }, 503);

  let body: { date?: string; force?: boolean; wait?: boolean } = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }

  // Is the caller the signed-in owner?
  let isOwner = false;
  const authHeader = req.headers.get('Authorization');
  if (authHeader) {
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    isOwner = user?.id === OWNER_USER_ID;
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: program } = await db.from('bg_programs').select('timezone').eq('user_id', OWNER_USER_ID).maybeSingle();
  const today = dateInZone(new Date(), program?.timezone ?? 'Australia/Melbourne');
  const requested = body.date === 'tomorrow' ? addDays(today, 1) : !body.date || body.date === 'today' ? today : body.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requested)) return json({ error: 'date must be today, tomorrow or YYYY-MM-DD' }, 400);

  if (!isOwner && (body.force || (requested !== today && requested !== addDays(today, 1)))) {
    return json({ error: 'Only the owner can rebuild or build other dates' }, 403);
  }

  const run = buildDay(db, OWNER_USER_ID, requested, isOwner && !!body.force)
    .then(r => { console.log('build result:', JSON.stringify(r)); return r; })
    .catch(e => { console.error('build failed:', e); return { status: 'failed', date: requested, error: e instanceof Error ? e.message : String(e) }; });

  // The owner can wait for the result (useful for testing); otherwise build in the background
  if (isOwner && body.wait) return json(await run);
  if (typeof EdgeRuntime !== 'undefined') {
    EdgeRuntime.waitUntil(run);
    return json({ status: 'building', date: requested }, 202);
  }
  return json(await run);
});
