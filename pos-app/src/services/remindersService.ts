
import { supabase } from '@/lib/supabase';
import { Reminder } from '@/store/useRemindersStore';

export const saveReminders = async (userId: string, reminders: Reminder[]) => {
    if (!userId) return;

    // 1. Prepare rows
    const rows = reminders.map(r => ({
        id: r.id,
        user_id: userId,
        text: r.text,
        completed: r.completed,
        created_at: r.createdAt,
        category: r.category,
        due_date: r.dueDate ? new Date(r.dueDate).toISOString() : null,
        updated_at: new Date().toISOString()
    }));

    // 2. Upsert current reminders
    if (rows.length > 0) {
        const { error: upsertError } = await supabase
            .from('reminders')
            .upsert(rows, { onConflict: 'id' });

        if (upsertError) console.error('Error syncing reminders (upsert):', upsertError);
    }

    // 3. Delete reminders that are no longer in the list
    // Get list of current IDs
    const currentIds = reminders.map(r => r.id);

    // Delete where user_id matches but ID is NOT in currentIds
    // Note: If list is empty, currentIds is [], so we delete all (which is correct).
    // Supabase allows "not.in" filter.

    let query = supabase.from('reminders').delete().eq('user_id', userId);

    if (currentIds.length > 0) {
        query = query.not('id', 'in', `(${currentIds.map(id => `"${id}"`).join(',')})`);
    }

    const { error: deleteError } = await query;
    if (deleteError) console.error('Error syncing reminders (prune):', deleteError);
};

export const fetchReminders = async (userId: string) => {
    const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching reminders:', error);
        return null;
    }

    // Map back to store format
    return data.map((row: any) => ({
        id: row.id,
        text: row.text,
        completed: row.completed,
        createdAt: row.created_at, // Ensure casting if needed, schema uses bigint
        category: row.category,
        dueDate: row.due_date ? new Date(row.due_date).getTime() : undefined
    })) as Reminder[]; // Type assertion for now
};
