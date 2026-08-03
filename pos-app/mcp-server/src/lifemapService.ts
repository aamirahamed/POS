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

export const logActivity = async (
    nodeId: string | null,
    taskId: string | null,
    actor: 'me' | 'claude',
    action: string,
    detail: string
) => {
    const { error } = await supabase
        .from('lifemap_activity')
        .insert([{
            user_id: MCP_USER_ID,
            node_id: nodeId,
            task_id: taskId,
            actor,
            action,
            detail
        }]);
    if (error) {
        console.error('Failed to log activity:', error.message);
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
    await logActivity(projectId, null, 'claude', 'node_created', `Created project "${label}"`);
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
    await logActivity(milestoneId, null, 'claude', 'node_created', `Created milestone "${label}"`);
    return milestoneId;
};

export const addTaskToNode = async (
    nodeId: string, 
    taskText: string,
    type?: string,
    owner?: string,
    position?: number,
    external_key?: string
) => {
    const { id: mapId, nodes, edges } = await fetchLifeMap();
    
    let found = false;
    for (const node of nodes) {
        if (node.id === nodeId) {
            found = true;
            if (!node.data.tasks) node.data.tasks = [];
            
            // Idempotency check
            if (external_key && node.data.tasks.some((t: any) => t.external_key === external_key)) {
                return; // Already exists
            }

            node.data.tasks.push({
                id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                text: taskText,
                completed: false,
                status: 'not_started',
                createdAt: Date.now(),
                type: type || 'task',
                owner: owner || 'me',
                position: position !== undefined ? position : node.data.tasks.length,
                external_key
            });
            node.data.lastUpdated = Date.now();
            break;
        }
    }

    if (!found) throw new Error(`Node ${nodeId} not found`);

    await saveLifeMap(mapId, nodes, edges);
    await logActivity(nodeId, null, 'claude', 'task_added', `Added task "${taskText}"`);
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
    await logActivity(domainId, null, 'claude', 'node_created', `Created domain "${label}"`);
    return domainId;
};

export const updateNode = async (
    nodeId: string, 
    label?: string, 
    status?: string,
    manual_status_override?: boolean,
    kind?: string,
    repo_url?: string,
    position?: { x: number; y: number }
) => {
    const { id: mapId, nodes, edges } = await fetchLifeMap();
    
    let found = false;
    for (const node of nodes) {
        if (node.id === nodeId) {
            found = true;
            if (label !== undefined) node.data.label = label;
            if (status !== undefined) node.data.status = status;
            if (manual_status_override !== undefined) node.data.manual_status_override = manual_status_override;
            if (kind !== undefined) node.data.kind = kind;
            if (repo_url !== undefined) node.data.repo_url = repo_url;
            if (position !== undefined) node.position = position;
            break;
        }
    }

    if (!found) throw new Error(`Node ${nodeId} not found`);
    await saveLifeMap(mapId, nodes, edges);
    
    let detail = `Updated node`;
    if (label && status) detail = `Updated node label to "${label}" and status to "${status}"`;
    else if (label) detail = `Renamed node to "${label}"`;
    else if (status) detail = `Changed node status to "${status}"`;
    await logActivity(nodeId, null, 'claude', 'node_updated', detail);
};

export const updateTask = async (
    nodeId: string, 
    taskId: string, 
    text?: string, 
    completed?: boolean,
    status?: string,
    type?: string,
    owner?: string,
    position?: number
) => {
    const { id: mapId, nodes, edges } = await fetchLifeMap();
    
    let found = false;
    for (const node of nodes) {
        if (node.id === nodeId && node.data.tasks) {
            for (const task of node.data.tasks) {
                if (task.id === taskId) {
                    found = true;
                    if (text !== undefined) task.text = text;
                    
                    // Map legacy completed to status done and vice versa
                    if (completed !== undefined) {
                        task.completed = completed;
                        if (!status) task.status = completed ? 'done' : 'not_started';
                    }
                    if (status !== undefined) {
                        task.status = status;
                        if (completed === undefined) {
                            task.completed = status === 'done';
                        }
                    }
                    
                    if (type !== undefined) task.type = type;
                    if (owner !== undefined) task.owner = owner;
                    if (position !== undefined) task.position = position;
                    task.updatedAt = Date.now();
                    if (task.completed) task.completedAt = task.completedAt || Date.now();

                    break;
                }
            }
        }
        if (found) break;
    }

    if (!found) throw new Error(`Task ${taskId} in Node ${nodeId} not found`);
    await saveLifeMap(mapId, nodes, edges);

    let detail = `Updated task`;
    if (text !== undefined && completed !== undefined) detail = `Updated task text to "${text}" and completion to ${completed}`;
    else if (text !== undefined) detail = `Updated task text to "${text}"`;
    else if (completed !== undefined) detail = `Changed task completion to ${completed}`;
    await logActivity(nodeId, taskId, 'claude', 'task_updated', detail);
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
    await logActivity(nodeId, null, 'claude', 'node_deleted', `Deleted node and ${nodesToDelete.length - 1} descendants`);
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
    await logActivity(nodeId, taskId, 'claude', 'task_deleted', `Deleted task`);
};

export const getProject = async (projectId: string) => {
    const { nodes, edges } = await fetchLifeMap();
    const project = nodes.find(n => n.id === projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);
    
    const milestones = nodes.filter(n => n.data.parentId === projectId && n.type === 'milestone');
    
    return {
        id: project.id,
        label: project.data.label,
        type: 'project',
        status: project.data.status,
        milestones: milestones.map(m => ({
            id: m.id,
            label: m.data.label,
            status: m.data.status,
            tasks: m.data.tasks || []
        }))
    };
};

export const getActivity = async (limit: number = 50, projectId?: string, actor?: string) => {
    let query = supabase.from('lifemap_activity').select('*').eq('user_id', MCP_USER_ID).order('created_at', { ascending: false }).limit(limit);
    if (actor) query = query.eq('actor', actor);
    // projectId filtering would require joining or recursive lookup since node_id might be a milestone under the project
    // For simplicity, we just return the raw node_id
    
    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch activity: ${error.message}`);
    return data;
};

export const searchMap = async (query: string, projectId?: string) => {
    const { nodes } = await fetchLifeMap();
    const q = query.toLowerCase();
    
    const results: any[] = [];
    for (const node of nodes) {
        if (node.data.label?.toLowerCase().includes(q)) {
            results.push({ type: 'node', id: node.id, label: node.data.label, nodeType: node.type });
        }
        if (node.data.tasks) {
            for (const task of node.data.tasks) {
                if (task.text.toLowerCase().includes(q)) {
                    results.push({ type: 'task', id: task.id, nodeId: node.id, text: task.text, status: task.status });
                }
            }
        }
    }
    return results;
};

export const getNeedsYou = async () => {
    const { nodes } = await fetchLifeMap();
    const needsYou: any[] = [];
    
    for (const node of nodes) {
        if (node.data.tasks) {
            for (const task of node.data.tasks) {
                if (
                    task.status === 'blocked' || 
                    task.type === 'decision' || 
                    (task.owner === 'me' && task.status !== 'done' && task.status !== 'dropped' && task.status !== 'parked')
                ) {
                    needsYou.push({
                        nodeId: node.id,
                        nodeLabel: node.data.label,
                        taskId: task.id,
                        text: task.text,
                        status: task.status,
                        type: task.type,
                        owner: task.owner
                    });
                }
            }
        }
    }
    return needsYou;
};

export const createSubtree = async (parentId: string, newNodes: any[]) => {
    const { id: mapId, nodes, edges } = await fetchLifeMap();
    
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) throw new Error(`Parent node ${parentId} not found`);

    let currentY = 0;
    const addedIds: string[] = [];

    for (const item of newNodes) {
        const isProject = item.type === 'project';
        const isMilestone = item.type === 'milestone';
        
        if (!isProject && !isMilestone) continue;
        
        const newNodeId = `${isProject ? 'pjt' : 'm'}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        addedIds.push(newNodeId);
        
        const newNode: LifeMapNode = {
            id: newNodeId,
            type: item.type,
            position: { x: 0, y: currentY },
            data: {
                label: item.label,
                parentId: parentId,
                expanded: isProject,
                hue: parent.data.hue || 210,
                status: 'not_started',
                tasks: (item.tasks || []).map((t: any, i: number) => ({
                    id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}-${i}`,
                    text: t.text,
                    completed: false,
                    status: 'not_started',
                    type: t.type || 'task',
                    owner: t.owner || 'claude',
                    createdAt: Date.now()
                }))
            },
            zIndex: isProject ? 15 : 20
        };
        
        const newEdge: Edge = {
            id: `e-${parentId}-${newNodeId}`,
            source: parentId,
            target: newNodeId,
            type: 'smoothstep',
            animated: false,
            zIndex: 3,
            sourceHandle: 'source-bottom',
            targetHandle: 'target-top'
        };
        
        nodes.push(newNode);
        edges.push(newEdge);
        currentY += 100;
    }

    await saveLifeMap(mapId, nodes, edges);
    await logActivity(parentId, null, 'claude', 'subtree_created', `Created ${newNodes.length} nested nodes`);
    return addedIds;
};

export const applyTemplate = async (templateName: string, label: string, parentId: string) => {
    if (templateName === 'software_build') {
        const nodes = [
            {
                type: 'project',
                label: label,
                tasks: []
            }
        ];
        // In a real implementation we'd create the project, then the milestones inside it.
        // For simplicity, we just create the project, then call createSubtree again for the milestones.
        const [projectId] = await createSubtree(parentId, nodes);
        
        const milestones = [
            { type: 'milestone', label: '1. Discovery & Design', tasks: [{text: 'Define requirements', owner: 'me'}, {text: 'Create technical plan'}] },
            { type: 'milestone', label: '2. Core Implementation', tasks: [{text: 'Setup repository'}, {text: 'Implement core logic'}] },
            { type: 'milestone', label: '3. Testing & Polish', tasks: [{text: 'Write unit tests'}, {text: 'Fix bugs', type: 'bug'}] },
            { type: 'milestone', label: '4. Deployment', tasks: [{text: 'Setup CI/CD'}, {text: 'Deploy to production'}] }
        ];
        await createSubtree(projectId, milestones);
        return projectId;
    }
    throw new Error(`Unknown template: ${templateName}`);
};
