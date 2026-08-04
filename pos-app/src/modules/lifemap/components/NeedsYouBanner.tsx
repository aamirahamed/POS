import { FC, useMemo, useState } from 'react';
import { useLifeMapStore } from '@/store/useLifeMapStore';
import { AlertCircle, Target } from 'lucide-react';

export const NeedsYouBanner: FC = () => {
    const { nodes, setFocusedProject } = useLifeMapStore();

    const [isExpanded, setIsExpanded] = useState(false);

    const needsYouTasks = useMemo(() => {
        const tasks: Array<{ task: any, node: any, project: any }> = [];
        
        for (const node of nodes) {
            if (node.data.tasks) {
                for (const task of node.data.tasks) {
                    if (
                        task.status === 'blocked' || 
                        task.type === 'decision' || 
                        (task.owner === 'me' && task.status !== 'done' && task.status !== 'dropped' && task.status !== 'parked')
                    ) {
                        // Find parent project
                        let project = null;
                        if (node.type === 'milestone') {
                            project = nodes.find(n => n.id === node.data.parentId);
                        } else if (node.type === 'project') {
                            project = node;
                        }

                        tasks.push({ task, node, project });
                    }
                }
            }
        }
        return tasks;
    }, [nodes]);

    if (needsYouTasks.length === 0) return null;

    if (!isExpanded) {
        return (
            <div className="absolute top-6 right-6 z-40">
                <button
                    onClick={() => setIsExpanded(true)}
                    className="bg-[#121214]/90 backdrop-blur-xl border border-orange-500/50 hover:bg-orange-500/10 transition-colors rounded-full px-4 py-2 shadow-[0_4px_20px_-8px_rgba(249,115,22,0.6)] flex items-center gap-2"
                >
                    <AlertCircle size={16} className="text-orange-400" />
                    <span className="text-orange-400 font-bold text-xs uppercase tracking-wider">
                        {needsYouTasks.length} Attention Needed
                    </span>
                </button>
            </div>
        );
    }

    return (
        <div className="absolute top-6 right-6 z-40 max-w-sm w-full">
            <div className="bg-[#121214]/95 backdrop-blur-2xl border border-orange-500/30 rounded-2xl p-4 shadow-[0_12px_40px_-12px_rgba(249,115,22,0.4)] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-orange-400 font-bold text-sm uppercase tracking-wider">
                        <AlertCircle size={16} /> Needs Your Attention
                    </div>
                    <button 
                        onClick={() => setIsExpanded(false)}
                        className="p-1 rounded-full hover:bg-white/10 text-text-secondary transition-colors"
                    >
                        <span className="opacity-70 hover:opacity-100 font-bold text-lg leading-none">&times;</span>
                    </button>
                </div>
                
                <div className="flex flex-col gap-2 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar mt-1">
                    {needsYouTasks.map(({ task, node, project }, i) => (
                        <div key={`${task.id}-${i}`} className="bg-white/5 hover:bg-white/10 transition-colors rounded-xl p-3 border border-white/5 group flex flex-col gap-2">
                            <div className="text-sm text-white font-medium leading-tight">
                                {task.text}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                <div className="flex items-center gap-2">
                                    {task.status === 'blocked' && <span className="text-[10px] uppercase font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-sm">Blocked</span>}
                                    {task.type === 'decision' && <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-sm">Decision</span>}
                                    {task.owner === 'me' && task.type !== 'decision' && task.status !== 'blocked' && <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-sm">Assigned to You</span>}
                                    
                                    <span className="text-xs text-text-secondary truncate max-w-[120px]" title={project?.data.label}>
                                        {project?.data.label || node.data.label}
                                    </span>
                                </div>
                                {project && (
                                    <button 
                                        onClick={() => setFocusedProject(project.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-indigo-500 text-white px-2 py-1 rounded flex items-center gap-1 font-semibold"
                                    >
                                        <Target size={12} /> Lock In
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
