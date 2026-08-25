import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchTodayFocusItems, saveTodayFocusItem, deleteTodayFocusItem, updateFocusItemNotes } from '@/services/todayService';
import { supabase } from '@/lib/supabase';

export interface BrainDumpItem {
    id: string;
    text: string;
    actionType: string;
    actionResult: string;
    createdAt: number;
    reviewed?: boolean;
}

export interface QuickNote {
    id: string;
    text: string;
    createdAt: number;
}

export interface FocusItem {
    id: string;
    lifemapNodeId?: string; // Optional for manual items
    isManual?: boolean;
    title?: string;
    addedAt: number;
    notes: QuickNote[];
}

interface TodayState {
    focusItems: FocusItem[];
    brainDumpHistory: BrainDumpItem[];
    
    // Remote Sync
    loadFromDB: () => Promise<void>;
    
    addFocusNode: (id: string, isManual?: boolean, title?: string) => Promise<FocusItem | null>;
    removeFocusNode: (id: string) => Promise<void>;
    clearFocusNodes: () => void;
    
    // Notes
    addFocusNote: (focusId: string, text: string) => Promise<QuickNote | null>;
    editFocusNote: (focusId: string, noteId: string, text: string) => Promise<void>;
    deleteFocusNote: (focusId: string, noteId: string) => Promise<void>;
    
    // Brain Dump
    addBrainDump: (item: Omit<BrainDumpItem, 'id' | 'createdAt'>) => void;
    updateBrainDump: (id: string, updates: Partial<BrainDumpItem>) => void;
    deleteBrainDump: (id: string) => void;
    clearBrainDump: () => void;
}

export const useTodayStore = create<TodayState>()(
    persist(
        (set, get) => ({
            focusItems: [],
            brainDumpHistory: [],
            
            loadFromDB: async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                
                const items = await fetchTodayFocusItems(user.id);
                if (items) {
                    set({ focusItems: items });
                }
            },

            addFocusNode: async (id, isManual = false, title = "") => {
                const state = get();
                // Avoid duplicates by lifemapNodeId if not manual
                if (!isManual && state.focusItems.some(f => f.lifemapNodeId === id)) {
                    return state.focusItems.find(f => f.lifemapNodeId === id)!;
                }
                
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return null;
                
                const tempItem: FocusItem = {
                    id: `temp-${Date.now()}`,
                    lifemapNodeId: isManual ? undefined : id,
                    isManual,
                    title,
                    addedAt: Date.now(),
                    notes: []
                };
                
                // Optimistic UI update
                set({ focusItems: [...state.focusItems, tempItem] });
                
                const savedItem = await saveTodayFocusItem(user.id, tempItem);
                
                if (savedItem) {
                    set((s) => ({
                        focusItems: s.focusItems.map(f => f.id === tempItem.id ? savedItem : f)
                    }));
                    return savedItem;
                } else {
                    // Revert if error
                    set((s) => ({
                        focusItems: s.focusItems.filter(f => f.id !== tempItem.id)
                    }));
                    return null;
                }
            },
            
            removeFocusNode: async (id) => {
                const state = get();
                const item = state.focusItems.find(f => f.id === id || f.lifemapNodeId === id);
                if (!item) return;

                // Optimistic delete
                set({ focusItems: state.focusItems.filter(f => f.id !== id && f.lifemapNodeId !== id) });
                
                await deleteTodayFocusItem(item.id);
            },
            
            clearFocusNodes: () => set({ focusItems: [] }), // We don't delete all from DB immediately here as there is no single service function
            
            addFocusNote: async (focusId, text) => {
                const state = get();
                const item = state.focusItems.find(f => f.id === focusId || f.lifemapNodeId === focusId);
                if (!item) return null;

                const newNote: QuickNote = { id: `note-${Date.now()}`, text, createdAt: Date.now() };
                const updatedNotes = [...item.notes, newNote];
                
                // Optimistic UI
                set((s) => ({
                    focusItems: s.focusItems.map(f => f.id === item.id ? { ...f, notes: updatedNotes } : f)
                }));
                
                await updateFocusItemNotes(item.id, updatedNotes);
                return newNote;
            },
            
            editFocusNote: async (focusId, noteId, text) => {
                const state = get();
                const item = state.focusItems.find(f => f.id === focusId || f.lifemapNodeId === focusId);
                if (!item) return;

                const updatedNotes = item.notes.map(n => n.id === noteId ? { ...n, text } : n);
                
                set((s) => ({
                    focusItems: s.focusItems.map(f => f.id === item.id ? { ...f, notes: updatedNotes } : f)
                }));
                
                await updateFocusItemNotes(item.id, updatedNotes);
            },
            
            deleteFocusNote: async (focusId, noteId) => {
                const state = get();
                const item = state.focusItems.find(f => f.id === focusId || f.lifemapNodeId === focusId);
                if (!item) return;

                const updatedNotes = item.notes.filter(n => n.id !== noteId);
                
                set((s) => ({
                    focusItems: s.focusItems.map(f => f.id === item.id ? { ...f, notes: updatedNotes } : f)
                }));
                
                await updateFocusItemNotes(item.id, updatedNotes);
            },

            addBrainDump: (item) => set((state) => ({
                brainDumpHistory: [{ id: `bd-${Date.now()}`, createdAt: Date.now(), ...item }, ...state.brainDumpHistory]
            })),
            updateBrainDump: (id, updates) => set((state) => ({
                brainDumpHistory: state.brainDumpHistory.map(b => b.id === id ? { ...b, ...updates } : b)
            })),
            deleteBrainDump: (id) => set((state) => ({
                brainDumpHistory: state.brainDumpHistory.filter(b => b.id !== id)
            })),
            clearBrainDump: () => set({ brainDumpHistory: [] })
        }),
        { 
            name: 'pos-today-storage-v2',
            partialize: (state) => ({ brainDumpHistory: state.brainDumpHistory }) // Only persist braindump, DB handles focusItems
        }
    )
);
