import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type IncubatorStatus = 'pending' | 'archived' | 'routed';

export type RouteDestination =
    | 'life-map'
    | 'reminder'
    | 'shopping'
    | 'wishlist'
    | 'assignments'
    | 'archive';

export interface IncubatedThought {
    id: string;
    text: string;
    assistantNote: string;       // the AI's reply / why it couldn't classify
    createdAt: number;
    status: IncubatorStatus;
    routedTo?: RouteDestination;
    routedAt?: number;
}

interface IncubatorState {
    thoughts: IncubatedThought[];
    addThought: (text: string, assistantNote: string) => void;
    routeThought: (id: string, destination: RouteDestination) => void;
    archiveThought: (id: string) => void;
    deleteThought: (id: string) => void;
    restoreThought: (id: string) => void;
}

export const useIncubatorStore = create<IncubatorState>()(
    persist(
        (set) => ({
            thoughts: [],

            addThought: (text, assistantNote) =>
                set((state) => ({
                    thoughts: [
                        {
                            id: `inc-${Date.now()}`,
                            text,
                            assistantNote,
                            createdAt: Date.now(),
                            status: 'pending',
                        },
                        ...state.thoughts,
                    ],
                })),

            routeThought: (id, destination) =>
                set((state) => ({
                    thoughts: state.thoughts.map((t) =>
                        t.id === id
                            ? { ...t, status: 'routed', routedTo: destination, routedAt: Date.now() }
                            : t
                    ),
                })),

            archiveThought: (id) =>
                set((state) => ({
                    thoughts: state.thoughts.map((t) =>
                        t.id === id ? { ...t, status: 'archived' } : t
                    ),
                })),

            deleteThought: (id) =>
                set((state) => ({
                    thoughts: state.thoughts.filter((t) => t.id !== id),
                })),

            restoreThought: (id) =>
                set((state) => ({
                    thoughts: state.thoughts.map((t) =>
                        t.id === id ? { ...t, status: 'pending', routedTo: undefined, routedAt: undefined } : t
                    ),
                })),
        }),
        { name: 'pos-incubator-v1' }
    )
);
