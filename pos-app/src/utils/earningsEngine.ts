// ─── YD Earnings Engine ────────────────────────────────────────────────────────
// Lightweight earnings estimation for YD RETAIL SALES ASSISTANT shifts.
// NOT payroll software. Estimates only.

// ── Pay Rates (AUD, incl. casual loading) ──────────────────────────────────────
export const RATES = {
    WEEKDAY:            34.4875,  // Mon–Thu all day · Fri before 6 PM
    FRIDAY_EVE_SAT:     41.385,   // Fri from 6 PM · Saturday all day
    SUNDAY:             48.2825,  // Sunday all day
    PUBLIC_HOLIDAY:     68.975,   // Public holidays
} as const;

// ── Tax / Net Estimation ────────────────────────────────────────────────────────
export const TAX_RATE = 0.1367;   // Average PAYG based on recent payslips
export const NET_RATE  = 1 - TAX_RATE; // 0.8633

// ── Break Deduction ─────────────────────────────────────────────────────────────
export const getPaidHrs = (scheduledHrs: number): number => {
    if (scheduledHrs <= 5) return scheduledHrs;
    if (scheduledHrs < 8)  return scheduledHrs - 0.5;
    return scheduledHrs - 1.0;
};

// ── Rate Resolution ─────────────────────────────────────────────────────────────
const SIX_PM_MINS = 18 * 60;

const getRateAt = (date: Date): number => {
    const day  = date.getDay(); // 0=Sun 1=Mon … 5=Fri 6=Sat
    const mins = date.getHours() * 60 + date.getMinutes();
    if (day === 0) return RATES.SUNDAY;
    if (day === 6) return RATES.FRIDAY_EVE_SAT;
    if (day === 5) return mins >= SIX_PM_MINS ? RATES.FRIDAY_EVE_SAT : RATES.WEEKDAY;
    return RATES.WEEKDAY;
};

const getRateLabel = (rate: number, day: number): string => {
    if (rate === RATES.SUNDAY)         return 'Sunday';
    if (rate === RATES.PUBLIC_HOLIDAY) return 'Public Holiday';
    if (rate === RATES.FRIDAY_EVE_SAT) return day === 6 ? 'Saturday' : 'Fri Evening';
    return 'Weekday';
};

// ── Types ───────────────────────────────────────────────────────────────────────
export interface EarningSegment {
    label:   string;
    rate:    number;
    hours:   number;
    gross:   number;
}

export interface ShiftEarnings {
    scheduledHrs: number;
    paidHrs:      number;
    gross:        number;
    tax:          number;
    net:          number;
    segments:     EarningSegment[];
}

export interface WeeklyEarnings {
    paidHrs: number;
    gross:   number;
    tax:     number;
    net:     number;
}

// ── Single-shift earnings ───────────────────────────────────────────────────────
// Splits the paid window across rate boundaries (Friday 6 PM).
// Break time is deducted from the END of the shift before splitting.
export const calcShiftEarnings = (startIso: string, endIso: string): ShiftEarnings => {
    const start = new Date(startIso);
    const end   = new Date(endIso);

    const scheduledHrs = (end.getTime() - start.getTime()) / 3_600_000;
    const paidHrs      = getPaidHrs(scheduledHrs);
    const breakMs      = (scheduledHrs - paidHrs) * 3_600_000;
    const paidEnd      = new Date(end.getTime() - breakMs); // break deducted from end

    // Find intra-shift rate boundaries (only Fri 6 PM matters in V1)
    const boundaries: Date[] = [new Date(start)];
    const day = start.getDay();
    if (day === 5) {
        const sixPm = new Date(start);
        sixPm.setHours(18, 0, 0, 0);
        if (sixPm > start && sixPm < paidEnd) boundaries.push(sixPm);
    }
    boundaries.push(paidEnd);

    const segments: EarningSegment[] = [];
    for (let i = 0; i < boundaries.length - 1; i++) {
        const segStart = boundaries[i];
        const segEnd   = boundaries[i + 1];
        const hours    = (segEnd.getTime() - segStart.getTime()) / 3_600_000;
        const rate     = getRateAt(segStart);
        segments.push({ label: getRateLabel(rate, day), rate, hours, gross: hours * rate });
    }

    const gross = segments.reduce((s, seg) => s + seg.gross, 0);
    return { scheduledHrs, paidHrs, gross, tax: gross * TAX_RATE, net: gross * NET_RATE, segments };
};

// ── Weekly totals ───────────────────────────────────────────────────────────────
export const calcWeeklyEarnings = (
    shifts: { startTime: string; endTime: string; status?: string }[]
): WeeklyEarnings => {
    const active  = shifts.filter(s => s.status !== 'removed');
    const results = active.map(s => calcShiftEarnings(s.startTime, s.endTime));
    const gross   = results.reduce((sum, r) => sum + r.gross, 0);
    return {
        paidHrs: results.reduce((sum, r) => sum + r.paidHrs, 0),
        gross,
        tax:  gross * TAX_RATE,
        net:  gross * NET_RATE,
    };
};

// ── Roster change earnings delta (net take-home) ────────────────────────────────
export const calcEarningsDelta = (
    shifts: {
        startTime: string; endTime: string;
        status?: string;
        previousStartTime?: string; previousEndTime?: string;
    }[]
): number => {
    let delta = 0;
    for (const s of shifts) {
        if (s.status === 'added') {
            delta += calcShiftEarnings(s.startTime, s.endTime).net;
        } else if (s.status === 'removed') {
            delta -= calcShiftEarnings(s.startTime, s.endTime).net;
        } else if (s.status === 'modified' && s.previousStartTime && s.previousEndTime) {
            delta += calcShiftEarnings(s.startTime, s.endTime).net
                   - calcShiftEarnings(s.previousStartTime, s.previousEndTime).net;
        }
    }
    return delta;
};

// ── Helpers ─────────────────────────────────────────────────────────────────────
export const fmt$ = (n: number) =>
    n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
