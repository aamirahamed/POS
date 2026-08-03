import { useMemo } from 'react';
import { useLifeMapStore } from '@/store/useLifeMapStore';
import { Target, X, CheckCircle2 } from 'lucide-react';
import MilestoneRow from './MilestoneRow';

const FocusModeView = () => {
    const { nodes, focusedProjectId, setFocusedProject } = useLifeMapStore();

    const project = useMemo(() => {
        return nodes.find(n => n.id === focusedProjectId && n.type === 'project');
    }, [nodes, focusedProjectId]);

    const milestones = useMemo(() => {
        return nodes.filter(n => n.data.parentId === focusedProjectId && n.type === 'milestone');
    }, [nodes, focusedProjectId]);

    if (!project) {
        return null; // Should not happen, but safe fallback
    }

    const data = project.data;
    const hue = (data.hue as number) || 210;
    const title = data.label || 'Untitled Project';

    // Calculate progress across all milestones in this project
    const allTasks = milestones.flatMap(m => (m.data.tasks as any[]) || []);
    const completedTasksCount = allTasks.filter(t => t.completed || t.status === 'done').length;
    const totalTasksCount = allTasks.length;
    const progressPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

    return (
        <div className="absolute inset-0 z-20 bg-background flex flex-col items-center overflow-y-auto">
            {/* Header Area */}
            <div className="w-full max-w-4xl px-8 pt-12 pb-8 flex flex-col gap-8">
                
                <div className="flex items-start justify-between w-full">
                    <div className="flex flex-col gap-2">
                        <span 
                            className="text-xs uppercase tracking-widest font-bold"
                            style={{ color: `hsl(${hue}, 60%, 65%)` }}
                        >
                            Focus Mode Active
                        </span>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                            {title}
                        </h1>
                    </div>

                    <button
                        onClick={() => setFocusedProject(null)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors border border-red-500/20 font-semibold shadow-sm"
                    >
                        <X size={18} />
                        Stop Focus
                    </button>
                </div>

                {/* Macro Progress Visualization */}
                <div className="w-full bg-surface-elevated/50 border border-white/5 p-6 rounded-2xl flex flex-col gap-4 shadow-lg backdrop-blur-sm">
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-text-secondary">Project Execution Progress</span>
                            <span className="text-3xl font-black text-white flex items-baseline gap-2">
                                {progressPercentage}% 
                                <span className="text-sm font-medium text-text-secondary">
                                    ({completedTasksCount}/{totalTasksCount} Action Items)
                                </span>
                            </span>
                        </div>
                        {progressPercentage === 100 && totalTasksCount > 0 && (
                            <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full text-sm font-bold border border-green-400/20">
                                <CheckCircle2 size={16} /> Completed
                            </div>
                        )}
                    </div>
                    
                    <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                        <div 
                            className="h-full rounded-full transition-all duration-1000 ease-out" 
                            style={{ 
                                width: `${progressPercentage}%`,
                                backgroundColor: `hsl(${hue}, 60%, 50%)`,
                                boxShadow: `0 0 20px hsl(${hue}, 60%, 50%)` 
                            }} 
                        />
                    </div>
                </div>

                {/* Milestones / Execution Checklist */}
                <div className="flex flex-col w-full bg-surface-elevated/30 border border-white/10 rounded-2xl overflow-hidden shadow-xl mt-4">
                    <div className="px-6 py-4 bg-black/20 border-b border-white/5 flex items-center gap-3">
                        <Target size={18} className="text-text-secondary" />
                        <h2 className="text-base font-semibold text-text-primary">Execution Checklist</h2>
                    </div>
                    
                    {milestones.length === 0 ? (
                        <div className="p-8 text-center text-text-secondary">
                            No milestones yet. Ask Sam to generate an execution plan for this project!
                        </div>
                    ) : (
                        <div className="flex flex-col divide-y divide-white/5">
                            {milestones.map(m => (
                                <MilestoneRow key={m.id} milestone={m} forceExpanded={true} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Bottom Padding for CommandCenter */}
            <div className="h-32 w-full shrink-0" />
        </div>
    );
};

export default FocusModeView;
