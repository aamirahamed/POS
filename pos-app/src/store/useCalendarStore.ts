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
    isCalendarConnected: boolean;
    events: CalendarEvent[];
    ydShifts: YDShiftSnapshot[];
    loading: boolean;
    error: string | null;
    lastFetched: number | null;
    setToken: (token: string, expiresIn: number) => void;
    clearToken: () => void;
    fetchEvents: () => Promise<void>;
    loadFromDB: () => Promise<void>;
    getOrRefreshToken: () => Promise<string | null>;
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
    isCalendarConnected: false,
    events: [],
    ydShifts: [],
    loading: false,
    error: null,
    lastFetched: null,

    setToken: (token, expiresIn) => {
        set({ accessToken: token, tokenExpiry: Date.now() + expiresIn * 1000 });
    },

    clearToken: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('user_google_tokens').delete().eq('user_id', user.id);
        }
        set({ accessToken: null, tokenExpiry: null, events: [], ydShifts: [], isCalendarConnected: false });
    },

    getOrRefreshToken: async (): Promise<string | null> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        try {
            // Query DB for current token
            const { data: tokenRes, error } = await supabase
                .from('user_google_tokens')
                .select('access_token, expires_at, refresh_token')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error || !tokenRes) {
                set({ isCalendarConnected: false, accessToken: null, tokenExpiry: null });
                return null;
            }

            const expiresAt = new Date(tokenRes.expires_at).getTime();
            const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;

            // If token is still valid, return it
            if (expiresAt > fiveMinutesFromNow && tokenRes.access_token) {
                set({
                    accessToken: tokenRes.access_token,
                    tokenExpiry: expiresAt,
                    isCalendarConnected: true
                });
                return tokenRes.access_token;
            }

            // Otherwise, invoke Edge Function to refresh
            const { data, error: fnError } = await supabase.functions.invoke('refresh-google-token');
            if (fnError || !data?.access_token) {
                console.error('Failed to invoke refresh-google-token edge function:', fnError);
                set({ isCalendarConnected: false, accessToken: null, tokenExpiry: null });
                return null;
            }

            const newExpiry = new Date(data.expires_at).getTime();
            set({
                accessToken: data.access_token,
                tokenExpiry: newExpiry,
                isCalendarConnected: true
            });
            return data.access_token;
        } catch (err) {
            console.error('Error in getOrRefreshToken:', err);
            return null;
        }
    },

    /** Load persisted snapshot from Supabase on app start (no Google token needed) */
    loadFromDB: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Restore token/connection metadata from Supabase
        const [events, shifts, lastFetched, tokenRes] = await Promise.all([
            fetchCalendarEvents(user.id),
            fetchYDShifts(user.id),
            fetchSyncMeta(user.id),
            supabase.from('user_google_tokens').select('expires_at, access_token').eq('user_id', user.id).maybeSingle()
        ]);

        const hasToken = !!tokenRes.data;
        const accessToken = tokenRes.data?.access_token || null;
        const tokenExpiry = tokenRes.data ? new Date(tokenRes.data.expires_at).getTime() : null;

        set({
            events: events ?? [],
            ydShifts: shifts ?? [],
            lastFetched: lastFetched ?? null,
            accessToken,
            tokenExpiry,
            isCalendarConnected: hasToken
        });
    },

    fetchEvents: async () => {
        set({ loading: true, error: null });
        try {
            const accessToken = await get().getOrRefreshToken();
            if (!accessToken) {
                set({ error: 'Google Calendar not connected. Please connect your calendar.', loading: false });
                return;
            }

            const { ydShifts } = get();

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
                    set({ accessToken: null, isCalendarConnected: false, error: 'Calendar connection expired. Please reconnect.', loading: false });
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

            // ── Snapshot Logic for YD Retail (Date-Based Lookup) ──────────────
            const newYDEvents = parsedEvents.filter(e => e.title.includes('RETAIL SALES ASSISTANT'));
            const newSnapshot: YDShiftSnapshot[] = [];

            const getLocalDateKey = (isoStr: string) => {
                const d = new Date(isoStr);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            // Map new events by dateKey
            const newEventsByDate: Record<string, CalendarEvent> = {};
            newYDEvents.forEach(event => {
                const dateKey = getLocalDateKey(event.startTime);
                newEventsByDate[dateKey] = event;
            });

            // Map previous active shifts by dateKey
            const prevActiveShiftsByDate: Record<string, YDShiftSnapshot> = {};
            ydShifts.forEach(shift => {
                if (shift.status !== 'removed') {
                    const dateKey = getLocalDateKey(shift.startTime);
                    prevActiveShiftsByDate[dateKey] = shift;
                }
            });

            // Map previous removed shifts by dateKey
            const prevRemovedShiftsByDate: Record<string, YDShiftSnapshot> = {};
            ydShifts.forEach(shift => {
                if (shift.status === 'removed') {
                    const dateKey = getLocalDateKey(shift.startTime);
                    prevRemovedShiftsByDate[dateKey] = shift;
                }
            });

            // Determine all unique date keys within the fetch window
            const datesToProcess = new Set<string>();
            Object.keys(newEventsByDate).forEach(d => datesToProcess.add(d));
            
            ydShifts.forEach(shift => {
                const shiftTime = new Date(shift.startTime).getTime();
                if (shiftTime >= fetchFrom.getTime() && shiftTime <= endRange.getTime()) {
                    const dateKey = getLocalDateKey(shift.startTime);
                    datesToProcess.add(dateKey);
                }
            });

            // Process each date key
            const nowTime = Date.now();
            datesToProcess.forEach(dateKey => {
                const newEvent = newEventsByDate[dateKey];
                const prevActive = prevActiveShiftsByDate[dateKey];
                const prevRemoved = prevRemovedShiftsByDate[dateKey];
                const prevAny = prevActive || prevRemoved;

                if (newEvent) {
                    const paidHrs = getPaidHrs(newEvent.durationHrs);
                    const isPast = new Date(newEvent.endTime).getTime() < nowTime;

                    if (isPast) {
                        // Past shift: always unchanged
                        newSnapshot.push({
                            id: dateKey,
                            title: newEvent.title,
                            startTime: newEvent.startTime,
                            endTime: newEvent.endTime,
                            durationHrs: newEvent.durationHrs,
                            paidHrs,
                            status: 'unchanged'
                        });
                    } else if (prevAny) {
                        // Compare start and end times in absolute epoch milliseconds to ignore timezone format differences
                        const timesMatch = new Date(prevAny.startTime).getTime() === new Date(newEvent.startTime).getTime() &&
                                           new Date(prevAny.endTime).getTime() === new Date(newEvent.endTime).getTime();
                        if (timesMatch) {
                            newSnapshot.push({
                                id: dateKey,
                                title: newEvent.title,
                                startTime: newEvent.startTime,
                                endTime: newEvent.endTime,
                                durationHrs: newEvent.durationHrs,
                                paidHrs,
                                status: 'unchanged'
                            });
                        } else {
                            // Modified
                            newSnapshot.push({
                                id: dateKey,
                                title: newEvent.title,
                                startTime: newEvent.startTime,
                                endTime: newEvent.endTime,
                                durationHrs: newEvent.durationHrs,
                                paidHrs,
                                status: 'modified',
                                previousStartTime: prevAny.startTime,
                                previousEndTime: prevAny.endTime,
                                previousDurationHrs: prevAny.durationHrs,
                                previousPaidHrs: prevAny.paidHrs
                            });
                        }
                    } else {
                        // Added
                        newSnapshot.push({
                            id: dateKey,
                            title: newEvent.title,
                            startTime: newEvent.startTime,
                            endTime: newEvent.endTime,
                            durationHrs: newEvent.durationHrs,
                            paidHrs,
                            status: 'added'
                        });
                    }
                } else {
                    // No new shift on this date
                    if (prevActive) {
                        const isPast = new Date(prevActive.endTime).getTime() < nowTime;
                        if (isPast) {
                            // Past shift: always unchanged
                            newSnapshot.push({
                                ...prevActive,
                                id: dateKey,
                                status: 'unchanged'
                            });
                        } else {
                            // Was active, now removed
                            newSnapshot.push({
                                id: dateKey,
                                title: prevActive.title,
                                startTime: prevActive.startTime,
                                endTime: prevActive.endTime,
                                durationHrs: prevActive.durationHrs,
                                paidHrs: prevActive.paidHrs,
                                status: 'removed'
                            });
                        }
                    } else if (prevRemoved) {
                        const isPast = new Date(prevRemoved.endTime).getTime() < nowTime;
                        if (isPast) {
                            // Past shift: always unchanged
                            newSnapshot.push({
                                ...prevRemoved,
                                id: dateKey,
                                status: 'unchanged'
                            });
                        } else {
                            // Was already removed, carry it forward
                            newSnapshot.push({
                                ...prevRemoved,
                                id: dateKey,
                                status: 'removed'
                            });
                        }
                    }
                }
            });

            // Carry forward historical shifts outside the fetch window, normalizing their ID
            ydShifts.forEach(oldShift => {
                const oldTime = new Date(oldShift.startTime).getTime();
                if (oldTime < fetchFrom.getTime()) {
                    const dateKey = getLocalDateKey(oldShift.startTime);
                    if (!newSnapshot.some(s => s.id === dateKey)) {
                        newSnapshot.push({
                            ...oldShift,
                            id: dateKey
                        });
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
