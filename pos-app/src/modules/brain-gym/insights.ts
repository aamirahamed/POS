// Real-data summaries for the Brain Gym progress views. Nothing here is estimated or invented:
// every number comes from stored days, module completions and attempts.

import { BgAttempt } from '@/services/brainGymService';
import { BgDay, ModuleKey, addDays, isDoneOnTime } from './quest';
import { MODULE_META, ModuleMeta } from './moduleMeta';
import { ModuleContent } from './sampleContent';

export interface ModuleTally {
    key: ModuleKey;
    total: number;
    onTime: number;
    late: number;
}

export const tallyByModule = (days: BgDay[], timezone: string, today: string): ModuleTally[] => {
    const tallies = new Map<ModuleKey, ModuleTally>();
    for (const day of days) {
        if (day.date > today) continue;
        for (const m of day.modules) {
            const t = tallies.get(m.moduleKey) ?? { key: m.moduleKey, total: 0, onTime: 0, late: 0 };
            t.total++;
            if (m.completedAt) {
                if (isDoneOnTime(m, day.date, timezone)) t.onTime++;
                else t.late++;
            }
            tallies.set(m.moduleKey, t);
        }
    }
    return [...tallies.values()].sort((a, b) => b.total - a.total);
};

export const doneBySkill = (days: BgDay[], from?: string, to?: string): { skill: ModuleMeta['skill']; done: number }[] => {
    const counts = new Map<ModuleMeta['skill'], number>();
    for (const day of days) {
        if ((from && day.date < from) || (to && day.date > to)) continue;
        for (const m of day.modules) {
            if (!m.completedAt) continue;
            const skill = MODULE_META[m.moduleKey].skill;
            counts.set(skill, (counts.get(skill) ?? 0) + 1);
        }
    }
    return [...counts.entries()].map(([skill, done]) => ({ skill, done })).sort((a, b) => b.done - a.done);
};

// Numbers accuracy uses each module's first checked attempt, so redos don't inflate it
export const numbersAccuracy = (days: BgDay[], attempts: BgAttempt[]): { correctRate: number; sessions: number } | null => {
    const numberModules = new Set(days.flatMap(d => d.modules.filter(m => m.moduleKey === 'numbers').map(m => m.id)));
    const firstByModule = new Map<string, BgAttempt>();
    for (const a of attempts) {
        if (numberModules.has(a.moduleId) && a.score !== null && !firstByModule.has(a.moduleId)) firstByModule.set(a.moduleId, a);
    }
    const scores = [...firstByModule.values()].map(a => a.score as number);
    if (scores.length === 0) return null;
    return { correctRate: scores.reduce((s, x) => s + x, 0) / scores.length, sessions: scores.length };
};

export interface SeriesProgress {
    name: string;
    kind: 'lesson' | 'history';
    part: number;
    total: number;
    done: boolean;
}

export const seriesProgress = (days: BgDay[]): SeriesProgress[] => {
    const latest = new Map<string, SeriesProgress>();
    for (const day of days) {
        for (const m of day.modules) {
            if (m.moduleKey !== 'lesson' && m.moduleKey !== 'history') continue;
            const series = (m.content as unknown as ModuleContent).series;
            if (!series) continue;
            const prev = latest.get(series.name);
            if (!prev || series.part >= prev.part) {
                latest.set(series.name, { name: series.name, kind: m.moduleKey, part: series.part, total: series.total, done: m.completedAt !== null });
            }
        }
    }
    return [...latest.values()];
};

export const weekDates = (today: string): string[] => {
    const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
    const monday = addDays(today, -((dow + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
};
