// Supabase Edge Function: bg-grade
// Grades a submitted Brain Gym answer and stores the feedback on the attempt. Logic in grader.ts.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GRADED_MODULES, gradeAnswer } from './grader.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

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
    if (!GEMINI_API_KEY) return json({ error: 'The grader is not configured' }, 503);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401);
    // Acts as the signed-in user, so RLS limits it to their own attempts
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { attemptId } = await req.json();
    if (typeof attemptId !== 'string') return json({ error: 'attemptId is required' }, 400);

    const { data: attempt } = await supabase.from('bg_attempts').select('id, module_id, response, created_at').eq('id', attemptId).maybeSingle();
    if (!attempt) return json({ error: 'Attempt not found' }, 404);
    const { data: module } = await supabase.from('bg_modules').select('module_key, content').eq('id', attempt.module_id).maybeSingle();
    if (!module) return json({ error: 'Module not found' }, 404);
    if (!GRADED_MODULES.has(module.module_key)) return json({ error: 'This module is not graded' }, 400);

    const answer = typeof attempt.response?.text === 'string' ? attempt.response.text : '';
    if (!answer.trim()) return json({ error: 'Nothing to grade' }, 400);

    // The latest earlier graded attempt, so a redo shows what changed
    const { data: earlier } = await supabase.from('bg_attempts').select('response, score')
      .eq('module_id', attempt.module_id).lt('created_at', attempt.created_at).not('score', 'is', null)
      .order('created_at', { ascending: false }).limit(1);
    const prev = earlier?.[0];
    const previous = prev && typeof prev.response?.text === 'string' ? { answer: prev.response.text, score: Math.round(Number(prev.score) * 10) } : undefined;

    const feedback = await gradeAnswer(GEMINI_API_KEY, module.module_key, module.content ?? {}, answer, previous);
    // bg_attempts.score is 0-1 for every module (Numbers stores the fraction correct); the 1-10 lives in feedback
    const { error } = await supabase.from('bg_attempts').update({ score: feedback.score / 10, feedback }).eq('id', attemptId);
    if (error) throw error;

    return json({ score: feedback.score, feedback });
  } catch (e) {
    console.error('bg-grade error:', e);
    return json({ error: e instanceof Error ? e.message : 'Grading failed' }, 500);
  }
});
