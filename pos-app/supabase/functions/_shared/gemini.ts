// Gemini REST calls shared by the Brain Gym edge functions and scripts. No Deno- or Node-specific APIs.

// Pin exact versions; never "-latest" aliases (a repointed alias once stalled a production app)
export const FAST_MODEL = 'gemini-3.8-flash';
export const CAREFUL_MODEL = 'gemini-3.1-pro-preview';

export interface GeminiPart { text: string }
export interface GeminiContent { role: 'user' | 'model'; parts: GeminiPart[] }

// A stuck call must never stall a whole session build
const TIMEOUT_MS = 120_000;
// Caps a runaway structured reply (a looping model otherwise generates until the connection dies)
const MAX_OUTPUT_TOKENS = 12_000;
const withTimeout = (init: RequestInit): RequestInit => ({ ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });

// Retry rate limits and temporary overloads (preview models allow few requests per minute)
const RETRY_STATUSES = new Set([429, 500, 503]);
const RETRY_DELAYS_MS = [4_000, 12_000, 25_000];
const fetchWithRetry = async (url: string, init: RequestInit): Promise<Response> => {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, withTimeout(init));
    if (res.ok || !RETRY_STATUSES.has(res.status) || attempt >= RETRY_DELAYS_MS.length) return res;
    await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[attempt]));
  }
};

const ENDPOINT = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const extractText = (data: unknown): string => {
  const parts = (data as { candidates?: { content?: { parts?: GeminiPart[] } }[] })?.candidates?.[0]?.content?.parts ?? [];
  return parts.map(p => p.text ?? '').join('');
};

// Structured output: the reply is parsed JSON matching `schema`
export const callGemini = async <T = Record<string, unknown>>(
  apiKey: string,
  system: string,
  contents: GeminiContent[],
  schema: Record<string, unknown>,
  temperature: number,
  model = FAST_MODEL,
): Promise<T> => {
  const res = await fetchWithRetry(ENDPOINT(model), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature, maxOutputTokens: MAX_OUTPUT_TOKENS, responseMimeType: 'application/json', responseSchema: schema },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${model} error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const text = extractText(await res.json());
  if (!text) throw new Error(`Gemini ${model} returned an empty response`);
  return JSON.parse(text) as T;
};

export interface GroundedResult {
  text: string;
  sources: { title: string; url: string }[];
}

// Free-text answer grounded in Google Search. Structured output can't be combined with the search
// tool, so callers structure the result in a second call.
export const callGeminiWithSearch = async (apiKey: string, prompt: string, model = FAST_MODEL): Promise<GroundedResult> => {
  const res = await fetchWithRetry(ENDPOINT(model), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.2 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini search error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sources = chunks
    .map((c: { web?: { title?: string; uri?: string } }) => ({ title: c.web?.title ?? '', url: c.web?.uri ?? '' }))
    .filter((s: { url: string }) => s.url);
  return { text: extractText(data), sources };
};
