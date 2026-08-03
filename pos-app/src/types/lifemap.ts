import { Node, Edge } from '@xyflow/react';

export type NodeType = 'center' | 'domain' | 'project' | 'milestone';

export type LifeMapStatus = 'not_started' | 'in_progress' | 'blocked' | 'parked' | 'done' | 'dropped';

export interface LifeMapTask {
    id: string;
    text: string;
    completed: boolean; // Retained for backward compatibility
    status?: LifeMapStatus;
    type?: 'task' | 'decision' | 'idea' | 'bug';
    owner?: 'me' | 'claude';
    position?: number;
    createdAt?: number;
    updatedAt?: number;
    completedAt?: number | null;
}

export type ResourceType = 'youtube' | 'article' | 'attachment' | 'link';

export interface Resource {
    id: string;
    title: string;
    url: string;
    type: ResourceType;
    fileName?: string;  // for file attachments
    fileSize?: number;  // bytes, for attachments
    createdAt?: number; // for tracking capture time
}

export interface ContextCanvas {
    id: string;
    title: string;
    content: string;
    lastEdited: number;
}

export interface LifeMapNode extends Node {
    type: NodeType;
    data: {
        label: string;
        description?: string;
        status?: LifeMapStatus | 'active' | 'paused' | 'completed' | 'archived' | 'backlog';
        manual_status_override?: LifeMapStatus;
        expanded?: boolean;
        parentId?: string;
        editing?: boolean;
        hue?: number;
        tasks?: LifeMapTask[]; // Action items
        priority?: 'low' | 'medium' | 'high';
        notes?: string;
        contextRich?: string;
        canvases?: ContextCanvas[];
        resources?: Resource[];
        lastUpdated?: number;
        createdAt?: number;
        updatedAt?: number;
        completedAt?: number | null;
        position?: number;
        streak?: number;
    };
}

export interface InboxItem {
    id: string;
    text: string;
    createdAt: number;
}

export interface LifeMapState {
    nodes: LifeMapNode[];
    edges: Edge[];
    inbox: InboxItem[];
    focusedProjectId: string | null;
    
    addNode: (node: LifeMapNode) => void;
    updateNode: (id: string, data: Partial<LifeMapNode['data']>) => void;
    deleteNode: (id: string) => void;
    setNodes: (nodes: LifeMapNode[]) => void;
    setEdges: (edges: Edge[]) => void;
    setFocusedProject: (id: string | null) => void;

    // Drawer State
    selectedExecutionNodeId: string | null;
    setSelectedExecutionNodeId: (id: string | null) => void;
    nodeToDelete: string | null;
    setNodeToDelete: (id: string | null) => void;
    confirmDeleteNode: () => void;

    // Command Center
    isCommandCenterOpen: boolean;
    setCommandCenterOpen: (isOpen: boolean) => void;

    // Specialized actions
    addDomain: (label: string) => string;
    addProject: (parentId: string, label: string) => string;
    addMilestone: (parentId: string, label: string) => string;
    toggleNodeExpansion: (id: string) => void;
    collapseAll: () => void;
    expandAll: () => void;
    deleteNodeImmediately: (id: string) => void;
    moveNode: (id: string, newParentId: string) => void;
    renameNode: (id: string, label: string) => void;
    changeNodeType: (id: string, type: NodeType) => void;

    // Task / Action Item actions
    addTaskToNode: (nodeId: string, text: string) => void;
    toggleNodeTask: (nodeId: string, taskId: string) => void;
    deleteTaskFromNode: (nodeId: string, taskId: string) => void;
    editTaskInNode: (nodeId: string, taskId: string, newText: string) => void;
    lastLayoutTrigger: number;
    triggerLayout: () => void;

    onNodesChange: (changes: any) => void;
    onEdgesChange: (changes: any) => void;
    onConnect: (connection: any) => void;

    // DB sync
    loadFromDB: () => Promise<void>;

    // Resource actions
    addResource: (nodeId: string, resource: Resource) => void;
    removeResource: (nodeId: string, resourceId: string) => void;

    // Inbox actions
    addInboxItem: (text: string) => void;
    removeInboxItem: (id: string) => void;
}
