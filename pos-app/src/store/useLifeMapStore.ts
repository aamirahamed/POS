import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    Connection,
    EdgeChange,
    NodeChange
} from '@xyflow/react';
import { LifeMapState, LifeMapNode } from '@/types/lifemap';
import { calculateRadialLayout } from '@/utils/layout';
import { saveLifeMap, fetchLifeMap } from '@/services/lifeMapService';
import { supabase } from '@/lib/supabase';

// Debounced DB sync — waits 1.5s after last change before writing
let syncTimer: ReturnType<typeof setTimeout> | null = null;
const debouncedSync = (nodes: LifeMapNode[], edges: any[]) => {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await saveLifeMap(user.id, nodes, edges);
    }, 1500);
};

// Immediate DB sync — used for high-value writes (resources, etc.) that must not be lost
const immediateSync = async (nodes: LifeMapNode[], edges: any[]) => {
    // Cancel any pending debounce to avoid a stale overwrite racing this write
    if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await saveLifeMap(user.id, nodes, edges);
};


const PILLAR_HUES = [210, 270, 330, 40, 150, 180, 30, 240]; // Blue, Purple, Pink, Amber, Green, Teal, Orange, Indigo

// Initial data
const initialNodes: LifeMapNode[] = [
    {
        id: 'center',
        type: 'center',
        position: { x: 0, y: 0 },
        data: { label: 'Aamir', hue: 0 },
        draggable: false,
        zIndex: 100, // Highest priority
    },
    {
        id: 'p1',
        type: 'pillar',
        position: { x: 0, y: -200 },
        data: { label: 'Health', expanded: true, hue: 150 }, // Green
        zIndex: 50,
    },
    {
        id: 'p2',
        type: 'pillar',
        position: { x: 200, y: 0 },
        data: { label: 'Career', expanded: true, hue: 210 }, // Blue
        zIndex: 50,
    },
    {
        id: 'p3',
        type: 'pillar',
        position: { x: 0, y: 200 },
        data: { label: 'Relationships', expanded: true, hue: 330 }, // Pink
        zIndex: 50,
    },
    {
        id: 'p4',
        type: 'pillar',
        position: { x: -200, y: 0 },
        data: { label: 'Growth', expanded: true, hue: 40 }, // Amber
        zIndex: 50,
    },
];

const initialEdges = [
    { id: 'e1', source: 'center', target: 'p1', type: 'smoothstep', animated: true, zIndex: 10, sourceHandle: 'source-bottom', targetHandle: 'target-top' },
    { id: 'e2', source: 'center', target: 'p2', type: 'smoothstep', animated: true, zIndex: 10, sourceHandle: 'source-bottom', targetHandle: 'target-top' },
    { id: 'e3', source: 'center', target: 'p3', type: 'smoothstep', animated: true, zIndex: 10, sourceHandle: 'source-bottom', targetHandle: 'target-top' },
    { id: 'e4', source: 'center', target: 'p4', type: 'smoothstep', animated: true, zIndex: 10, sourceHandle: 'source-bottom', targetHandle: 'target-top' },
];

