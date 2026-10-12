import { describe, it, expect } from 'vitest';
import { computeQuest, dateInZone, addDays, dayKindOf, BgDay, BgProgram } from './quest';

const TZ = 'Australia/Melbourne';
// Monday 5 Oct 2026. Melbourne is on daylight time (UTC+11) from 4 Oct.
const program: BgProgram = { startDate: '2026-10-05', lengthDays: 14, timezone: TZ, freezesPerWeek: 1 };

// 9am Melbourne on `date`, or `lateBy` days after it
const at9am = (date: string, lateBy = 0) => `${addDays(date, lateBy - 1)}T22:00:00Z`;

const day = (date: string, completions: (string | null)[]): BgDay => ({
    id: `day-${date}`,
    date,
    kind: dayKindOf(date),
    source: 'sample',
    modules: completions.map((completedAt, i) => ({
        id: `${date}-m${i}`,
        dayId: `day-${date}`,
        moduleKey: 'think',
        position: i,
        title: `Module ${i}`,
        minutes: 5,
        content: {},
        completedAt,
    })),
});

const fullDay = (date: string) => day(date, [at9am(date), at9am(date)]);
const d = (n: number) => addDays(program.startDate, n - 1); // date of day n

describe('dateInZone', () => {
    it('uses the Melbourne calendar date across the daylight-saving change', () => {
        expect(dateInZone('2026-10-04T13:30:00Z', TZ)).toBe('2026-10-05'); // 00:30 AEDT
        expect(dateInZone('2026-10-04T12:30:00Z', TZ)).toBe('2026-10-04'); // 23:30 AEDT
    });
});

describe('computeQuest', () => {
    it('counts consecutive full days, and an unfinished today does not break the streak', () => {
        const q = computeQuest(program, [fullDay(d(1)), fullDay(d(2)), fullDay(d(3)), day(d(4), [null, null])], d(4));
        expect(q.currentStreak).toBe(3);
        expect(q.cells[3].status).toBe('today');
        expect(q.todayNumber).toBe(4);
    });

    it('counts today once it is full', () => {
        const q = computeQuest(program, [fullDay(d(1)), fullDay(d(2))], d(2));
        expect(q.currentStreak).toBe(2);
        expect(q.cells[1].status).toBe('full');
    });

    it('freezes the first missed day of a week, bridging the streak without adding to it', () => {
        const q = computeQuest(program, [fullDay(d(1)), fullDay(d(3))], d(4));
        expect(q.cells[1].status).toBe('frozen'); // no row at all for day 2
        expect(q.currentStreak).toBe(2);
        expect(q.freezesLeftThisWeek).toBe(0);
    });

    it('breaks the streak on a second miss in the same week', () => {
        const q = computeQuest(program, [fullDay(d(1)), fullDay(d(4))], d(5));
        expect(q.cells[1].status).toBe('frozen');
        expect(q.cells[2].status).toBe('missed');
        expect(q.currentStreak).toBe(1);
        expect(q.bestStreak).toBe(1);
    });

    it('gives a fresh freeze each Monday', () => {
        // Day 7 is Sunday 11 Oct, day 8 is Monday 12 Oct
        const firstSixFull = [1, 2, 3, 4, 5, 6].map(n => fullDay(d(n)));
        const q = computeQuest(program, [...firstSixFull, fullDay(d(9))], d(10));
        expect(q.cells[6].status).toBe('frozen');
        expect(q.cells[7].status).toBe('frozen');
        expect(q.currentStreak).toBe(7);
    });

    it('does not count a day caught up late as full', () => {
        const caughtUp = (date: string) => day(date, [at9am(date, 1), at9am(date, 1)]);
        const q = computeQuest(program, [fullDay(d(1)), caughtUp(d(2)), caughtUp(d(3))], d(4));
        expect(q.cells[1].status).toBe('frozen');
        expect(q.cells[2]).toMatchObject({ status: 'partial', onTime: 0, late: 2 });
        expect(q.currentStreak).toBe(0);
        expect(q.bestStreak).toBe(1);
        expect(q.missed).toHaveLength(0); // all caught up
    });

    it('lists incomplete modules from past days as missed, oldest first', () => {
        const q = computeQuest(program, [day(d(1), [at9am(d(1)), null]), day(d(2), [null])], d(3));
        expect(q.missed.map(m => m.module.id)).toEqual([`${d(1)}-m1`, `${d(2)}-m0`]);
        expect(q.cells[0].status).toBe('frozen');
        expect(q.cells[1].status).toBe('missed');
    });

    it('reports no day number before the program starts', () => {
        const q = computeQuest(program, [], '2026-10-01');
        expect(q.todayNumber).toBeNull();
        expect(q.cells.every(c => c.status === 'upcoming')).toBe(true);
    });
});
