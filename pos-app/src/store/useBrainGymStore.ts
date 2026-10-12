import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { BgDay, BgProgram, dateInZone, dayKindOf, programEndDate } from '@/modules/brain-gym/quest';
import { templatesFor } from '@/modules/brain-gym/sampleContent';
import {
    BgAttempt,
    createDay,
    createProgram,
    deleteProgram,
    fetchAttempts,
    fetchDays,
    fetchProgram,
    insertAttempt,
    markModuleComplete,
} from '@/services/brainGymService';

export const DEFAULT_TIMEZONE = 'Australia/Melbourne';

interface BrainGymState {
    program: BgProgram | null;
    days: BgDay[];
    attempts: BgAttempt[];
    loaded: boolean;
    loading: boolean;
    error: string | null;

    load: () => Promise<void>;
    startProgram: (startDate: string) => Promise<void>;
    restartProgram: () => Promise<void>;
    submitAnswer: (moduleId: string, response: Record<string, unknown>, score: number | null) => Promise<void>;
    completeModule: (moduleId: string) => Promise<void>;
}

const requireUserId = async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');
    return user.id;
};

export const todayFor = (program: BgProgram | null): string =>
    dateInZone(new Date(), program?.timezone ?? DEFAULT_TIMEZONE);

export const useBrainGymStore = create<BrainGymState>((set, get) => ({
    program: null,
    days: [],
    attempts: [],
    loaded: false,
    loading: false,
    error: null,

    // Loads everything, and creates today's session if the program is running and it doesn't exist yet.
    // Phase 2 moves session creation to the nightly Session Builder; this stays as the fallback.
    load: async () => {
        set({ loading: true, error: null });
        try {
            const userId = await requireUserId();
            const program = await fetchProgram(userId);
            if (!program) {
                set({ program: null, days: [], attempts: [], loaded: true, loading: false });
                return;
            }
            let days = await fetchDays(userId);
            const today = todayFor(program);
            const running = today >= program.startDate && today <= programEndDate(program);
            if (running && !days.some(d => d.date === today)) {
                const kind = dayKindOf(today);
                await createDay(userId, today, kind, templatesFor(kind));
                days = await fetchDays(userId);
            }
            const attempts = await fetchAttempts(userId);
            set({ program, days, attempts, loaded: true, loading: false });
        } catch (e) {
            set({ error: e instanceof Error ? e.message : 'Failed to load Brain Gym', loading: false, loaded: true });
        }
    },

    startProgram: async (startDate) => {
        const userId = await requireUserId();
        await createProgram(userId, startDate);
        await get().load();
    },

    restartProgram: async () => {
        const userId = await requireUserId();
        await deleteProgram(userId);
        set({ program: null, days: [], attempts: [] });
    },

    submitAnswer: async (moduleId, response, score) => {
        const userId = await requireUserId();
        const attempt = await insertAttempt(userId, moduleId, response, score);
        set(state => ({ attempts: [...state.attempts, attempt] }));
    },

    completeModule: async (moduleId) => {
        const already = get().days.some(d => d.modules.some(m => m.id === moduleId && m.completedAt));
        if (already) return;
        const completedAt = await markModuleComplete(moduleId);
        set(state => ({
            days: state.days.map(d => ({
                ...d,
                modules: d.modules.map(m => (m.id === moduleId ? { ...m, completedAt } : m)),
            })),
        }));
    },
}));
