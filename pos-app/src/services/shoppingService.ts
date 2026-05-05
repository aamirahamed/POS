import { supabase } from '@/lib/supabase';
import { ShoppingItem } from '@/store/useShoppingStore';

export const fetchShoppingItems = async (userId: string): Promise<ShoppingItem[] | null> => {
    const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching shopping items:', error);
        return null;
    }

    const now = new Date();
    const itemsToReset: string[] = [];

    const parsedData = data.map((row: any) => {
        let isCompleted = row.completed;

        if (isCompleted && row.recurring && row.updated_at) {
            const updatedAt = new Date(row.updated_at);
            const daysDiff = (now.getTime() - updatedAt.getTime()) / (1000 * 3600 * 24);
            
            if (daysDiff >= 3) {
                isCompleted = false;
                itemsToReset.push(row.id);
            }
        }

        return {
            id: row.id,
            text: row.text,
            completed: isCompleted,
            recurring: row.recurring,
            createdAt: row.created_at
        };
    });

    // Background update to reset recurring items in the DB
    if (itemsToReset.length > 0) {
        // Fire and forget
        supabase
            .from('shopping_items')
            .update({ completed: false, updated_at: new Date().toISOString() })
            .in('id', itemsToReset)
            .then(({ error }) => {
                if (error) console.error('Error auto-resetting recurring items:', error);
            });
    }

    return parsedData;
};

export const saveShoppingItem = async (userId: string, item: ShoppingItem): Promise<ShoppingItem | null> => {
    const row = {
        user_id: userId,
        text: item.text,
        completed: item.completed,
        recurring: item.recurring,
        updated_at: new Date().toISOString()
    };

    if (item.id && !item.id.startsWith('temp-')) {
        // Update existing
        const { data, error } = await supabase
            .from('shopping_items')
            .update(row)
            .eq('id', item.id)
            .select()
            .single();
        if (error) {
            console.error('Error updating shopping item:', error);
            return null;
        }
        return {
            id: data.id,
            text: data.text,
            completed: data.completed,
            recurring: data.recurring,
            createdAt: data.created_at
        };
    } else {
        // Insert new
        const { data, error } = await supabase
            .from('shopping_items')
            .insert({ ...row, created_at: new Date().toISOString() })
            .select()
            .single();
        if (error) {
            console.error('Error inserting shopping item:', error);
            return null;
        }
        return {
            id: data.id,
            text: data.text,
            completed: data.completed,
            recurring: data.recurring,
            createdAt: data.created_at
        };
    }
};

export const deleteShoppingItem = async (id: string) => {
    // If it's a temp optimistic item, just ignore
    if (id.startsWith('temp-')) return;
    
    const { error } = await supabase
        .from('shopping_items')
        .delete()
        .eq('id', id);
    if (error) console.error('Error deleting shopping item:', error);
};

export const deleteCompletedShoppingItems = async (userId: string) => {
    const { error } = await supabase
        .from('shopping_items')
        .delete()
        .eq('user_id', userId)
        .eq('completed', true);
    if (error) console.error('Error clearing completed shopping items:', error);
};
