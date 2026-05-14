import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import {
    saveCalendarEvents,
    fetchCalendarEvents,
    saveYDShifts,
    fetchYDShifts,
    saveSyncMeta,
    fetchSyncMeta,
} from '@/services/calendarService';

export interface CalendarEvent {
    id: string;
    title: string;
    startTime: string; // ISO string
    endTime: string;   // ISO string
    durationHrs: number;
    source: string;
}

export interface YDShiftSnapshot {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    durationHrs: number; // Scheduled duration
    paidHrs: number;     // Actual paid duration after breaks
    status: 'unchanged' | 'added' | 'removed' | 'modified';
    previousStartTime?: string;
    previousEndTime?: string;
    previousDurationHrs?: number;
    previousPaidHrs?: number;
}

interface CalendarState {
    accessToken: string | null;
    tokenExpiry: number | null;
    events: CalendarEvent[];
    ydShifts: YDShiftSnapshot[];
    loading: boolean;
    error: string | null;
    lastFetched: number | null;
    setToken: (token: string, expiresIn: number) => void;
    clearToken: () => void;
    fetchEvents: () => Promise<void>;
    loadFromDB: () => Promise<void>;
}

// ─── Paid Hours Calculation ────────────────────────────────────────────────────
const getPaidHrs = (scheduledHrs: number): number => {
    if (scheduledHrs <= 5) return scheduledHrs;
    if (scheduledHrs < 8) return scheduledHrs - 0.5;
    return scheduledHrs - 1.0;
};

// ─── Store ─────────────────────────────────────────────────────────────────────
export const useCalendarStore = create<CalendarState>()((set, get) => ({
    accessToken: null,
    tokenExpiry: null,
    events: [],
    ydShifts: [],
    loading: false,
    error: null,
    lastFetched: null,

    setToken: (token, expiresIn) => {
        // Also persist token to localStorage so it survives a page refresh
        localStorage.setItem('pos-calendar-token', JSON.stringify({ token, expiry: Date.now() + expiresIn * 1000 }));
        set({ accessToken: token, tokenExpiry: Date.now() + expiresIn * 1000 });
    },

    clearToken: () => {
        localStorage.removeItem('pos-calendar-token');
        set({ accessToken: null, tokenExpiry: null, events: [], ydShifts: [] });
    },

    /** Load persisted snapshot from Supabase on app start (no Google token needed) */
    loadFromDB: async () => {
        // Restore token from localStorage if still valid
        try {
            const raw = localStorage.getItem('pos-calendar-token');
            if (raw) {
                const { token, expiry } = JSON.parse(raw);
                if (Date.now() < expiry) {
                    set({ accessToken: token, tokenExpiry: expiry });
                } else {
                    localStorage.removeItem('pos-calendar-token');
                }
            }
        } catch (_) { /* ignore */ }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [events, shifts, lastFetched] = await Promise.all([
            fetchCalendarEvents(user.id),
            fetchYDShifts(user.id),
            fetchSyncMeta(user.id),
        ]);

        set({
            events: events ?? [],
            ydShifts: shifts ?? [],
            lastFetched: lastFetched ?? null,
        });
    },

    fetchEvents: async () => {
        const { accessToken, tokenExpiry, ydShifts } = get();
        if (!accessToken || (tokenExpiry && Date.now() > tokenExpiry)) {
            set({ error: 'Not authenticated or token expired', accessToken: null });
            localStorage.removeItem('pos-calendar-token');
            return;
        }

        set({ loading: true, error: null });
        try {
            const now = new Date();

            // Start of current week (Monday)
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(now);
            monday.setDate(diff);
            monday.setHours(0, 0, 0, 0);

            // Go back 2 weeks to capture historical shifts for the trend chart
            const fetchFrom = new Date(monday);
            fetchFrom.setDate(monday.getDate() - 14);
            fetchFrom.setHours(0, 0, 0, 0);

            // End of 4th week from now (28 days)
            const endRange = new Date(monday);
            endRange.setDate(monday.getDate() + 27);
            endRange.setHours(23, 59, 59, 999);

            const timeMin = fetchFrom.toISOString();
            const timeMax = endRange.toISOString();

            const response = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (!response.ok) {
                if (response.status === 401) {
                    set({ accessToken: null, error: 'Token expired', loading: false });
                    localStorage.removeItem('pos-calendar-token');
                    return;
                }
                throw new Error(`Calendar API Error: ${response.statusText}`);
            }

            const data = await response.json();

            const parsedEvents: CalendarEvent[] = (data.items || []).map((item: any) => {
                const start = item.start.dateTime || item.start.date;
                const end = item.end.dateTime || item.end.date;
                const startTime = new Date(start).getTime();
                const endTime = new Date(end).getTime();
                const durationHrs = (endTime - startTime) / (1000 * 60 * 60);

                return {
                    id: item.id,
                    title: item.summary || 'Untitled Event',
                    startTime: start,
                    endTime: end,
                    durationHrs,
                    source: 'Google Calendar',
                };
            });

            // ── Snapshot Logic for YD Retail ──────────────────────────────────
            const newYDEvents = parsedEvents.filter(e => e.title.includes('RETAIL SALES ASSISTANT'));
            const newSnapshot: YDShiftSnapshot[] = [];

            newYDEvents.forEach(newShift => {
                const existing = ydShifts.find(s => s.id === newShift.id);
                const paidHrs = getPaidHrs(newShift.durationHrs);

                if (!existing) {
                    newSnapshot.push({ ...newShift, paidHrs, status: 'added' });
                } else if (existing.startTime !== newShift.startTime || existing.endTime !== newShift.endTime) {
                    newSnapshot.push({
                        ...newShift,
                        paidHrs,
                        status: 'modified',
                        previousStartTime: existing.startTime,
                        previousEndTime: existing.endTime,
                        previousDurationHrs: existing.durationHrs,
                        previousPaidHrs: existing.paidHrs,
                    });
                } else {
                    newSnapshot.push({ ...newShift, paidHrs, status: 'unchanged' });
                }
            });

            // Mark removed shifts (within the fetch window)
            ydShifts.forEach(oldShift => {
                const oldTime = new Date(oldShift.startTime).getTime();
                if (oldTime >= fetchFrom.getTime() && oldTime <= endRange.getTime()) {
                    if (!newYDEvents.some(n => n.id === oldShift.id)) {
                        newSnapshot.push({
                            ...oldShift,
                            status: 'removed',
                        });
                    }
                }
            });

            // Carry forward any shifts OLDER than the fetch window so historical
            // trend data is never lost across refreshes
            ydShifts.forEach(oldShift => {
                const oldTime = new Date(oldShift.startTime).getTime();
                if (oldTime < fetchFrom.getTime()) {
                    // Only keep if not already added (avoid duplicates)
                    if (!newSnapshot.some(s => s.id === oldShift.id)) {
                        newSnapshot.push(oldShift);
                    }
                }
            });

            const lastFetched = Date.now();

            // ── Persist to Supabase ────────────────────────────────────────────
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await Promise.all([
                    saveCalendarEvents(user.id, parsedEvents),
                    saveYDShifts(user.id, newSnapshot),
                    saveSyncMeta(user.id, lastFetched),
                ]);
            }

            set({ events: parsedEvents, ydShifts: newSnapshot, loading: false, lastFetched });

        } catch (error: any) {
            console.error('Failed to fetch events:', error);
            set({ error: error.message, loading: false });
        }
    },
}));
