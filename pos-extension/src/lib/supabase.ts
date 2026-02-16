import { createClient } from '@supabase/supabase-js';

// Access environment variables safely
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing in environment variables');
}

export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || '',
    {
        auth: {
            storage: {
                getItem: async (key) => {
                    const result = await chrome.storage.local.get(key);
                    return (result[key] as string) || null;
                },
                setItem: async (key, value) => {
                    await chrome.storage.local.set({ [key]: value });
                },
                removeItem: async (key) => {
                    await chrome.storage.local.remove(key);
                },
            },
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
        },
    }
);
