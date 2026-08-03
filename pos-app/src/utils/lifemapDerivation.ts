import { LifeMapNode, LifeMapStatus } from '../types/lifemap';

export const computeNodeStatusAndProgress = (
    nodeId: string, 
    nodes: LifeMapNode[]
): { status: LifeMapStatus; progress: number | null } => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { status: 'not_started', progress: null };

    // Manual override takes highest precedence for status
    const manualStatus = node.data.manual_status_override;

    let childrenStats: { status: LifeMapStatus }[] = [];
    
    // If it's a milestone, its children are tasks
    if (node.type === 'milestone') {
        const tasks = node.data.tasks || [];
        childrenStats = tasks.map(t => ({ status: t.status || (t.completed ? 'done' : 'not_started') as LifeMapStatus }));
    } else {
        // If it's a project or domain, its children are other nodes
        const childrenNodes = nodes.filter(n => n.data.parentId === nodeId);
        childrenStats = childrenNodes.map(child => computeNodeStatusAndProgress(child.id, nodes));
    }

    if (childrenStats.length === 0) {
        return { 
            status: manualStatus || 'not_started', 
            progress: null 
        };
    }

    let doneCount = 0;
    let excludedCount = 0;
    const total = childrenStats.length;

    let hasInProgress = false;
    let hasBlocked = false;
    let allDoneOrDropped = true;
    let allParkedOrDropped = true;

    for (const child of childrenStats) {
        const s = child.status;
        if (s === 'done') {
            doneCount++;
        }
        if (s === 'parked' || s === 'dropped') {
            excludedCount++;
        }

        if (s === 'in_progress') hasInProgress = true;
        if (s === 'blocked') hasBlocked = true;
        
        if (s !== 'done' && s !== 'dropped') allDoneOrDropped = false;
        if (s !== 'parked' && s !== 'dropped') allParkedOrDropped = false;
    }

    const denominator = total - excludedCount;
    const progress = denominator > 0 ? (doneCount / denominator) * 100 : null;

    let derivedStatus: LifeMapStatus = 'not_started';

    if (allDoneOrDropped) {
        derivedStatus = 'done';
    } else if (hasInProgress) {
        derivedStatus = 'in_progress';
    } else if (hasBlocked && !hasInProgress) {
        derivedStatus = 'blocked';
    } else if (allParkedOrDropped) {
        derivedStatus = 'parked';
    } else {
        derivedStatus = 'not_started';
    }

    return {
        status: manualStatus || derivedStatus,
        progress
    };
};
