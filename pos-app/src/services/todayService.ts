import { supabase } from '@/lib/supabase';
import { FocusItem } from '@/store/useTodayStore';

export const fetchTodayFocusItems = async (userId: string): Promise<FocusItem[] | null> => {
    const { data, error } = await supabase
        .from('today_focus_items')
        .select('*')
        .eq('user_id', userId)
        .order('added_at', { ascending: true });

    if (error) {
        console.error('Error fetching today focus items:', error);
        return null;
    }

    return data.map((row: any) => ({
        id: row.id, // the UUID from DB
        lifemapNodeId: row.lifemap_node_id,
        isManual: row.is_manual,
        title: row.title,
        addedAt: new Date(row.added_at).getTime(),
        notes: row.notes || []
    }));
};

export const saveTodayFocusItem = async (userId: string, item: FocusItem): Promise<FocusItem | null> => {
    const row = {
        user_id: userId,
        title: item.title || null,
        is_manual: item.isManual || false,
        lifemap_node_id: item.lifemapNodeId || null,
        added_at: new Date(item.addedAt).toISOString(),
        notes: item.notes || []
    };

    if (item.id && !item.id.startsWith('temp-') && !item.id.startsWith('node-')) {
        // Update existing DB item
        const { data, error } = await supabase
            .from('today_focus_items')
            .update({ ...row, updated_at: new Date().toISOString() })
            .eq('id', item.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating focus item:', error);
            return null;
        }
        return {
            id: data.id,
            lifemapNodeId: data.lifemap_node_id,
            isManual: data.is_manual,
            title: data.title,
            addedAt: new Date(data.added_at).getTime(),
            notes: data.notes || []
        };
    } else {
        // Insert new
        const { data, error } = await supabase
            .from('today_focus_items')
            .insert({ ...row })
            .select()
            .single();

        if (error) {
            console.error('Error inserting focus item:', error);
            return null;
        }
        return {
            id: data.id,
            lifemapNodeId: data.lifemap_node_id,
            isManual: data.is_manual,
            title: data.title,
            addedAt: new Date(data.added_at).getTime(),
            notes: data.notes || []
        };
    }
};

export const deleteTodayFocusItem = async (id: string) => {
    if (id.startsWith('temp-') || id.startsWith('node-')) return;
    const { error } = await supabase
        .from('today_focus_items')
        .delete()
        .eq('id', id);
    if (error) console.error('Error deleting focus item:', error);
};

export const updateFocusItemNotes = async (id: string, notes: any[]) => {
    if (id.startsWith('temp-') || id.startsWith('node-')) return;
    const { error } = await supabase
        .from('today_focus_items')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('id', id);
    if (error) console.error('Error updating focus item notes:', error);
};
