import { LifeMapNode } from '@/types/lifemap';
import { Edge } from '@xyflow/react';

export const calculateRadialLayout = (nodes: LifeMapNode[], edges: Edge[]) => {
    // NOTE: This function name is kept as 'calculateRadialLayout' to minimize refactoring in other files,
    // but it now implements a TREE (Hierarchical) layout as per user request.

    const centerNode = nodes.find((n) => n.type === 'center');
    if (!centerNode) return { nodes, edges };

    // Hierarchy Configuration
    const LEVEL_HEIGHT = 200;
    const SIBLING_GAP = 50;
    const SUB_NODE_WIDTH = 120; // Approx visual width of subnode
    const THREAD_WIDTH = 160;   // Approx visual width of thread
    const PILLAR_WIDTH = 200;   // Approx visual width of pillar

    // We need to calculate the "subtree width" for each node to position them correctly without overlap.
    const getChildren = (nodeId: string) => {
        const childEdges = edges.filter(e => e.source === nodeId);
        const childIds = childEdges.map(e => e.target);
        return nodes.filter(n => childIds.includes(n.id));
    };

    // Recursive function to calculate subtree width
    // Returns { width: number } and attaches width to a temporary map if strictly needed, 
    // but we can just compute it on the fly or memoize.
    const getNodeWidth = (node: LifeMapNode): number => {
        const children = getChildren(node.id);
        if (children.length === 0) {
            if (node.type === 'subnode') return SUB_NODE_WIDTH;
            if (node.type === 'thread') return THREAD_WIDTH;
            return PILLAR_WIDTH;
        }

        let width = 0;
        children.forEach(child => {
            width += getNodeWidth(child);
        });

        // Add gaps between children
        width += (children.length - 1) * SIBLING_GAP;

        // Ensure parent is at least as wide as its own visual representation
        let minWidth = PILLAR_WIDTH;
        if (node.type === 'thread') minWidth = THREAD_WIDTH;
        if (node.type === 'subnode') minWidth = SUB_NODE_WIDTH;

        return Math.max(width, minWidth);
    };

    // Recursive function to set positions
    // x, y are the center coordinates for the node
    const layoutNode = (node: LifeMapNode, x: number, y: number, newNodes: LifeMapNode[]) => {
        // Update position
        const existingNode = newNodes.find(n => n.id === node.id);
        if (existingNode) {
            existingNode.position = { x, y };
        }

        const children = getChildren(node.id);
        if (children.length === 0) return;

        // let currentX = x - getNodeWidth(node) / 2;

        // We actually want to center the children. 
        // Logic: The center of the children group should align with X.
        // Total Children Width = Sum(ChildWidths) + Gaps.
        // StartX = X - TotalChildrenWidth / 2.

        let totalChildrenWidth = 0;
        const childWidths = children.map(c => getNodeWidth(c));
        totalChildrenWidth = childWidths.reduce((a, b) => a + b, 0) + (children.length - 1) * SIBLING_GAP;

        let startX = x - totalChildrenWidth / 2;

        children.forEach((child, index) => {
            const childW = childWidths[index];
            const childCenterX = startX + childW / 2;

            layoutNode(child, childCenterX, y + LEVEL_HEIGHT, newNodes);

            startX += childW + SIBLING_GAP;
        });
    };

    // Clone nodes to avoid mutation issues during calculation (though we mutate the clone)
    const processedNodes = nodes.map(n => ({ ...n }));

    // Start layout from Center
    const center = processedNodes.find(n => n.type === 'center');
    if (center) {
        // We set Center at (0, 0)
        layoutNode(center, 0, 0, processedNodes);
    }

    // 4. Assign zIndex and Sort
    // Hierarchy: Center (Top) > Pillar > Thread > Subnode (Bottom)
    const getZIndex = (type?: string) => {
        switch (type) {
            case 'center': return 100;
            case 'pillar': return 50;
            case 'thread': return 25;
            case 'subnode': return 10;
            default: return 1;
        }
    };

    const nodesWithZIndex = processedNodes.map(node => ({
        ...node,
        zIndex: getZIndex(node.type)
    }));

    nodesWithZIndex.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    return { nodes: nodesWithZIndex, edges };
};
