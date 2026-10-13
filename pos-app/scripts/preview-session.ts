// Generates a full Brain Gym session with the real agents, without touching the database, and
// writes it to a JSON file for review. Useful after changing prompts or models.
//
//   npx --yes tsx scripts/preview-session.ts [weekday|saturday|sunday] [out.json]
//
// Reads GEMINI_API_KEY from supabase/functions/.env. The lesson and history series start at part 1.

import { readFileSync, writeFileSync } from 'node:fs';
import { buildBriefing } from '../supabase/functions/bg-build-session/news.ts';
import {
    BuildContext, CLOSE, WEEKLY_REVIEW,
    buildHistory, buildInterviewRep, buildLesson, buildMockInterview, buildNumbers, buildTeardown, buildThink, planSyllabus,
} from '../supabase/functions/bg-build-session/generators.ts';

const apiKey = process.env.GEMINI_API_KEY ?? readFileSync(new URL('../supabase/functions/.env', import.meta.url), 'utf8')
    .split('\n').find(l => l.startsWith('GEMINI_API_KEY='))?.slice('GEMINI_API_KEY='.length).trim();
if (!apiKey) throw new Error('No GEMINI_API_KEY');

const kind = (process.argv[2] ?? 'weekday') as 'weekday' | 'saturday' | 'sunday';
const out = process.argv[3] ?? `session-preview-${kind}.json`;
const ctx: BuildContext = {
    apiKey,
    date: new Date().toISOString().slice(0, 10),
    profile: 'Product manager, about 6 years at one Indian proptech startup (sales, operations, program management, then APM and PM). Finishing a Master of Business IT in Melbourne. Targeting PM and AI PM roles.',
    recentTitles: {},
};

const timed = async <T>(name: string, p: Promise<T>): Promise<T | null> => {
    const t = Date.now();
    try {
        const r = await p;
        console.log(`✓ ${name.padEnd(14)} ${((Date.now() - t) / 1000).toFixed(1)}s`);
        return r;
    } catch (e) {
        console.log(`✗ ${name.padEnd(14)} ${((Date.now() - t) / 1000).toFixed(1)}s  ${e instanceof Error ? e.message : e}`);
        return null;
    }
};

(async () => {
    const t0 = Date.now();
    let modules: unknown[] = [];
    if (kind === 'weekday') {
        const briefingThenThink = (async () => {
            const b = await timed('ai_briefing', buildBriefing(apiKey, new Date(), new Set()));
            const t = await timed('think', buildThink(ctx, b?.headlines ?? []));
            return [b?.module, t];
        })();
        const lesson = (async () => {
            const syl = await timed('lesson plan', planSyllabus(apiKey, 'lesson', 'Game Theory'));
            return syl ? timed('lesson', buildLesson(ctx, { name: 'Game Theory', total: syl.length }, syl[0], syl)) : null;
        })();
        const history = (async () => {
            const syl = await timed('history plan', planSyllabus(apiKey, 'history', 'The Cold War'));
            return syl ? timed('history', buildHistory(ctx, { name: 'The Cold War', total: syl.length }, syl[0], syl)) : null;
        })();
        const [[b, th], iv, nu, le, hi] = await Promise.all([briefingThenThink, timed('interview_rep', buildInterviewRep(ctx)), timed('numbers', buildNumbers(ctx)), lesson, history]);
        modules = [b, iv, th, nu, le, hi, CLOSE];
    } else if (kind === 'saturday') {
        modules = [await timed('mock_interview', buildMockInterview(ctx)), CLOSE];
    } else {
        modules = [WEEKLY_REVIEW, await timed('teardown', buildTeardown(ctx)), CLOSE];
    }
    writeFileSync(out, JSON.stringify(modules, null, 2));
    console.log(`\nWall clock ${((Date.now() - t0) / 1000).toFixed(1)}s (all modules in parallel). Written to ${out}`);
})();
