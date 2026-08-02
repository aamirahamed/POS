import { supabase, MCP_USER_ID } from './supabase.js';

export interface LifeMapNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: any;
    zIndex?: number;
}

export interface Edge {
    id: string;
    source: string;
    target: string;
    type?: string;
    animated?: boolean;
    zIndex?: number;
    sourceHandle?: string;
    targetHandle?: string;
}

export const fetchLifeMap = async () => {
    const { data, error } = await supabase
        .from('life_maps')
        .select('*')
        .eq('user_id', MCP_USER_ID)
        .single();

    if (error) {
        throw new Error(`Failed to fetch life map: ${error.message}`);
    }

    return data as { id: string; nodes: LifeMapNode[]; edges: Edge[] };
};

export const saveLifeMap = async (id: string, nodes: LifeMapNode[], edges: Edge[]) => {
    const { error } = await supabase
        .from('life_maps')
        .update({ nodes, edges, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) {
        throw new Error(`Failed to save life map: ${error.message}`);
    }
};

export const createProject = async (parentId: string, label: string) => {
    const { id: mapId, nodes, edges } = await fetchLifeMap();
    
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) throw new Error(`Parent node ${parentId} not found`);

    const projectId = `pjt-${Date.now()}`;
    const hue = parent.data?.hue || 210;

    const newProject: LifeMapNode = {
        id: projectId,
        type: 'project',
        position: { x: 0, y: 0 },
        data: {
            label,
            parentId,
            expanded: true,
            editing: false,
            hue,
            status: 'backlog'
        },
        zIndex: 15,
    };

    const newEdge: Edge = {
        id: `e-${parentId}-${projectId}`,
        source: parentId,
        target: projectId,
        type: 'smoothstep',
        animated: false,
        zIndex: 3,
        sourceHandle: 'source-bottom',
        targetHandle: 'target-top'
    };

    nodes.push(newProject);
    edges.push(newEdge);

    await saveLifeMap(mapId, nodes, edges);
    return projectId;
};

export const createMilestone = async (parentId: string, label: string) => {
    const { id: mapId, nodes, edges } = await fetchLifeMap();
    
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) throw new Error(`Parent node ${parentId} not found`);

    const milestoneId = `m-${Date.now()}`;
    const hue = parent.data?.hue || 210;

    const newMilestone: LifeMapNode = {
        id: milestoneId,
        type: 'milestone',
        position: { x: 0, y: 0 },
        data: {
            label,
            parentId,
            expanded: false,
            editing: false,
            hue,
            tasks: [],
            resources: []
        },
        zIndex: 20,
    };

    const newEdge: Edge = {
        id: `e-${parentId}-${milestoneId}`,
        source: parentId,
        target: milestoneId,
        type: 'smoothstep',
        animated: false,
        zIndex: 4,
        sourceHandle: 'source-bottom',
        targetHandle: 'target-top'
    };

    nodes.push(newMilestone);
    edges.push(newEdge);

    await saveLifeMap(mapId, nodes, edges);
    return milestoneId;
};

export const addTaskToNode = async (nodeId: string, taskText: string) => {
    const { id: mapId, nodes, edges } = await fetchLifeMap();
    
    let found = false;
    for (const node of nodes) {
        if (node.id === nodeId) {
            found = true;
            if (!node.data.tasks) node.data.tasks = [];
            node.data.tasks.push({
                id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                text: taskText,
                completed: false,
                createdAt: Date.now()
            });
            node.data.lastUpdated = Date.now();
            break;
        }
    }

    if (!found) throw new Error(`Node ${nodeId} not found`);

    await saveLifeMap(mapId, nodes, edges);
};

const PILLAR_HUES = [210, 270, 330, 40, 150, 180, 30, 240];

export const createDomain = async (label: string) => {
    const { id: mapId, nodes, edges } = await fetchLifeMap();
    
    const domainId = `d-${Date.now()}`;
    const currentDomains = nodes.filter(n => n.type === 'domain');
    const hueIndex = currentDomains.length % PILLAR_HUES.length;
    const hue = PILLAR_HUES[hueIndex];

    const newDomain: LifeMapNode = {
        id: domainId,
        type: 'domain',
        position: { x: 0, y: 0 },
        data: { label, expanded: true, hue },
        zIndex: 50,
    };

    const newEdge: Edge = {
        id: `e-center-${domainId}`,
        source: 'center',
        target: domainId,
        type: 'step',
        animated: false,
        zIndex: 10,
        sourceHandle: 'source-bottom',
        targetHandle: 'target-top'
    };

    nodes.push(newDomain);
    edges.push(newEdge);

    await saveLifeMap(mapId, nodes, edges);
    return domainId;
};

export const updateNode = async (nodeId: string, label?: string, status?: string) => {
    const { id: mapId, nodes, edges } = await fetchLifeMap();
    
    let found = false;
    for (const node of nodes) {
        if (node.id === nodeId) {
            found = true;
            if (label !== undefined) node.data.label = label;
            if (status !== undefined) node.data.status = status;
            break;
        }
    }

    if (!found) throw new Error(`Node ${nodeId} not found`);
    await saveLifeMap(mapId, nodes, edges);
};

export const updateTask = async (nodeId: string, taskId: string, text?: string, completed?: boolean) => {
    const { id: mapId, nodes, edges } = await fetchLifeMap();
    
    let found = false;
    for (const node of nodes) {
        if (node.id === nodeId && node.data.tasks) {
            for (const task of node.data.tasks) {
                if (task.id === taskId) {
                    found = true;
                    if (text !== undefined) task.text = text;
                    if (completed !== undefined) task.completed = completed;
                    break;
                }
            }
        }
        if (found) break;
    }

    if (!found) throw new Error(`Task ${taskId} in Node ${nodeId} not found`);
    await saveLifeMap(mapId, nodes, edges);
};

export const deleteNode = async (nodeId: string) => {
    const { id: mapId, nodes, edges } = await fetchLifeMap();
    
    // Find all descendants
    const getAllDescendants = (id: string): string[] => {
        const children = edges.filter(e => e.source === id).map(e => e.target);
        let descendants = [...children];
        for (const childId of children) {
            descendants = descendants.concat(getAllDescendants(childId));
        }
        return descendants;
    };

    const nodesToDelete = [nodeId, ...getAllDescendants(nodeId)];
    
    const newNodes = nodes.filter(n => !nodesToDelete.includes(n.id));
    const newEdges = edges.filter(e => !nodesToDelete.includes(e.source) && !nodesToDelete.includes(e.target));

    if (newNodes.length === nodes.length) {
        throw new Error(`Node ${nodeId} not found`);
    }

    await saveLifeMap(mapId, newNodes, newEdges);
};

export const deleteTask = async (nodeId: string, taskId: string) => {
    const { id: mapId, nodes, edges } = await fetchLifeMap();
    
    let found = false;
    for (const node of nodes) {
        if (node.id === nodeId && node.data.tasks) {
            const initialLength = node.data.tasks.length;
            node.data.tasks = node.data.tasks.filter((t: any) => t.id !== taskId);
            if (node.data.tasks.length < initialLength) found = true;
            break;
        }
    }

    if (!found) throw new Error(`Task ${taskId} in Node ${nodeId} not found`);
    await saveLifeMap(mapId, nodes, edges);
};
