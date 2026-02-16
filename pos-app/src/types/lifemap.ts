import { Node, Edge } from '@xyflow/react';

export type NodeType = 'center' | 'pillar' | 'thread' | 'subnode';

export interface LifeMapNode extends Node {
    type: NodeType;
    data: {
        label: string;
        description?: string;
        status?: 'active' | 'paused' | 'completed' | 'archived';
        expanded?: boolean;
        parentId?: string;
        editing?: boolean;
        hue?: number; // 0-360 HSL hue value
        tasks?: { id: string; text: string; completed: boolean }[];
    };
}

export interface LifeMapState {
    nodes: LifeMapNode[];
    edges: Edge[];
    addNode: (node: LifeMapNode) => void;
    updateNode: (id: string, data: Partial<LifeMapNode['data']>) => void;
    deleteNode: (id: string) => void;
    setNodes: (nodes: LifeMapNode[]) => void;
    setEdges: (edges: Edge[]) => void;

    // Specialized actions
    addPillar: (label: string) => void;
    addThread: (parentId: string, label: string) => void;
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
}
