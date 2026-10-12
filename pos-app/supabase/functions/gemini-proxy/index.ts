// Supabase Edge Function: gemini-proxy
// Lets the browser use Gemini without ever holding the API key. The @google/generative-ai SDK is
// pointed here via requestOptions.baseUrl; this function checks the caller is the owner, swaps in
// the real key from secrets, and forwards only text-generation calls to Google.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const OWNER_USER_ID = Deno.env.get('OWNER_USER_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const GOOGLE_BASE = 'https://generativelanguage.googleapis.com';

// Only text generation and token counting; nothing that uploads files, tunes models or manages keys
const ALLOWED_PATH = /^\/v1(beta)?\/models\/[\w.-]+:(generateContent|countTokens)$/;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-goog-api-key, x-goog-api-client',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify({ error: { message: body } }), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json('Method not allowed', 405);
  if (!GEMINI_API_KEY || !OWNER_USER_ID) return json('Gemini proxy is not configured', 503);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json('Missing authorization header', 401);
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return json('Unauthorized', 401);
  if (user.id !== OWNER_USER_ID) return json('Forbidden', 403);

  // Incoming path looks like /gemini-proxy/v1beta/models/gemini-2.5-flash:generateContent
  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*?\/gemini-proxy/, '');
  if (!ALLOWED_PATH.test(path)) return json(`Path not allowed: ${path}`, 400);

  const upstream = await fetch(`${GOOGLE_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: await req.text(),
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { ...CORS, 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
  });
});
