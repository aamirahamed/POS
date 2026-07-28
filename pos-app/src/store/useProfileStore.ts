import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { ProfileState } from '@/types/profile';

export const useProfileStore = create<ProfileState>((set) => ({
    facts: {},
    isLoading: false,

    loadFacts: async () => {
        set({ isLoading: true });
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('user_facts')
                .select('fact_key, fact_value')
                .eq('user_id', user.id);

            if (error) {
                console.error("Error loading profile facts:", error);
                return;
            }

            if (data) {
                const factsMap: Record<string, any> = {};
                data.forEach(item => {
                    factsMap[item.fact_key] = item.fact_value;
                });
                set({ facts: factsMap });
            }
        } finally {
            set({ isLoading: false });
        }
    },

    updateFact: async (key: string, value: any) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('user_facts')
            .upsert({
                user_id: user.id,
                fact_key: key,
                fact_value: value,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,fact_key' });

        if (error) {
            console.error(`Error updating fact "${key}":`, error);
            throw error;
        }

        set((state) => ({
            facts: {
                ...state.facts,
                [key]: value
            }
        }));
    },

    deleteFact: async (key: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('user_facts')
            .delete()
            .eq('user_id', user.id)
            .eq('fact_key', key);

        if (error) {
            console.error(`Error deleting fact "${key}":`, error);
            throw error;
        }

        set((state) => {
            const copy = { ...state.facts };
            delete copy[key];
            return { facts: copy };
        });
    }
}));
