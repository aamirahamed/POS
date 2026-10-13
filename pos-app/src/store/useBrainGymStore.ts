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
    requestSessionBuild,
    gradeAttempt,
    GRADED_MODULES,
} from '@/services/brainGymService';

export const DEFAULT_TIMEZONE = 'Australia/Melbourne';

interface BrainGymState {
    program: BgProgram | null;
    days: BgDay[];
    attempts: BgAttempt[];
    loaded: boolean;
    loading: boolean;
    error: string | null;
    building: boolean; // the Session Builder is writing today's session
    buildNotice: string | null; // shown when the builder failed and sample content was used
    grading: Record<string, boolean>; // attemptId -> being graded
    gradeErrors: Record<string, string>; // attemptId -> error

    load: () => Promise<void>;
    startProgram: (startDate: string) => Promise<void>;
    restartProgram: () => Promise<void>;
    rebuildToday: () => Promise<void>;
    submitAnswer: (moduleId: string, response: Record<string, unknown>, score: number | null) => Promise<void>;
    gradeLatest: (attemptId: string) => Promise<void>;
    completeModule: (moduleId: string) => Promise<void>;
}

const requireUserId = async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');
    return user.id;
};

// Polls until the day exists (and, for a rebuild, has a new id). The builder takes about 1-2 minutes.
const waitForDay = async (userId: string, date: string, previousId: string | null, timeoutMs = 240_000) => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        await new Promise(r => setTimeout(r, 5_000));
        const days = await fetchDays(userId);
        const day = days.find(d => d.date === date);
        if (day && day.id !== previousId && day.modules.length > 0) return days;
    }
    throw new Error('Timed out waiting for the session');
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
    building: false,
    buildNotice: null,
    grading: {},
    gradeErrors: {},

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
            const attempts = await fetchAttempts(userId);
            set({ program, days, attempts, loaded: true, loading: false });

            if (running && !days.some(d => d.date === today)) {
                // Normally built overnight; if not, build it now. Sample content is the last resort.
                set({ building: true, buildNotice: null });
                try {
                    await requestSessionBuild('today');
                    days = await waitForDay(userId, today, null);
                } catch (e) {
                    console.error('Session build failed, using sample content:', e);
                    const kind = dayKindOf(today);
                    await createDay(userId, today, kind, templatesFor(kind));
                    days = await fetchDays(userId);
                    set({ buildNotice: "The agents couldn't build today's session, so this is sample content. Try Rebuild later." });
                }
                set({ days, building: false });
            }
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

    rebuildToday: async () => {
        const userId = await requireUserId();
        const today = todayFor(get().program);
        const previousId = get().days.find(d => d.date === today)?.id ?? null;
        set({ building: true, buildNotice: null });
        try {
            await requestSessionBuild('today', true);
            set({ days: await waitForDay(userId, today, previousId) });
        } catch (e) {
            set({ buildNotice: e instanceof Error ? `Rebuild failed: ${e.message}` : 'Rebuild failed' });
        } finally {
            set({ building: false });
        }
    },

    submitAnswer: async (moduleId, response, score) => {
        const userId = await requireUserId();
        const attempt = await insertAttempt(userId, moduleId, response, score);
        set(state => ({ attempts: [...state.attempts, attempt] }));
        const module = get().days.flatMap(d => d.modules).find(m => m.id === moduleId);
        if (module && GRADED_MODULES.has(module.moduleKey)) void get().gradeLatest(attempt.id);
    },

    gradeLatest: async (attemptId) => {
        set(state => ({ grading: { ...state.grading, [attemptId]: true } }));
        try {
            const { feedback } = await gradeAttempt(attemptId);
            set(state => ({ attempts: state.attempts.map(a => (a.id === attemptId ? { ...a, feedback, score: Number(feedback.score) / 10 } : a)) }));
        } catch (e) {
            set(state => ({ gradeErrors: { ...state.gradeErrors, [attemptId]: e instanceof Error ? e.message : 'Grading failed' } }));
        } finally {
            set(state => ({ grading: { ...state.grading, [attemptId]: false } }));
        }
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