const ensureInboxExists = (nodes: LifeMapNode[], edges: any[]): { nodes: LifeMapNode[], edges: any[] } => {
    let newNodes = [...nodes];
    let newEdges = [...edges];
    let changed = false;

    // 1. Ensure pillar-inbox
    const pillarIdx = newNodes.findIndex(n => n.id === 'pillar-inbox');
    if (pillarIdx === -1) {
        newNodes.push({
            id: 'pillar-inbox',
            type: 'pillar',
            position: { x: -350, y: 0 },
            data: { label: 'Inbox', expanded: true, hue: 240 },
            zIndex: 50,
        });
        changed = true;
    }

    // 2. Ensure thread-inbox
    const threadIdx = newNodes.findIndex(n => n.id === 'thread-inbox');
    if (threadIdx === -1) {
        newNodes.push({
            id: 'thread-inbox',
            type: 'thread',
            position: { x: -350, y: 280 },
            data: { label: 'Quick captures', parentId: 'pillar-inbox', expanded: true, hue: 240 },
            zIndex: 40,
        });
        changed = true;
    }

    // 3. Ensure initiative-inbox
    const initIdx = newNodes.findIndex(n => n.id === 'initiative-inbox');
    if (initIdx === -1) {
        newNodes.push({
            id: 'initiative-inbox',
            type: 'initiative',
            position: { x: -350, y: 560 },
            data: { label: 'Inbox Focus', parentId: 'thread-inbox', expanded: true, hue: 240, status: 'active' },
            zIndex: 30,
        });
        changed = true;
    }

    // 4. Ensure subnode-inbox
    const subIdx = newNodes.findIndex(n => n.id === 'subnode-inbox');
    if (subIdx === -1) {
        newNodes.push({
            id: 'subnode-inbox',
            type: 'subnode',
            position: { x: -350, y: 840 },
            data: {
                label: 'Quick Captures',
                parentId: 'initiative-inbox',
                status: 'active',
                hue: 240,
                priority: 'medium',
                tasks: [],
                resources: [],
                notes: 'Capture area for untagged items.',
                lastUpdated: Date.now(),
            },
            zIndex: 20,
        });
        changed = true;
    }

    // 5. Ensure edges
    const requiredEdges = [
        { id: 'e-center-pillar-inbox', source: 'center', target: 'pillar-inbox', type: 'smoothstep', animated: true, zIndex: 10, sourceHandle: 'source-bottom', targetHandle: 'target-top' },
        { id: 'e-pillar-inbox-thread-inbox', source: 'pillar-inbox', target: 'thread-inbox', type: 'smoothstep', animated: false, zIndex: 5, sourceHandle: 'source-bottom', targetHandle: 'target-top' },
        { id: 'e-thread-inbox-initiative-inbox', source: 'thread-inbox', target: 'initiative-inbox', type: 'smoothstep', animated: false, zIndex: 3, sourceHandle: 'source-bottom', targetHandle: 'target-top' },
        { id: 'e-initiative-inbox-subnode-inbox', source: 'initiative-inbox', target: 'subnode-inbox', type: 'default', animated: false, zIndex: 1, sourceHandle: 'source-bottom', targetHandle: 'target-top' }
    ];

    requiredEdges.forEach(reqEdge => {
        if (!newEdges.some(e => e.id === reqEdge.id)) {
            newEdges.push(reqEdge);
            changed = true;
        }
    });

    if (changed) {
        return calculateRadialLayout(newNodes, newEdges);
    }
    return { nodes: newNodes, edges: newEdges };
};

