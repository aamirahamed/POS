import { memo, useState } from 'react';
import { useLifeMapStore } from '@/store/useLifeMapStore';
import { LifeMapNode } from '@/types/lifemap';
import { ChevronDown, ChevronRight, Plus, Trash2, Target } from 'lucide-react';
import MilestoneRow from './MilestoneRow';

interface Props {
    project: LifeMapNode;
}

const ProjectRow = ({ project }: Props) => {
    const { nodes, addMilestone, updateNode, deleteNode, toggleNodeExpansion, setFocusedProject } = useLifeMapStore();
    const [showStateMenu, setShowStateMenu] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editingTitle, setEditingTitle] = useState('');

    const data = project.data;
    const isExpanded = data.expanded !== false; // Default to true if undefined
    const status = (data.status as string) || 'active';
    const hue = (data.hue as number) || 210;



    // Get children
    const milestones = nodes
        .filter(n => n.data.parentId === project.id && n.type === 'milestone')
        .sort((a, b) => {
            const aCompleted = a.data.status === 'completed' || a.data.status === 'done';
            const bCompleted = b.data.status === 'completed' || b.data.status === 'done';
            
            if (aCompleted && !bCompleted) return 1;
            if (!aCompleted && bCompleted) return -1;
            
            return (a.position?.y || 0) - (b.position?.y || 0);
        });

    // Calculate progress
    let totalTasks = 0;
    let completedTasks = 0;
    milestones.forEach(m => {
        const mTasks = (m.data.tasks as any[]) || [];
        totalTasks += mTasks.length;
        completedTasks += mTasks.filter(t => t.completed || t.status === 'done').length;
    });
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const setStatus = (newStatus: string) => {
        updateNode(project.id, { status: newStatus as LifeMapNode['data']['status'] });
        setShowStateMenu(false);
    };

    const stateColors: any = {
        active: `text-[hsl(${hue},80%,60%)] bg-[hsl(${hue},80%,60%)]/10 border-[hsl(${hue},80%,60%)]/30`,
        in_progress: `text-[hsl(${hue},80%,60%)] bg-[hsl(${hue},80%,60%)]/10 border-[hsl(${hue},80%,60%)]/30`,
        backlog: 'text-gray-400 bg-gray-400/10 border-gray-400/30',
        not_started: 'text-gray-400 bg-gray-400/10 border-gray-400/30',
        paused: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
        parked: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
        blocked: 'text-red-400 bg-red-400/10 border-red-400/30',
        completed: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/30',
        done: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/30',
        dropped: 'text-stone-500 bg-stone-500/10 border-stone-500/30'
    };

    const stateIcons: any = {
        active: '🟢',
        in_progress: '🟢',
        backlog: '⚪',
        not_started: '⚪',
        paused: '⏸️',
        parked: '⏸️',
        blocked: '🛑',
        completed: '✓',
        done: '✓',
        dropped: '⨯'
    };

    let stripeColor = `hsl(${hue}, 80%, 60%)`;
    let opacity = 1;
    let filter = 'none';

    if (status === 'backlog') {
        stripeColor = `hsl(${hue}, 30%, 40%)`;
        opacity = 0.85;
    } else if (status === 'paused') {
        stripeColor = `hsl(0, 0%, 40%)`;
        opacity = 0.7;
        filter = 'grayscale(30%)';
    } else if (status === 'completed' || status === 'done') {
        stripeColor = 'transparent'; // No glow when done
        opacity = 0.5;
    }

    return (
        <div style={{ opacity, filter }} className="flex flex-col mb-3 bg-[#18181b]/50 border border-white/10 rounded-xl overflow-hidden relative transition-colors hover:border-white/20">
            {/* Status Stripe spanning full height */}
            <div style={{ backgroundColor: stripeColor }} className="absolute left-0 top-0 bottom-0 w-[3px] opacity-80" />

            {/* Project Header */}
            <div className="group flex items-center gap-3 py-3 px-4 relative">
                <button
                    onClick={() => toggleNodeExpansion(project.id)}
                    className="p-1 rounded hover:bg-white/10 text-text-secondary transition-colors ml-2"
                >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                <div className="flex-1 flex items-center justify-between min-w-0">
                    <div className="flex items-center gap-3">
                        {isEditingTitle ? (
                            <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onBlur={() => {
                                    setIsEditingTitle(false);
                                    if (editingTitle.trim() && editingTitle !== data.label) {
                                        updateNode(project.id, { label: editingTitle.trim() });
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setIsEditingTitle(false);
                                        if (editingTitle.trim() && editingTitle !== data.label) {
                                            updateNode(project.id, { label: editingTitle.trim() });
                                        }
                                    } else if (e.key === 'Escape') {
                                        setIsEditingTitle(false);
                                    }
                                }}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                className="bg-black/40 border border-white/20 rounded px-2 py-0.5 text-base font-bold text-text-primary focus:outline-none w-48"
                            />
                        ) : (
                            <span 
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTitle(data.label as string);
                                    setIsEditingTitle(true);
                                }}
                                className={`text-base font-bold truncate ${status === 'completed' || status === 'done' ? 'line-through text-text-secondary' : 'text-text-primary cursor-text'}`}
                            >
                                {data.label as string}
                            </span>
                        )}
                        
                        {/* Status Badge */}
                        <div className="relative">
                            <button
                                onClick={() => setShowStateMenu(!showStateMenu)}
                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] uppercase font-bold tracking-widest transition-colors ${stateColors[status]}`}
                            >
                                <span>{stateIcons[status]}</span>
                                <span>{status}</span>
                                <span className="opacity-50 ml-0.5 text-[8px]">▼</span>
                            </button>
                            
                            {showStateMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowStateMenu(false)} />
                                    <div className="absolute top-full left-0 mt-1 bg-surface-elevated border border-white/10 rounded-lg shadow-2xl flex flex-col z-50 text-[10px] uppercase font-bold tracking-widest w-32 overflow-hidden animate-in fade-in duration-100">
                                        <button onClick={() => setStatus('active')} className="px-3 py-2 hover:bg-white/10 text-left text-green-400 flex items-center gap-2"><span>🟢</span> Active</button>
                                        <button onClick={() => setStatus('backlog')} className="px-3 py-2 hover:bg-white/10 text-left text-gray-400 flex items-center gap-2"><span>⚪</span> Backlog</button>
                                        <button onClick={() => setStatus('paused')} className="px-3 py-2 hover:bg-white/10 text-left text-orange-400 flex items-center gap-2"><span>⏸</span> Paused</button>
                                        <button onClick={() => setStatus('completed')} className="px-3 py-2 hover:bg-white/10 text-left text-indigo-400 flex items-center gap-2"><span>✓</span> Completed</button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Focus Mode Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setFocusedProject(project.id);
                            }}
                            className="ml-2 px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] uppercase font-bold tracking-widest rounded-full flex items-center gap-1.5 shadow-sm transition-all hover:scale-105 active:scale-95 shrink-0"
                        >
                            <Target size={12} />
                            Lock In
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 text-xs text-text-secondary w-32">
                            <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
                                <div className="h-full bg-white/20 rounded-full" style={{ width: `${progressPercentage}%` }} />
                            </div>
                            <span className="w-8 text-right">{progressPercentage}%</span>
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => addMilestone(project.id, "")}
                                className="p-1.5 rounded-md hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
                                title="Add Milestone"
                            >
                                <Plus size={16} />
                            </button>
                            <button
                                onClick={() => deleteNode(project.id)}
                                className="p-1.5 rounded-md hover:bg-red-500/20 text-text-secondary hover:text-red-400 transition-colors"
                                title="Delete Project"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Milestones List */}
            {isExpanded && milestones.length > 0 && (
                <div className="flex flex-col border-t border-white/5 bg-black/20">
                    {milestones.map(m => (
                        <MilestoneRow key={m.id} milestone={m} />
                    ))}
                    <div className="px-4 py-2 border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                        <button
                            onClick={() => addMilestone(project.id, "")}
                            className="flex items-center gap-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors w-full"
                        >
                            <Plus size={14} /> Add Milestone
                        </button>
                    </div>
                </div>
            )}
            
            {isExpanded && milestones.length === 0 && (
                <div className="border-t border-white/5 bg-black/20 p-4">
                    <button
                        onClick={() => addMilestone(project.id, "")}
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary bg-white/[0.02] hover:bg-white/[0.05] rounded-lg border border-dashed border-white/10 hover:border-white/20 transition-all w-full justify-center"
                    >
                        <Plus size={16} /> Add first milestone
                    </button>
                </div>
            )}
        </div>
    );
};

export default memo(ProjectRow);
