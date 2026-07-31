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
export const debouncedSync = (nodes: LifeMapNode[], edges: any[]) => {
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
        type: 'domain',
        position: { x: 0, y: -200 },
        data: { label: 'Health', expanded: true, hue: 150 }, // Green
        zIndex: 50,
    },
    {
        id: 'p2',
        type: 'domain',
        position: { x: 200, y: 0 },
        data: { label: 'Career', expanded: true, hue: 210 }, // Blue
        zIndex: 50,
    },
    {
        id: 'p3',
        type: 'domain',
        position: { x: 0, y: 200 },
        data: { label: 'Relationships', expanded: true, hue: 330 }, // Pink
        zIndex: 50,
    },
    {
        id: 'p4',
        type: 'domain',
        position: { x: -200, y: 0 },
        data: { label: 'Growth', expanded: true, hue: 40 }, // Amber
        zIndex: 50,
    },
];

const initialEdges = [
    { id: 'e1', source: 'center', target: 'p1', type: 'step', animated: false, zIndex: 10, sourceHandle: 'source-bottom', targetHandle: 'target-top' },
    { id: 'e2', source: 'center', target: 'p2', type: 'step', animated: false, zIndex: 10, sourceHandle: 'source-bottom', targetHandle: 'target-top' },
    { id: 'e3', source: 'center', target: 'p3', type: 'step', animated: false, zIndex: 10, sourceHandle: 'source-bottom', targetHandle: 'target-top' },
    { id: 'e4', source: 'center', target: 'p4', type: 'step', animated: false, zIndex: 10, sourceHandle: 'source-bottom', targetHandle: 'target-top' },
];

export const migrateNodesAndEdges = (nodes: any[], edges: any[]): { nodes: LifeMapNode[], edges: any[] } => {
    // Check if migration is needed (checks for presence of 'thread' or old types)
    const hasThread = nodes.some(n => n.type === 'thread');
    const hasOldTypes = nodes.some(n => n.type === 'pillar' || n.type === 'initiative' || n.type === 'subnode');

    if (!hasThread && !hasOldTypes) {
        return { nodes: nodes as LifeMapNode[], edges };
    }

    console.log("Migrating Life Map data to 4-level PM Standard structure...");

    const parentMap: Record<string, string> = {};
    const typeMap: Record<string, string> = {};
    nodes.forEach(n => {
        parentMap[n.id] = n.data?.parentId || '';
        typeMap[n.id] = n.type;
    });

    const threadNodes = nodes.filter(n => n.type === 'thread');
    const threadIds = new Set(threadNodes.map(n => n.id));

    const getNewParent = (parentId: string): string => {
        if (!parentId) return '';
        if (threadIds.has(parentId)) {
            const threadParent = parentMap[parentId];
            return threadParent || 'center';
        }
        return parentId;
    };

    // Filter out threads and update type names + parentIds
    const migratedNodes = nodes
        .filter(n => n.type !== 'thread')
        .map(n => {
            const currentType = n.type;
            let newType = currentType;
            if (currentType === 'pillar') newType = 'domain';
            if (currentType === 'initiative') newType = 'project';
            if (currentType === 'subnode') newType = 'milestone';

            const parentId = n.data?.parentId || '';
            const newParentId = getNewParent(parentId);

            return {
                ...n,
                type: newType,
                data: {
                    ...n.data,
                    parentId: newParentId
                }
            };
        });

    const migratedEdges: any[] = [];
    const addedEdges = new Set<string>();

    edges.forEach(edge => {
        const sourceIsThread = threadIds.has(edge.source);
        const targetIsThread = threadIds.has(edge.target);

        if (sourceIsThread && targetIsThread) return;
        if (targetIsThread) return;

        if (sourceIsThread) {
            // Relink Thread -> Initiative to Pillar/Domain -> Project
            const threadParent = parentMap[edge.source];
            const targetNode = edge.target;
            if (threadParent && targetNode) {
                const newEdgeId = `e-${threadParent}-${targetNode}`;
                if (!addedEdges.has(newEdgeId)) {
                    migratedEdges.push({
                        ...edge,
                        id: newEdgeId,
                        source: threadParent,
                        target: targetNode
                    });
                    addedEdges.add(newEdgeId);
                }
            }
            return;
        }

        let newSource = edge.source;
        let newTarget = edge.target;

        const newEdgeId = `e-${newSource}-${newTarget}`;
        if (!addedEdges.has(newEdgeId)) {
            migratedEdges.push({
                ...edge,
                id: newEdgeId,
                source: newSource,
                target: newTarget
            });
            addedEdges.add(newEdgeId);
        }
    });

    return calculateRadialLayout(migratedNodes as LifeMapNode[], migratedEdges);
};

