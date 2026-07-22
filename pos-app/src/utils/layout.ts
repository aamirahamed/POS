import { LifeMapNode } from '@/types/lifemap';
import { Edge } from '@xyflow/react';

export const calculateRadialLayout = (nodes: LifeMapNode[], edges: Edge[]) => {
    // This function implements a highly structured Top-Down Tree Layout
    // (Name kept as 'calculateRadialLayout' to prevent breaking store imports)

    const centerNode = nodes.find((n) => n.type === 'center');
    if (!centerNode) return { nodes, edges };

    // Hierarchy Spacing Configuration
    const LEVEL_HEIGHT = 280; // Vertical breathing room between L1, L2, L3, L4, L5
    const SIBLING_GAP = 120; // Generous horizontal spacing to prevent overlap

    // Visual dimensions mapping to prevent overlap
    const NODE_WIDTHS: Record<string, number> = {
        'center': 100,
        'domain': 160,
        'pillar': 160, // Fallback for migration
        'thread': 140, // Fallback for migration
        'project': 150,
        'initiative': 150, // Fallback for migration
        'milestone': 300,
        'subnode': 300, // Fallback for migration
    };

    // Helper: Find active children (ignore hidden nodes if collapsed)
    const getVisibleChildren = (nodeId: string, currentNodes: LifeMapNode[]) => {
        const childEdges = edges.filter(e => e.source === nodeId);
        const childIds = childEdges.map(e => e.target);
        // Only return children that actually exist in the current visible node array and are not explicitly hidden
        return currentNodes.filter(n => childIds.includes(n.id) && !n.hidden);
    };

    // Step 1: Calculate the exact bounding width required for each node's entire subtree
    const subtreeWidths = new Map<string, number>();

    const calculateSubtreeWidth = (node: LifeMapNode, currentNodes: LifeMapNode[]): number => {
        const children = getVisibleChildren(node.id, currentNodes);
        const selfWidth = NODE_WIDTHS[node.type] || 200;

        if (children.length === 0) {
            subtreeWidths.set(node.id, selfWidth);
            return selfWidth;
        }

        let totalChildrenWidth = 0;
        children.forEach(child => {
            totalChildrenWidth += calculateSubtreeWidth(child, currentNodes);
        });

        // Add the gaps between children
        totalChildrenWidth += (children.length - 1) * SIBLING_GAP;

        // The subtree width is whichever is larger: the parent itself, or all its children + gaps
        const finalWidth = Math.max(selfWidth, totalChildrenWidth);
        subtreeWidths.set(node.id, finalWidth);

        return finalWidth;
    };

    // Calculate subtree widths starting from center
    calculateSubtreeWidth(centerNode, nodes);

    // Step 2: Position nodes recursively using calculated widths
    const layoutNode = (node: LifeMapNode, x: number, y: number, newNodes: LifeMapNode[]) => {
        const existingNode = newNodes.find(n => n.id === node.id);
        if (existingNode) {
            existingNode.position = { x, y };
        }

        const children = getVisibleChildren(node.id, newNodes);
        if (children.length === 0) return;

        // Calculate starting X so that all children are perfectly centered below the parent
        const childWidths = children.map(c => subtreeWidths.get(c.id) || (NODE_WIDTHS[c.type] || 200));
        const totalChildrenWidth = childWidths.reduce((a, b) => a + b, 0) + (children.length - 1) * SIBLING_GAP;
        
        let currentX = x - (totalChildrenWidth / 2);

        children.forEach((child, index) => {
            const childW = childWidths[index];
            // The center of this child's subtree is currentX + half its width
            const childCenterX = currentX + (childW / 2);

            layoutNode(child, childCenterX, y + LEVEL_HEIGHT, newNodes);

            // Move X pointer past this child's entire subtree block and add a gap for the next sibling
            currentX += childW + SIBLING_GAP;
        });
    };

    // Deep clone to safely mutate positions
    const processedNodes = nodes.map(n => ({ ...n }));

    // Position center at absolute center
    layoutNode(centerNode, 0, 0, processedNodes);

    // Step 3: Enforce strict Z-Index Hierarchy (L1 > L2 > L3 > L4)
    // This ensures higher level nodes appear visually above lower ones and connectors tuck underneath
    const getZIndex = (type?: string) => {
        switch (type) {
            case 'center': return 100;
            case 'domain': return 50;
            case 'pillar': return 50; // Fallback for migration
            case 'project': return 30;
            case 'initiative': return 30; // Fallback for migration
            case 'milestone': return 20;
            case 'subnode': return 20; // Fallback for migration
            default: return 10;
        }
    };

    const finalNodes = processedNodes.map(node => ({
        ...node,
        zIndex: getZIndex(node.type)
    }));

    // Sort to guarantee DOM rendering order
    finalNodes.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    return { nodes: finalNodes, edges };
};
