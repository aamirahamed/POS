import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Reminder {
    id: string;
    text: string;
    completed: boolean;
    createdAt: number;
    category?: string;
    dueDate?: number;
}

interface RemindersState {
    reminders: Reminder[];
    addReminder: (text: string, category?: string, dueDate?: number) => void;
    toggleReminder: (id: string) => void;
    deleteReminder: (id: string) => void;
    clearCompleted: () => void;
}

export const useRemindersStore = create<RemindersState>()(
    persist(
        (set) => ({
            reminders: [],
            addReminder: (text, category, dueDate) => set((state) => ({
                reminders: [
                    {
                        id: Date.now().toString(),
                        text,
                        completed: false,
                        createdAt: Date.now(),
                        category,
                        dueDate
                    },
                    ...state.reminders
                ]
            })),
            toggleReminder: (id) => set((state) => ({
                reminders: state.reminders.map((r) =>
                    r.id === id ? { ...r, completed: !r.completed } : r
                )
            })),
            deleteReminder: (id) => set((state) => ({
                reminders: state.reminders.filter((r) => r.id !== id)
            })),
            clearCompleted: () => set((state) => ({
                reminders: state.reminders.filter((r) => !r.completed)
            }))
        }),
        {
            name: 'pos-reminders-storage',
        }
    )
);
