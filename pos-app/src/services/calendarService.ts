import { supabase } from '@/lib/supabase';
import { CalendarEvent, YDShiftSnapshot } from '@/store/useCalendarStore';

// ─── Calendar Events ───────────────────────────────────────────────────────────

export const saveCalendarEvents = async (userId: string, events: CalendarEvent[]): Promise<boolean> => {
    // Delete all existing events for this user then re-insert (simpler than upsert for bulk)
    const { error: deleteError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('user_id', userId);

    if (deleteError) {
        console.error('Failed to clear calendar events:', deleteError);
        return false;
    }

    if (events.length === 0) return true;

    const rows = events.map(e => ({
        id: e.id,
        user_id: userId,
        title: e.title,
        start_time: e.startTime,
        end_time: e.endTime,
        duration_hrs: e.durationHrs,
        source: e.source,
    }));

    const { error } = await supabase.from('calendar_events').insert(rows);
    if (error) {
        console.error('Failed to save calendar events:', error);
        return false;
    }
    return true;
};

export const fetchCalendarEvents = async (userId: string): Promise<CalendarEvent[] | null> => {
    const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: true });

    if (error) {
        console.error('Failed to fetch calendar events:', error);
        return null;
    }

    return (data || []).map(row => ({
        id: row.id,
        title: row.title,
        startTime: row.start_time,
        endTime: row.end_time,
        durationHrs: row.duration_hrs,
        source: row.source,
    }));
};

// ─── YD Shift Snapshots ────────────────────────────────────────────────────────

export const saveYDShifts = async (userId: string, shifts: YDShiftSnapshot[]): Promise<boolean> => {
    // Upsert each shift — this preserves history across syncs
    const { error: deleteError } = await supabase
        .from('yd_shifts')
        .delete()
        .eq('user_id', userId);

    if (deleteError) {
        console.error('Failed to clear YD shifts:', deleteError);
        return false;
    }

    if (shifts.length === 0) return true;

    const rows = shifts.map(s => ({
        id: s.id,
        user_id: userId,
        title: s.title,
        start_time: s.startTime,
        end_time: s.endTime,
        duration_hrs: s.durationHrs,
        paid_hrs: s.paidHrs,
        status: s.status,
        previous_start_time: s.previousStartTime ?? null,
        previous_end_time: s.previousEndTime ?? null,
        previous_duration_hrs: s.previousDurationHrs ?? null,
        previous_paid_hrs: s.previousPaidHrs ?? null,
    }));

    const { error } = await supabase.from('yd_shifts').insert(rows);
    if (error) {
        console.error('Failed to save YD shifts:', error);
        return false;
    }
    return true;
};

export const fetchYDShifts = async (userId: string): Promise<YDShiftSnapshot[] | null> => {
    const { data, error } = await supabase
        .from('yd_shifts')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: true });

    if (error) {
        console.error('Failed to fetch YD shifts:', error);
        return null;
    }

    return (data || []).map(row => ({
        id: row.id,
        title: row.title,
        startTime: row.start_time,
        endTime: row.end_time,
        durationHrs: row.duration_hrs,
        paidHrs: row.paid_hrs,
        status: row.status,
        previousStartTime: row.previous_start_time ?? undefined,
        previousEndTime: row.previous_end_time ?? undefined,
        previousDurationHrs: row.previous_duration_hrs ?? undefined,
        previousPaidHrs: row.previous_paid_hrs ?? undefined,
    }));
};

// ─── Sync Metadata ─────────────────────────────────────────────────────────────

export const saveSyncMeta = async (userId: string, lastFetched: number): Promise<void> => {
    await supabase
        .from('calendar_sync_meta')
        .upsert({ user_id: userId, last_fetched: new Date(lastFetched).toISOString() }, { onConflict: 'user_id' });
};

export const fetchSyncMeta = async (userId: string): Promise<number | null> => {
    const { data, error } = await supabase
        .from('calendar_sync_meta')
        .select('last_fetched')
        .eq('user_id', userId)
        .single();

    if (error || !data) return null;
    return new Date(data.last_fetched).getTime();
};
