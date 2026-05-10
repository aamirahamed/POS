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

export const useLifeMapStore = create<LifeMapState>()(
    persist(
        (set, get) => {
            // Calculate initial layout to ensure sorting and zIndex are correct from start
            const { nodes: initNodes, edges: initEdges } = calculateRadialLayout(initialNodes, initialEdges);

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
                confirmDeleteNode: () => {
                    const state = get();
                    const id = state.nodeToDelete;
                    if (!id) return;

                    const edges = state.edges;
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
                                        { id: `task-${Date.now()}`, text, completed: false }
                                    ]
                                }
                            };
                        }
                        return node;
                    });

                    const layouted = calculateRadialLayout(nodes, get().edges);
                    set({ nodes: layouted.nodes, lastLayoutTrigger: Date.now() });
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
                },

                lastLayoutTrigger: 0,
                triggerLayout: () => {
                    const { nodes, edges } = get();
                    const layouted = calculateRadialLayout(nodes, edges);
                    set({ nodes: layouted.nodes, lastLayoutTrigger: Date.now() });
                },

                updateNode: (id, data) => set({
                    nodes: get().nodes.map((node) =>
                        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
                    ),
                }),

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

                deleteNode: (id) => set({ nodeToDelete: id }),

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
