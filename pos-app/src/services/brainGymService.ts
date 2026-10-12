import { supabase } from '@/lib/supabase';
import { BgDay, BgModule, BgProgram, DayKind } from '@/modules/brain-gym/quest';
import { ModuleTemplate } from '@/modules/brain-gym/sampleContent';
import { HelperMode } from '@/modules/brain-gym/helperModes';

export interface BgAttempt {
    id: string;
    moduleId: string;
    response: Record<string, unknown>;
    score: number | null;
    feedback: Record<string, unknown> | null;
    createdAt: string;
}

interface ModuleRow {
    id: string;
    day_id: string;
    module_key: BgModule['moduleKey'];
    position: number;
    title: string;
    minutes: number | null;
    content: Record<string, unknown> | null;
    completed_at: string | null;
}

interface DayRow {
    id: string;
    day_date: string;
    day_kind: DayKind;
    source: BgDay['source'];
    bg_modules: ModuleRow[] | null;
}

interface AttemptRow {
    id: string;
    module_id: string;
    response: Record<string, unknown>;
    score: number | string | null;
    feedback: Record<string, unknown> | null;
    created_at: string;
}

const toModule = (row: ModuleRow): BgModule => ({
    id: row.id,
    dayId: row.day_id,
    moduleKey: row.module_key,
    position: row.position,
    title: row.title,
    minutes: row.minutes,
    content: row.content ?? {},
    completedAt: row.completed_at,
});

const toDay = (row: DayRow): BgDay => ({
    id: row.id,
    date: row.day_date,
    kind: row.day_kind,
    source: row.source,
    modules: (row.bg_modules ?? []).map(toModule).sort((a, b) => a.position - b.position),
});

const toAttempt = (row: AttemptRow): BgAttempt => ({
    id: row.id,
    moduleId: row.module_id,
    response: row.response,
    score: row.score === null ? null : Number(row.score),
    feedback: row.feedback,
    createdAt: row.created_at,
});

export const fetchProgram = async (userId: string): Promise<BgProgram | null> => {
    const { data, error } = await supabase.from('bg_programs').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw new Error(`Failed to load Brain Gym program: ${error.message}`);
    if (!data) return null;
    return {
        startDate: data.start_date,
        lengthDays: data.length_days,
        timezone: data.timezone,
        freezesPerWeek: data.freezes_per_week,
    };
};

export const createProgram = async (userId: string, startDate: string): Promise<void> => {
    const { error } = await supabase.from('bg_programs').insert({ user_id: userId, start_date: startDate });
    if (error) throw new Error(`Failed to start the program: ${error.message}`);
};

// Removes the program and every day, module and attempt under it (used to restart after testing)
export const deleteProgram = async (userId: string): Promise<void> => {
    const { error: daysError } = await supabase.from('bg_days').delete().eq('user_id', userId);
    if (daysError) throw new Error(`Failed to clear days: ${daysError.message}`);
    const { error } = await supabase.from('bg_programs').delete().eq('user_id', userId);
    if (error) throw new Error(`Failed to delete program: ${error.message}`);
};

export const fetchDays = async (userId: string): Promise<BgDay[]> => {
    const { data, error } = await supabase
        .from('bg_days')
        .select('*, bg_modules(*)')
        .eq('user_id', userId)
        .order('day_date', { ascending: true });
    if (error) throw new Error(`Failed to load Brain Gym days: ${error.message}`);
    return (data ?? []).map(toDay);
};

export const createDay = async (userId: string, date: string, kind: DayKind, templates: ModuleTemplate[]): Promise<void> => {
    const { data: day, error } = await supabase
        .from('bg_days')
        .insert({ user_id: userId, day_date: date, day_kind: kind, source: 'sample' })
        .select('id')
        .single();
    if (error) {
        if (error.code === '23505') return; // another tab created it first
        throw new Error(`Failed to create today's session: ${error.message}`);
    }
    const rows = templates.map((t, i) => ({
        day_id: day.id,
        user_id: userId,
        module_key: t.moduleKey,
        position: i,
        title: t.title,
        minutes: t.minutes,
        content: t.content,
    }));
    const { error: modulesError } = await supabase.from('bg_modules').insert(rows);
    if (modulesError) throw new Error(`Failed to create today's modules: ${modulesError.message}`);
};

export const fetchAttempts = async (userId: string): Promise<BgAttempt[]> => {
    const { data, error } = await supabase
        .from('bg_attempts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
    if (error) throw new Error(`Failed to load answers: ${error.message}`);
    return (data ?? []).map(toAttempt);
};

export const insertAttempt = async (
    userId: string,
    moduleId: string,
    response: Record<string, unknown>,
    score: number | null,
): Promise<BgAttempt> => {
    const { data, error } = await supabase
        .from('bg_attempts')
        .insert({ user_id: userId, module_id: moduleId, response, score })
        .select('*')
        .single();
    if (error) throw new Error(`Failed to save your answer: ${error.message}`);
    return toAttempt(data);
};

export const markModuleComplete = async (moduleId: string): Promise<string> => {
    const completedAt = new Date().toISOString();
    const { error } = await supabase
        .from('bg_modules')
        .update({ completed_at: completedAt })
        .eq('id', moduleId)
        .is('completed_at', null); // the first completion time is what counts for on-time
    if (error) throw new Error(`Failed to mark the module done: ${error.message}`);
    return completedAt;
};

// ── Thinking Coach ────────────────────────────────────────────────────────────

export type CoachMove =
    | 'question' | 'pointer' | 'method' | 'example' | 'feedback' | 'concept' | 'decline'
    | 'explain' | 'deeper' | 'connect' | 'further_reading' | 'check_understanding' | 'mirror';

export interface CoachMessage {
    id: string;
    role: 'user' | 'coach';
    text: string;
    move: CoachMove | null;
    level: number | null;
    mode: HelperMode | null;
    createdAt: string;
}

interface CoachMessageRow {
    id: string;
    role: 'user' | 'coach';
    text: string;
    move: CoachMove | null;
    level: number | null;
    mode: HelperMode | null;
    created_at: string;
}

export const fetchCoachMessages = async (moduleId: string): Promise<CoachMessage[]> => {
    const { data, error } = await supabase
        .from('bg_coach_messages')
        .select('id, role, text, move, level, mode, created_at')
        .eq('module_id', moduleId)
        .order('created_at', { ascending: true });
    if (error) throw new Error(`Failed to load the coach conversation: ${error.message}`);
    return (data as CoachMessageRow[] ?? []).map(r => ({
        id: r.id, role: r.role, text: r.text, move: r.move, level: r.level, mode: r.mode, createdAt: r.created_at,
    }));
};

export const askCoach = async (
    moduleId: string,
    message: string,
    draft: string,
): Promise<{ reply: string; move: CoachMove | null; level: number | null; mode: HelperMode }> => {
    const { data, error } = await supabase.functions.invoke('bg-coach', { body: { moduleId, message, draft } });
    if (error) {
        // Surface the function's own error message (e.g. "not configured yet") rather than a generic HTTP error
        const context = (error as { context?: Response }).context;
        const body = context && typeof context.json === 'function' ? await context.json().catch(() => null) : null;
        throw new Error(body?.error ?? error.message);
    }
    return data;
};
