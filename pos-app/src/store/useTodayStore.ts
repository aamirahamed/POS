import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
    addedAt: number;
    notes: QuickNote[];
}

interface TodayState {
    focusItems: FocusItem[];
    brainDumpHistory: BrainDumpItem[];
    addFocusNode: (id: string) => void;
    removeFocusNode: (id: string) => void;
    clearFocusNodes: () => void;
    addFocusNote: (focusId: string, text: string) => void;
    editFocusNote: (focusId: string, noteId: string, text: string) => void;
    deleteFocusNote: (focusId: string, noteId: string) => void;
    
    addBrainDump: (item: Omit<BrainDumpItem, 'id' | 'createdAt'>) => void;
    updateBrainDump: (id: string, updates: Partial<BrainDumpItem>) => void;
    deleteBrainDump: (id: string) => void;
    clearBrainDump: () => void;
}

export const useTodayStore = create<TodayState>()(
    persist(
        (set) => ({
            focusItems: [],
            brainDumpHistory: [],
            addFocusNode: (id) => set((state) => {
                if (state.focusItems.some(f => f.id === id)) return state;
                return { focusItems: [...state.focusItems, { id, addedAt: Date.now(), notes: [] }] };
            }),
            removeFocusNode: (id) => set((state) => ({ 
                focusItems: state.focusItems.filter(f => f.id !== id) 
            })),
            clearFocusNodes: () => set({ focusItems: [] }),
            addFocusNote: (focusId, text) => set((state) => ({
                focusItems: state.focusItems.map(f => f.id === focusId ? {
                    ...f,
                    notes: [...f.notes, { id: `note-${Date.now()}`, text, createdAt: Date.now() }]
                } : f)
            })),
            editFocusNote: (focusId, noteId, text) => set((state) => ({
                focusItems: state.focusItems.map(f => f.id === focusId ? {
                    ...f,
                    notes: f.notes.map(n => n.id === noteId ? { ...n, text } : n)
                } : f)
            })),
            deleteFocusNote: (focusId, noteId) => set((state) => ({
                focusItems: state.focusItems.map(f => f.id === focusId ? {
                    ...f,
                    notes: f.notes.filter(n => n.id !== noteId)
                } : f)
            })),

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
        { name: 'pos-today-storage-v2' }
    )
);
