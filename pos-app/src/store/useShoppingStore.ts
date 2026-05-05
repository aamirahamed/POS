import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { fetchShoppingItems, saveShoppingItem, deleteShoppingItem, deleteCompletedShoppingItems } from '@/services/shoppingService';

export interface ShoppingItem {
    id: string;
    text: string;
    completed: boolean;
    recurring: boolean;
    createdAt?: string;
}

interface ShoppingState {
    items: ShoppingItem[];
    loading: boolean;
    error: string | null;
    fetchItems: () => Promise<void>;
    addItem: (text: string) => Promise<void>;
    toggleComplete: (id: string) => Promise<void>;
    toggleRecurring: (id: string) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
    clearCompleted: () => Promise<void>;
}

export const useShoppingStore = create<ShoppingState>((set, get) => ({
    items: [],
    loading: false,
    error: null,

    fetchItems: async () => {
        set({ loading: true, error: null });
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            set({ error: 'Not authenticated', loading: false });
            return;
        }

        const data = await fetchShoppingItems(user.id);
        if (data) {
            set({ items: data, loading: false });
        } else {
            set({ error: 'Failed to fetch items', loading: false });
        }
    },

    addItem: async (text: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Optimistic update
        const tempItem: ShoppingItem = {
            id: `temp-${Date.now()}`,
            text,
            completed: false,
            recurring: false,
        };
        
        set(state => ({ items: [tempItem, ...state.items] }));

        const savedItem = await saveShoppingItem(user.id, tempItem);
        if (savedItem) {
            // Replace temp item with saved item
            set(state => ({
                items: state.items.map(i => i.id === tempItem.id ? savedItem : i)
            }));
        } else {
            // Revert on failure
            set(state => ({
                items: state.items.filter(i => i.id !== tempItem.id)
            }));
        }
    },

    toggleComplete: async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const itemToUpdate = get().items.find(i => i.id === id);
        if (!itemToUpdate) return;

        const updatedItem = { ...itemToUpdate, completed: !itemToUpdate.completed };

        // Optimistic update
        set(state => ({
            items: state.items.map(i => i.id === id ? updatedItem : i)
        }));

        const saved = await saveShoppingItem(user.id, updatedItem);
        if (!saved) {
            // Revert on failure
            set(state => ({
                items: state.items.map(i => i.id === id ? itemToUpdate : i)
            }));
        }
    },

    toggleRecurring: async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const itemToUpdate = get().items.find(i => i.id === id);
        if (!itemToUpdate) return;

        const updatedItem = { ...itemToUpdate, recurring: !itemToUpdate.recurring };

        // Optimistic update
        set(state => ({
            items: state.items.map(i => i.id === id ? updatedItem : i)
        }));

        const saved = await saveShoppingItem(user.id, updatedItem);
        if (!saved) {
            // Revert on failure
            set(state => ({
                items: state.items.map(i => i.id === id ? itemToUpdate : i)
            }));
        }
    },

    deleteItem: async (id: string) => {
        // Optimistic update
        const currentItems = get().items;
        set(state => ({
            items: state.items.filter(i => i.id !== id)
        }));

        await deleteShoppingItem(id);
        // Assuming deletion is successful, we don't handle rollback here for simplicity,
        // but could restore currentItems if deleteShoppingItem returned status
    },

    clearCompleted: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Optimistic update
        set(state => ({
            items: state.items.filter(i => !i.completed)
        }));

        await deleteCompletedShoppingItems(user.id);
    }
}));