const ensureInboxExists = (nodes: LifeMapNode[], edges: any[]): { nodes: LifeMapNode[], edges: any[] } => {
    let newNodes = [...nodes];
    let newEdges = [...edges];
    let changed = false;

    // 1. Ensure domain-inbox (old pillar-inbox)
    const domainIdx = newNodes.findIndex(n => n.id === 'domain-inbox' || n.id === 'pillar-inbox');
    let domainId = 'domain-inbox';
    if (domainIdx === -1) {
        newNodes.push({
            id: 'domain-inbox',
            type: 'domain',
            position: { x: -350, y: 0 },
            data: { label: 'Inbox', expanded: true, hue: 240 },
            zIndex: 50,
        });
        changed = true;
    } else {
        domainId = newNodes[domainIdx].id;
        if (newNodes[domainIdx].type !== 'domain') {
            newNodes[domainIdx].type = 'domain';
            changed = true;
        }
    }

    // 2. Ensure project-inbox (old initiative-inbox)
    const projectIdx = newNodes.findIndex(n => n.id === 'project-inbox' || n.id === 'initiative-inbox');
    let projectId = 'project-inbox';
    if (projectIdx === -1) {
        newNodes.push({
            id: 'project-inbox',
            type: 'project',
            position: { x: -350, y: 280 },
            data: { label: 'Inbox Focus', parentId: domainId, expanded: true, hue: 240, status: 'active' },
            zIndex: 30,
        });
        changed = true;
    } else {
        projectId = newNodes[projectIdx].id;
        if (newNodes[projectIdx].type !== 'project' || newNodes[projectIdx].data.parentId !== domainId) {
            newNodes[projectIdx].type = 'project';
            newNodes[projectIdx].data.parentId = domainId;
            changed = true;
        }
    }

    // 3. Ensure milestone-inbox (old subnode-inbox)
    const milestoneIdx = newNodes.findIndex(n => n.id === 'milestone-inbox' || n.id === 'subnode-inbox');
    let milestoneId = 'milestone-inbox';
    if (milestoneIdx === -1) {
        newNodes.push({
            id: 'milestone-inbox',
            type: 'milestone',
            position: { x: -350, y: 560 },
            data: {
                label: 'Quick Captures',
                parentId: projectId,
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
    } else {
        milestoneId = newNodes[milestoneIdx].id;
        if (newNodes[milestoneIdx].type !== 'milestone' || newNodes[milestoneIdx].data.parentId !== projectId) {
            newNodes[milestoneIdx].type = 'milestone';
            newNodes[milestoneIdx].data.parentId = projectId;
            changed = true;
        }
    }

    // Remove any leftover thread-inbox
    const oldThreadInboxIdx = newNodes.findIndex(n => n.id === 'thread-inbox');
    if (oldThreadInboxIdx !== -1) {
        newNodes.splice(oldThreadInboxIdx, 1);
        changed = true;
    }

    // 4. Ensure required edges
    const requiredEdges = [
        { id: `e-center-${domainId}`, source: 'center', target: domainId, type: 'step', animated: false, zIndex: 10, sourceHandle: 'source-bottom', targetHandle: 'target-top' },
        { id: `e-${domainId}-${projectId}`, source: domainId, target: projectId, type: 'step', animated: false, zIndex: 5, sourceHandle: 'source-bottom', targetHandle: 'target-top' },
        { id: `e-${projectId}-${milestoneId}`, source: projectId, target: milestoneId, type: 'default', animated: false, zIndex: 1, sourceHandle: 'source-bottom', targetHandle: 'target-top' }
    ];

    // Remove old inbox edges
    newEdges = newEdges.filter(e => 
        e.id !== 'e-center-pillar-inbox' && 
        e.id !== 'e-pillar-inbox-thread-inbox' && 
        e.id !== 'e-thread-inbox-initiative-inbox' && 
        e.id !== 'e-initiative-inbox-subnode-inbox'
    );

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

                // Load from Supabase on app start (falls back to localStorage, or seeds DB if DB is empty)
                loadFromDB: async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    const map = await fetchLifeMap(user.id);
                    if (map?.nodes?.length) {
                        const migrated = migrateNodesAndEdges(map.nodes, map.edges || []);
                        const { nodes: layoutedNodes, edges: layoutedEdges } = ensureInboxExists(migrated.nodes, migrated.edges);
                        set({ nodes: layoutedNodes, edges: layoutedEdges });
                        
                        // Force a sync back to Supabase to persist the migrated state
                        await saveLifeMap(user.id, layoutedNodes, layoutedEdges);
                    } else {
                        // DB has no saved map for this user yet.
                        // If current local state has rich data, seed Supabase with it!
                        const { nodes, edges } = get();
                        if (nodes && nodes.length > 0) {
                            await saveLifeMap(user.id, nodes, edges);
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
                    immediateSync(layouted.nodes, newEdges);
                },

                addNode: (node) => {
                    const newNodes = [...get().nodes, node];
                    const layouted = calculateRadialLayout(newNodes, get().edges);
                    set({ nodes: layouted.nodes });
                },

                addDomain: (label) => {
                    const id = `d-${Date.now()}`;

                    // Assign next hue
                    const currentDomains = get().nodes.filter(n => n.type === 'domain');
                    const hueIndex = currentDomains.length % PILLAR_HUES.length;
                    const hue = PILLAR_HUES[hueIndex];

                    const newDomain: LifeMapNode = {
                        id,
                        type: 'domain',
                        position: { x: 0, y: 0 },
                        data: { label, expanded: true, hue },
                        zIndex: 50,
                    };
                    const newEdge = {
                        id: `e-center-${id}`,
                        source: 'center',
                        target: id,
                        type: 'step',
                        animated: false,
                        zIndex: 10,
                        sourceHandle: 'source-bottom',
                        targetHandle: 'target-top'
                    };

                    const newNodes = [...get().nodes, newDomain];
                    const newEdges = [...get().edges, newEdge];
                    const layouted = calculateRadialLayout(newNodes, newEdges);

                    set({ nodes: layouted.nodes, edges: newEdges });
                    immediateSync(layouted.nodes, newEdges);
                    return id;
                },

                addProject: (parentId, label) => {
                    const id = `pjt-${Date.now()}`;
                    const isNew = label === "";

                    const parent = get().nodes.find(n => n.id === parentId);
                    const hue = parent?.data.hue || 210;

                    const newProject: LifeMapNode = {
                        id,
                        type: 'project',
                        position: { x: 0, y: 0 },
                        data: {
                            label: isNew ? "New Project" : label,
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

                    const newNodes = [...get().nodes, newProject];
                    const newEdges = [...get().edges, newEdge];
                    const layouted = calculateRadialLayout(newNodes, newEdges);

                    set({ nodes: layouted.nodes, edges: newEdges });
                    immediateSync(layouted.nodes, newEdges);
                    return id;
                },

                addMilestone: (parentId, label) => {
                    const id = `m-${Date.now()}`;
                    const isNew = label === "";

                    const parent = get().nodes.find(n => n.id === parentId);
                    const hue = parent?.data.hue || 210; // Inherit parent hue directly

                    const newMilestone: LifeMapNode = {
                        id,
                        type: 'milestone',
                        position: { x: 0, y: 0 },
                        data: {
                            label: isNew ? "New Milestone" : label,
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

                    const newNodes = [...get().nodes, newMilestone];
                    const newEdges = [...get().edges, newEdge];
                    const layouted = calculateRadialLayout(newNodes, newEdges);

                    set({ nodes: layouted.nodes, edges: newEdges });
                    immediateSync(layouted.nodes, newEdges);
                    return id;
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
                    immediateSync(layouted.nodes, get().edges);
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
                    immediateSync(nodes, get().edges);
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
                    immediateSync(nodes, get().edges);
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
                    immediateSync(nodes, get().edges);
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
                    immediateSync(nodes, get().edges);
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

                collapseAll: () => {
                    const nodes = get().nodes;
                    const finalNodes = nodes.map(n => {
                        if (n.type === 'domain' || n.type === 'project') {
                            return { ...n, data: { ...n.data, expanded: false }, hidden: n.type === 'project' };
                        }
                        if (n.type === 'milestone') {
                            return { ...n, hidden: true };
                        }
                        return n;
                    });
                    const layouted = calculateRadialLayout(finalNodes, get().edges);
                    set({ nodes: layouted.nodes });
                },

                expandAll: () => {
                    const nodes = get().nodes;
                    const finalNodes = nodes.map(n => ({
                        ...n,
                        data: (n.type === 'domain' || n.type === 'project') ? { ...n.data, expanded: true } : n.data,
                        hidden: false,
                    }));
                    const layouted = calculateRadialLayout(finalNodes, get().edges);
                    set({ nodes: layouted.nodes });
                },


                deleteNode: (id) => {
                    if (id.endsWith('-inbox')) return;
                    set({ nodeToDelete: id });
                },

                deleteNodeImmediately: (id) => {
                    if (id.endsWith('-inbox')) return;
                    const state = get();
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
                    set({ nodes: layouted.nodes, edges: newEdges });
                    immediateSync(newNodes, newEdges);
                },

                moveNode: (id, newParentId) => {
                    if (id.endsWith('-inbox')) return;
                    const state = get();
                    const nodes = state.nodes.map(node => {
                        if (node.id === id) {
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    parentId: newParentId
                                }
                            };
                        }
                        return node;
                    });

                    const edges = state.edges.map(edge => {
                        if (edge.target === id) {
                            return {
                                ...edge,
                                id: `e-${newParentId}-${id}`,
                                source: newParentId
                            };
                        }
                        return edge;
                    });

                    const layouted = calculateRadialLayout(nodes, edges);
                    set({ nodes: layouted.nodes, edges });
                    immediateSync(nodes, edges);
                },

                renameNode: (id, label) => {
                    if (id.endsWith('-inbox')) return;
                    const state = get();
                    const nodes = state.nodes.map(node => {
                        if (node.id === id) {
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    label
                                }
                            };
                        }
                        return node;
                    });
                    set({ nodes });
                    immediateSync(nodes, state.edges);
                },

                changeNodeType: (id, type) => {
                    if (id.endsWith('-inbox')) return;
                    const state = get();
                    let newEdges = [...state.edges];
                    
                    const nodes = state.nodes.map(node => {
                        if (node.id === id) {
                            let newParentId = node.data.parentId;

                            // Enforce hierarchy when changing types
                            if (type === 'project') {
                                // A project must be under a domain.
                                const currentParent = state.nodes.find(n => n.id === newParentId);
                                if (currentParent && currentParent.type !== 'domain') {
                                    // If current parent is not a domain, move it to the grandparent
                                    if (currentParent.data?.parentId) {
                                        newParentId = currentParent.data.parentId;
                                    } else {
                                        newParentId = 'center'; // fallback
                                    }
                                }
                            } else if (type === 'domain') {
                                // A domain must be under center
                                newParentId = 'center';
                            }
                            
                            // Ensure newParentId is always a string for edges
                            newParentId = newParentId || 'center';
                            
                            // Update the edge to point to the new parent if it changed
                            if (newParentId !== node.data.parentId) {
                                newEdges = newEdges.filter(e => e.target !== id);
                                newEdges.push({
                                    id: `e-${newParentId}-${id}`,
                                    source: newParentId,
                                    target: id,
                                    type: 'smoothstep',
                                    animated: false,
                                    style: { stroke: 'rgba(255,255,255,0.2)', strokeWidth: 2 }
                                });
                            }

                            return {
                                ...node,
                                type,
                                data: {
                                    ...node.data,
                                    parentId: newParentId
                                }
                            };
                        }
                        return node;
                    });
                    
                    const layouted = calculateRadialLayout(nodes, newEdges);
                    set({ nodes: layouted.nodes, edges: newEdges });
                    immediateSync(layouted.nodes, newEdges);
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
                    const newEdges = addEdge({ ...connection, type: 'step', animated: false }, get().edges);
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
            name: 'pos-lifemap-storage-v11', // Changed storage key to force reset / refresh
        }
    )
);