export const useLifeMapStore = create<LifeMapState>()(
    persist(
        (set, get) => {
            // Ensure system inbox exists and calculate initial layout
            const { nodes: initNodes, edges: initEdges } = ensureInboxExists(initialNodes, initialEdges);

            return {
                nodes: initNodes,
                edges: initEdges,
                inbox: [],

                selectedExecutionNodeId: null,
                setSelectedExecutionNodeId: (id) => set({ selectedExecutionNodeId: id }),

                isCommandCenterOpen: false,
                setCommandCenterOpen: (isOpen) => set({ isCommandCenterOpen: isOpen }),

                nodeToDelete: null,
                setNodeToDelete: (id) => set({ nodeToDelete: id }),

                // Load from Supabase on app start (falls back to localStorage)
                loadFromDB: async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    const map = await fetchLifeMap(user.id);
                    if (map?.nodes?.length) {
                        const { nodes: layoutedNodes, edges: layoutedEdges } = ensureInboxExists(map.nodes, map.edges || []);
                        set({ nodes: layoutedNodes, edges: layoutedEdges });
                        if (layoutedNodes.length > map.nodes.length) {
                            await saveLifeMap(user.id, layoutedNodes, layoutedEdges);
                        }
                    }
                },
                confirmDeleteNode: () => {
                    const state = get();
                    const id = state.nodeToDelete;
                    if (!id) return;

                    // const edges = state.edges;
                    const getAllDescendants = (nodeId: string): string[] => {
                        const children = state.nodes.filter(n => n.data.parentId === nodeId).map(n => n.id);
                        let descendants = [...children];
                        children.forEach(childId => {
                            descendants = descendants.concat(getAllDescendants(childId));
                        });
                        return descendants;
                    };

                    const nodesToDelete = [id, ...getAllDescendants(id)];
                    
                    const newNodes = state.nodes.filter((node) => !nodesToDelete.includes(node.id));
                    const newEdges = state.edges.filter((edge) => !nodesToDelete.includes(edge.source) && !nodesToDelete.includes(edge.target));
                    
                    const layouted = calculateRadialLayout(newNodes, newEdges);
                    set({ nodes: layouted.nodes, edges: newEdges, nodeToDelete: null });
                    debouncedSync(layouted.nodes, newEdges);
                },

                addNode: (node) => {
                    const newNodes = [...get().nodes, node];
                    const layouted = calculateRadialLayout(newNodes, get().edges);
                    set({ nodes: layouted.nodes });
                },

                addPillar: (label) => {
                    const id = `p-${Date.now()}`;

                    // Assign next hue
                    const currentPillars = get().nodes.filter(n => n.type === 'pillar');
                    const hueIndex = currentPillars.length % PILLAR_HUES.length;
                    const hue = PILLAR_HUES[hueIndex];

                    const newPillar: LifeMapNode = {
                        id,
                        type: 'pillar',
                        position: { x: 0, y: 0 },
                        data: { label, expanded: true, hue },
                        zIndex: 50,
                    };
                    const newEdge = {
                        id: `e-center-${id}`,
                        source: 'center',
                        target: id,
                        type: 'smoothstep',
                        animated: true,
                        zIndex: 10,
                        sourceHandle: 'source-bottom',
                        targetHandle: 'target-top'
                    };

                    const newNodes = [...get().nodes, newPillar];
                    const newEdges = [...get().edges, newEdge];
                    const layouted = calculateRadialLayout(newNodes, newEdges);

                    set({ nodes: layouted.nodes, edges: newEdges });
                    debouncedSync(layouted.nodes, newEdges);
                },

                addThread: (parentId, label) => {
                    const id = `t-${Date.now()}`;
                    const isNew = label === "";

                    // Find parent hue
                    const parent = get().nodes.find(n => n.id === parentId);
                    const parentHue = parent?.data.hue || 210;

                    // Calculate sibling offset for variance
                    // "If a pillar has 2 different threads, each thread will follow a unique color scheme"
                    const siblings = get().nodes.filter(n =>
                        n.type === 'thread' && get().edges.some(e => e.source === parentId && e.target === n.id)
                    );

                    // Shift hue slightly for uniqueness, but keep related (e.g. +/- 15 deg)
                    // Or cycle through small offsets: 0, -15, +15, -30, +30
                    const index = siblings.length;
                    const offset = index === 0 ? 0 : (index % 2 === 0 ? 1 : -1) * Math.ceil(index / 2) * 15;
                    const hue = (parentHue + offset + 360) % 360;

                    const newThread: LifeMapNode = {
                        id,
                        type: 'thread',
                        position: { x: 0, y: 0 },
                        data: {
                            label: isNew ? "New Thread" : label,
                            parentId,
                            expanded: true,
                            editing: isNew,
                            hue
                        },
                        zIndex: 25,
                    };
                    const newEdge = {
                        id: `e-${parentId}-${id}`,
                        source: parentId,
                        target: id,
                        type: 'smoothstep',
                        animated: false,
                        zIndex: 5,
                        sourceHandle: 'source-bottom',
                        targetHandle: 'target-top'
                    };

                    const newNodes = [...get().nodes, newThread];
                    const newEdges = [...get().edges, newEdge];
                    const layouted = calculateRadialLayout(newNodes, newEdges);

                    set({ nodes: layouted.nodes, edges: newEdges });
                    debouncedSync(layouted.nodes, newEdges);
                },

                addInitiative: (parentId, label) => {
                    const id = `i-${Date.now()}`;
                    const isNew = label === "";

                    const parent = get().nodes.find(n => n.id === parentId);
                    const hue = parent?.data.hue || 210;

                    const newInitiative: LifeMapNode = {
                        id,
                        type: 'initiative',
                        position: { x: 0, y: 0 },
                        data: {
                            label: isNew ? "New Initiative" : label,
                            parentId,
                            expanded: true,
                            editing: isNew,
                            hue,
                            status: 'backlog'
                        },
                        zIndex: 15,
                    };
                    const newEdge = {
                        id: `e-${parentId}-${id}`,
                        source: parentId,
                        target: id,
                        type: 'smoothstep',
                        animated: false,
                        zIndex: 3,
                        sourceHandle: 'source-bottom',
                        targetHandle: 'target-top'
                    };

                    const newNodes = [...get().nodes, newInitiative];
                    const newEdges = [...get().edges, newEdge];
                    const layouted = calculateRadialLayout(newNodes, newEdges);

                    set({ nodes: layouted.nodes, edges: newEdges });
                    debouncedSync(layouted.nodes, newEdges);
                },

                addSubnode: (parentId, label) => {
                    const id = `s-${Date.now()}`;
                    const isNew = label === "";

                    const parent = get().nodes.find(n => n.id === parentId);
                    const hue = parent?.data.hue || 210; // Inherit parent hue directly

                    const newSubnode: LifeMapNode = {
                        id,
                        type: 'subnode',
                        position: { x: 0, y: 0 },
                        data: {
                            label: isNew ? "New Execution Node" : label,
                            parentId,
                            status: 'active',
                            editing: isNew,
                            hue,
                            priority: 'medium',
                            tasks: [],
                            notes: '',
                            resources: [],
                            lastUpdated: Date.now(),
                            streak: 0,
                        },
                        zIndex: 10,
                    };
                    const newEdge = {
                        id: `e-${parentId}-${id}`,
                        source: parentId,
                        target: id,
                        type: 'default',
                        animated: false,
                        zIndex: 1,
                        sourceHandle: 'source-bottom',
                        targetHandle: 'target-top'
                    };

                    const newNodes = [...get().nodes, newSubnode];
                    const newEdges = [...get().edges, newEdge];
                    const layouted = calculateRadialLayout(newNodes, newEdges);

                    set({ nodes: layouted.nodes, edges: newEdges });
                    debouncedSync(layouted.nodes, newEdges);
                },

                addTaskToNode: (nodeId, text) => {
                    const nodes = get().nodes.map(node => {
                        if (node.id === nodeId) {
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    tasks: [
                                        ...(node.data.tasks || []),
                                        { id: `task-${Date.now()}`, text, completed: false, createdAt: Date.now() }
                                    ]
                                }
                            };
                        }
                        return node;
                    });

                    const layouted = calculateRadialLayout(nodes, get().edges);
                    set({ nodes: layouted.nodes, lastLayoutTrigger: Date.now() });
                    debouncedSync(layouted.nodes, get().edges);
                },

                toggleNodeTask: (nodeId, taskId) => {
                    const nodes = get().nodes.map(node => {
                        if (node.id === nodeId && node.data.tasks) {
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    tasks: node.data.tasks.map(t =>
                                        t.id === taskId ? { ...t, completed: !t.completed } : t
                                    )
                                }
                            };
                        }
                        return node;
                    });
                    set({ nodes });
                    debouncedSync(nodes, get().edges);
                },

                deleteTaskFromNode: (nodeId, taskId) => {
                    const nodes = get().nodes.map(node => {
                        if (node.id === nodeId && node.data.tasks) {
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    tasks: node.data.tasks.filter(t => t.id !== taskId)
                                }
                            };
                        }
                        return node;
                    });
                    set({ nodes });
                    debouncedSync(nodes, get().edges);
                },

                editTaskInNode: (nodeId, taskId, newText) => {
                    const nodes = get().nodes.map(node => {
                        if (node.id === nodeId && node.data.tasks) {
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    tasks: node.data.tasks.map(t =>
                                        t.id === taskId ? { ...t, text: newText } : t
                                    )
                                }
                            };
                        }
                        return node;
                    });
                    set({ nodes });
                    debouncedSync(nodes, get().edges);
                },

                lastLayoutTrigger: 0,
                triggerLayout: () => {
                    const { nodes, edges } = get();
                    const layouted = calculateRadialLayout(nodes, edges);
                    set({ nodes: layouted.nodes, lastLayoutTrigger: Date.now() });
                },

                updateNode: (id, data) => {
                    const nodes = get().nodes.map((node) =>
                        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
                    );
                    set({ nodes });
                    debouncedSync(nodes, get().edges);
                },

                addResource: (nodeId, resource) => {
                    const nodes = get().nodes.map(node => {
                        if (node.id === nodeId) {
                            const newResource = {
                                ...resource,
                                createdAt: resource.createdAt || Date.now()
                            };
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    resources: [...(node.data.resources || []), newResource],
                                    lastUpdated: Date.now(),
                                },
                            };
                        }
                        return node;
                    });
                    set({ nodes });
                    // Immediate sync — resources are explicit user intent, must not be lost
                    immediateSync(nodes, get().edges);
                },

                removeResource: (nodeId, resourceId) => {
                    const nodes = get().nodes.map(node => {
                        if (node.id === nodeId) {
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    resources: (node.data.resources || []).filter((r: any) => r.id !== resourceId),
                                    lastUpdated: Date.now(),
                                },
                            };
                        }
                        return node;
                    });
                    set({ nodes });
                    // Immediate sync — deletion is irreversible, must persist right away
                    immediateSync(nodes, get().edges);
                },

                toggleNodeExpansion: (id) => {
                    const nodes = get().nodes;
                    const node = nodes.find(n => n.id === id);
                    if (!node) return;

                    const isExpanded = !node.data.expanded;

                    // Update the node's expanded state
                    const updatedNodes = nodes.map(n =>
                        n.id === id ? { ...n, data: { ...n.data, expanded: isExpanded } } : n
                    );

                    const getAllDescendants = (nodeId: string): string[] => {
                        const children = nodes.filter(n => n.data.parentId === nodeId).map(n => n.id);
                        let descendants = [...children];
                        children.forEach(childId => {
                            descendants = descendants.concat(getAllDescendants(childId));
                        });
                        return descendants;
                    };

                    const childrenIds = getAllDescendants(id);

                    const finalNodes = updatedNodes.map(n => {
                        if (childrenIds.includes(n.id)) {
                            return { ...n, hidden: !isExpanded };
                        }
                        return n;
                    });

                    const layouted = calculateRadialLayout(finalNodes, get().edges);
                    set({ nodes: layouted.nodes });
                },

                deleteNode: (id) => {
                    if (id.endsWith('-inbox')) return;
                    set({ nodeToDelete: id });
                },

                setNodes: (nodes) => set({ nodes }),
                setEdges: (edges) => set({ edges }),

                onNodesChange: (changes: NodeChange[]) => {
                    set({
                        nodes: applyNodeChanges(changes, get().nodes) as LifeMapNode[],
                    });
                },

                onEdgesChange: (changes: EdgeChange[]) => {
                    set({
                        edges: applyEdgeChanges(changes, get().edges),
                    });
                },

                onConnect: (connection: Connection) => {
                    const newEdges = addEdge({ ...connection, type: 'smoothstep', animated: true }, get().edges);
                    set({ edges: newEdges });
                    const layouted = calculateRadialLayout(get().nodes, newEdges);
                    set({ nodes: layouted.nodes });
                },

                addInboxItem: (text: string) => set({
                    inbox: [{ id: `inbox-${Date.now()}`, text, createdAt: Date.now() }, ...get().inbox]
                }),

                removeInboxItem: (id: string) => set({
                    inbox: get().inbox.filter(item => item.id !== id)
                }),
            };
        },
        {
            name: 'pos-lifemap-storage-v10', // Changed storage key to force reset
        }
    )
);
