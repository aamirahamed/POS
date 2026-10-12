import { GenerativeModel, GoogleGenerativeAI, ModelParams } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

// Gemini calls go through the gemini-proxy edge function, which holds the API key server-side.
// The browser only ever sends the user's Supabase session.
const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-proxy`;

export interface GenAI {
    getGenerativeModel: (params: ModelParams) => GenerativeModel;
}

export const createGenAI = async (): Promise<GenAI> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sign in to use the assistant.');
    // The SDK insists on a key string; the proxy ignores it and uses the real one
    const client = new GoogleGenerativeAI('held-by-server');
    const requestOptions = {
        baseUrl: PROXY_URL,
        customHeaders: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
    };
    return { getGenerativeModel: params => client.getGenerativeModel(params, requestOptions) };
};
