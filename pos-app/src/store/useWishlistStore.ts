
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { fetchWishlistItems, saveWishlistItem, deleteWishlistItem } from '@/services/wishlistService';

export type PriorityBucket = 'Need Now' | 'Need Next' | 'Nice to Have' | 'Dream / Long-Term';
export type WishlistStatus = 'Considering' | 'Shortlisted' | 'Planned' | 'Bought' | 'Dropped';

export interface WishlistItem {
    id?: string; // Optional for new items before save
    name: string;
    link?: string;
    price: number;
    category: string;
    priorityBucket: PriorityBucket;
    notes?: string;
    status: WishlistStatus;
    scoreImpact: number; // 1-5
    scoreUrgency: number; // 1-5
    scoreFrequency: number; // 1-5
    createdAt?: string;
}

interface WishlistState {
    items: WishlistItem[];
    setItems: (items: WishlistItem[]) => void;
    addItem: (item: WishlistItem) => Promise<void>;
    updateItem: (item: WishlistItem) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
    moveItemToBucket: (id: string, bucket: PriorityBucket) => Promise<void>;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
    items: [],
    setItems: (items) => set({ items }),
    addItem: async (item) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Optimistic update? Maybe safer to fetch after save for ID generation.
            // Or use an optimistic ID.
            // For now, let's just save and re-fetch or let specific UI handle it.
            // Actually, typical pattern: save -> fetch all.
            await saveWishlistItem(user.id, item);
            const fresh = await fetchWishlistItems(user.id);
            if (fresh) set({ items: fresh });
        }
    },
    updateItem: async (item) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && item.id) {
            // Optimistic
            set(state => ({
                items: state.items.map(i => i.id === item.id ? item : i)
            }));
            await saveWishlistItem(user.id, item);
        }
    },
    deleteItem: async (id) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            set(state => ({
                items: state.items.filter(i => i.id !== id)
            }));
            await deleteWishlistItem(id);
        }
    },
    moveItemToBucket: async (id, bucket) => {
        const item = get().items.find(i => i.id === id);
        if (item) {
            await get().updateItem({ ...item, priorityBucket: bucket });
        }
    }
}));
