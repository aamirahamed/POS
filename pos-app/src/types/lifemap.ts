import { Node, Edge } from '@xyflow/react';

export type NodeType = 'center' | 'pillar' | 'thread' | 'initiative' | 'subnode';

export type ResourceType = 'youtube' | 'article' | 'attachment' | 'link';

export interface Resource {
    id: string;
    title: string;
    url: string;
    type: ResourceType;
    fileName?: string;  // for file attachments
    fileSize?: number;  // bytes, for attachments
}

export interface LifeMapNode extends Node {
    type: NodeType;
    data: {
        label: string;
        description?: string;
        status?: 'active' | 'paused' | 'completed' | 'archived' | 'backlog';
        expanded?: boolean;
        parentId?: string;
        editing?: boolean;
        hue?: number;
        tasks?: { id: string; text: string; completed: boolean }[];
        priority?: 'low' | 'medium' | 'high';
        notes?: string;
        resources?: Resource[];
        lastUpdated?: number;
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
    addNode: (node: LifeMapNode) => void;
    updateNode: (id: string, data: Partial<LifeMapNode['data']>) => void;
    deleteNode: (id: string) => void;
    setNodes: (nodes: LifeMapNode[]) => void;
    setEdges: (edges: Edge[]) => void;

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
    addPillar: (label: string) => void;
    addThread: (parentId: string, label: string) => void;
    addInitiative: (parentId: string, label: string) => void;
    addSubnode: (parentId: string, label: string) => void;
    toggleNodeExpansion: (id: string) => void;

    // Task actions
    addTaskToNode: (nodeId: string, text: string) => void;
    toggleNodeTask: (nodeId: string, taskId: string) => void;
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
