
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase URL or Key not found in environment variables. Database features will not work.");
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
        auth: {
            persistSession: true,
            storageKey: 'pos-app-auth',
            storage: window.localStorage,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    }
);

// Helper to check if supabase is configured
export const isSupabaseConfigured = () => {
    return supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co';
};
