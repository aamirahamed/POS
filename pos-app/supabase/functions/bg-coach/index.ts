// Supabase Edge Function: bg-coach
// The Brain Gym helper. One helper across every module, in a mode set by the module:
//   coach   - exercises: the lightest nudge that unblocks Aamir, never the answer (leak-checked)
//   tutor   - lessons, history, AI briefing: explains freely and goes deeper
//   reflect - close, weekly review: asks questions, never writes the reflection
//   review  - an exercise he has already finished: can now discuss the answer openly
// Prompts and the reply pipeline live in helper.ts (shared with scripts/eval-helper.ts).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BASE_MODE, Mode, generateReply } from './helper.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const MAX_USER_MESSAGES_PER_MODULE = 25;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    if (!GEMINI_API_KEY) return json({ error: 'The helper is not configured yet (GEMINI_API_KEY is missing).' }, 503);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401);
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: 'Unauthorized' }, 401);

    const { moduleId, message, draft } = await req.json();
    if (typeof moduleId !== 'string' || typeof message !== 'string' || !message.trim()) {
      return json({ error: 'moduleId and message are required' }, 400);
    }
    if (message.length > 2000) return json({ error: 'Message is too long' }, 400);

    const { data: module, error: moduleError } = await supabase
      .from('bg_modules')
      .select('id, module_key, title, content, completed_at')
      .eq('id', moduleId)
      .maybeSingle();
    if (moduleError) throw moduleError;
    if (!module) return json({ error: 'Module not found' }, 404);

    const base = BASE_MODE[module.module_key];
    if (!base) return json({ error: 'The helper is not available for this module' }, 400);
    const mode: Mode = base === 'coach' && module.completed_at ? 'review' : base;

    const { data: history, error: historyError } = await supabase
      .from('bg_coach_messages')
      .select('role, text')
      .eq('module_id', moduleId)
      .order('created_at', { ascending: true });
    if (historyError) throw historyError;
    if ((history ?? []).filter(m => m.role === 'user').length >= MAX_USER_MESSAGES_PER_MODULE) {
      const nudge = mode === 'coach' ? ' Time to commit to an answer.' : '';
      return json({ error: `That's ${MAX_USER_MESSAGES_PER_MODULE} questions on this module.${nudge}` }, 429);
    }

    const result = await generateReply({
      apiKey: GEMINI_API_KEY,
      mode,
      moduleTitle: module.title,
      moduleKey: module.module_key,
      content: module.content ?? {},
      history: history ?? [],
      draft: typeof draft === 'string' ? draft : '',
      message,
    });

    const { error: insertError } = await supabase.from('bg_coach_messages').insert([
      { module_id: moduleId, user_id: user.id, role: 'user', text: message.trim(), mode },
      { module_id: moduleId, user_id: user.id, role: 'coach', text: result.reply, move: result.move, level: result.level, mode },
    ]);
    if (insertError) throw insertError;

    return json({ reply: result.reply, move: result.move, level: result.level, mode });
  } catch (e) {
    console.error('bg-coach error:', e);
    return json({ error: e instanceof Error ? e.message : 'Helper failed' }, 500);
  }
});
