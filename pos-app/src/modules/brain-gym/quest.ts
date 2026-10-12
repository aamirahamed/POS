// Brain Gym quest rules: day status, streaks, weekly freezes, and missed modules.
// Everything here is derived from stored days and module completion times; nothing is persisted.
//
// Rules (docs/specs/BRAIN_GYM.md, "Gamification"):
// - A day is full when every module was completed on that day (in the program's timezone).
// - The streak counts full days. Today never breaks it while it is still in progress.
// - Each week (Monday to Sunday) the first N non-full past days are frozen automatically:
//   a frozen day neither breaks the streak nor adds to it.
// - Modules can be caught up later, but a late completion does not make the day full.

export type ModuleKey =
    | 'recall' | 'ai_briefing' | 'interview_rep' | 'think' | 'numbers' | 'lesson' | 'history' | 'close'
    | 'mock_interview' | 'weekly_review' | 'teardown';

export type DayKind = 'weekday' | 'saturday' | 'sunday';

export interface BgModule {
    id: string;
    dayId: string;
    moduleKey: ModuleKey;
    position: number;
    title: string;
    minutes: number | null;
    content: Record<string, unknown>;
    completedAt: string | null;
}

export interface BgDay {
    id: string;
    date: string; // YYYY-MM-DD in the program timezone
    kind: DayKind;
    source: 'sample' | 'agent';
    modules: BgModule[];
}

export interface BgProgram {
    startDate: string;
    lengthDays: number;
    timezone: string;
    freezesPerWeek: number;
}

export type DayStatus = 'full' | 'partial' | 'missed' | 'frozen' | 'today' | 'upcoming';

export interface QuestCell {
    date: string;
    dayNumber: number;
    kind: DayKind;
    status: DayStatus;
    total: number;
    onTime: number;
    late: number;
}

export interface MissedModule {
    day: BgDay;
    dayNumber: number;
    module: BgModule;
}

export interface QuestState {
    cells: QuestCell[];
    todayNumber: number | null; // null before the program starts or after it ends
    currentStreak: number;
    bestStreak: number;
    fullDays: number;
    freezesLeftThisWeek: number;
    missed: MissedModule[];
}

// ── Dates (all as YYYY-MM-DD strings, so no timezone maths leaks in) ──────────

export const dateInZone = (instant: Date | string, timeZone: string): string =>
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
        .format(typeof instant === 'string' ? new Date(instant) : instant);

export const addDays = (date: string, n: number): string => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};

const dayOfWeek = (date: string): number => new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday

export const dayKindOf = (date: string): DayKind => {
    const dow = dayOfWeek(date);
    return dow === 6 ? 'saturday' : dow === 0 ? 'sunday' : 'weekday';
};

const weekKey = (date: string): string => addDays(date, -((dayOfWeek(date) + 6) % 7)); // that week's Monday

export const programEndDate = (program: BgProgram): string => addDays(program.startDate, program.lengthDays - 1);

// ── Completion ────────────────────────────────────────────────────────────────

export const isDoneOnTime = (module: BgModule, dayDate: string, timeZone: string): boolean =>
    module.completedAt !== null && dateInZone(module.completedAt, timeZone) <= dayDate;

const countCompletion = (day: BgDay | undefined, timeZone: string) => {
    if (!day) return { total: 0, onTime: 0, late: 0 };
    let onTime = 0;
    let late = 0;
    for (const m of day.modules) {
        if (m.completedAt === null) continue;
        if (isDoneOnTime(m, day.date, timeZone)) onTime++;
        else late++;
    }
    return { total: day.modules.length, onTime, late };
};

// ── The quest ─────────────────────────────────────────────────────────────────

export const computeQuest = (program: BgProgram, days: BgDay[], today: string): QuestState => {
    const byDate = new Map(days.map(d => [d.date, d]));
    const freezesUsed = new Map<string, number>();
    const cells: QuestCell[] = [];

    for (let i = 0; i < program.lengthDays; i++) {
        const date = addDays(program.startDate, i);
        const day = byDate.get(date);
        const { total, onTime, late } = countCompletion(day, program.timezone);
        const full = total > 0 && onTime === total;

        let status: DayStatus;
        if (date > today) {
            status = 'upcoming';
        } else if (full) {
            status = 'full';
        } else if (date === today) {
            status = 'today';
        } else {
            const week = weekKey(date);
            const used = freezesUsed.get(week) ?? 0;
            if (used < program.freezesPerWeek) {
                freezesUsed.set(week, used + 1);
                status = 'frozen';
            } else {
                status = onTime + late > 0 ? 'partial' : 'missed';
            }
        }
        cells.push({ date, dayNumber: i + 1, kind: dayKindOf(date), status, total, onTime, late });
    }

    // Streaks: full days count, frozen days are skipped, anything else past breaks the run
    let bestStreak = 0;
    let run = 0;
    for (const c of cells) {
        if (c.status === 'full') bestStreak = Math.max(bestStreak, ++run);
        else if (c.status === 'partial' || c.status === 'missed') run = 0;
    }
    let currentStreak = 0;
    for (let i = cells.length - 1; i >= 0; i--) {
        const s = cells[i].status;
        if (s === 'upcoming' || s === 'today' || s === 'frozen') continue;
        if (s === 'full') currentStreak++;
        else break;
    }

    const missed: MissedModule[] = [];
    for (const c of cells) {
        if (c.date >= today) break;
        const day = byDate.get(c.date);
        if (!day) continue;
        for (const m of [...day.modules].sort((a, b) => a.position - b.position)) {
            if (m.completedAt === null) missed.push({ day, dayNumber: c.dayNumber, module: m });
        }
    }

    const inProgram = today >= program.startDate && today <= programEndDate(program);
    const todayNumber = inProgram ? cells.findIndex(c => c.date === today) + 1 : null;
    const usedThisWeek = cells.filter(c => c.status === 'frozen' && weekKey(c.date) === weekKey(today)).length;

    return {
        cells,
        todayNumber,
        currentStreak,
        bestStreak,
        fullDays: cells.filter(c => c.status === 'full').length,
        freezesLeftThisWeek: Math.max(0, program.freezesPerWeek - usedThisWeek),
        missed,
    };
};
