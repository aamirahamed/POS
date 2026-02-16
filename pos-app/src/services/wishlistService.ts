
import { supabase } from '@/lib/supabase';
import { WishlistItem } from '@/store/useWishlistStore';

export const fetchWishlistItems = async (userId: string): Promise<WishlistItem[] | null> => {
    const { data, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching wishlist items:', error);
        return null;
    }

    return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        link: row.link,
        price: row.price,
        category: row.category,
        priorityBucket: row.priority_bucket,
        notes: row.notes,
        status: row.status,
        scoreImpact: row.score_impact,
        scoreUrgency: row.score_urgency,
        scoreFrequency: row.score_frequency,
        createdAt: row.created_at
    }));
};

export const saveWishlistItem = async (userId: string, item: WishlistItem) => {
    const row = {
        user_id: userId,
        name: item.name,
        link: item.link,
        price: item.price,
        category: item.category,
        priority_bucket: item.priorityBucket,
        notes: item.notes,
        status: item.status,
        score_impact: item.scoreImpact,
        score_urgency: item.scoreUrgency,
        score_frequency: item.scoreFrequency,
        updated_at: new Date().toISOString()
    };

    if (item.id) {
        // Update existing
        const { error } = await supabase
            .from('wishlist_items')
            .update(row)
            .eq('id', item.id);
        if (error) console.error('Error updating wishlist item:', error);
    } else {
        // Insert new
        const { error } = await supabase
            .from('wishlist_items')
            .insert(row);
        if (error) console.error('Error inserting wishlist item:', error);
    }
};

export const deleteWishlistItem = async (id: string) => {
    const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('id', id);
    if (error) console.error('Error deleting wishlist item:', error);
};
