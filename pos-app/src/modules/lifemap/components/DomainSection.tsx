import { memo, useState } from 'react';
import { useLifeMapStore } from '@/store/useLifeMapStore';
import { LifeMapNode } from '@/types/lifemap';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import ProjectRow from './ProjectRow';

interface Props {
    domain: LifeMapNode;
}

const DomainSection = ({ domain }: Props) => {
    const { nodes, addProject, deleteNode, toggleNodeExpansion, updateNode } = useLifeMapStore();
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editingTitle, setEditingTitle] = useState('');

    const data = domain.data;
    const isExpanded = data.expanded !== false;
    const hue = (data.hue as number) || 0;

    // Get child projects
    const projects = nodes
        .filter(n => n.data.parentId === domain.id && n.type === 'project')
        .sort((a, b) => (a.position?.y || 0) - (b.position?.y || 0));

    // Calculate domain progress based on all milestones under its projects
    let totalTasks = 0;
    let completedTasks = 0;
    let activeProjects = 0;

    projects.forEach(p => {
        if (p.data.status !== 'completed' && p.data.status !== 'done' && p.data.status !== 'paused' && p.data.status !== 'parked') {
            activeProjects++;
        }
        const milestones = nodes.filter(n => n.data.parentId === p.id && n.type === 'milestone');
        milestones.forEach(m => {
            const mTasks = (m.data.tasks as any[]) || [];
            totalTasks += mTasks.length;
            completedTasks += mTasks.filter(t => t.completed || t.status === 'done').length;
        });
    });

    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return (
        <div className="flex flex-col gap-3 mb-8">
            {/* Domain Header */}
            <div className="group flex items-center justify-between py-2 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => toggleNodeExpansion(domain.id)}
                        className="p-1 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
                    >
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                    <div className="flex items-center gap-3">
                        {isEditingTitle ? (
                            <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onBlur={() => {
                                    setIsEditingTitle(false);
                                    if (editingTitle.trim() && editingTitle !== data.label) {
                                        updateNode(domain.id, { label: editingTitle.trim() });
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setIsEditingTitle(false);
                                        if (editingTitle.trim() && editingTitle !== data.label) {
                                            updateNode(domain.id, { label: editingTitle.trim() });
                                        }
                                    } else if (e.key === 'Escape') {
                                        setIsEditingTitle(false);
                                    }
                                }}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                className="bg-black/40 border border-white/20 rounded px-2 py-0.5 text-xl font-bold tracking-tight text-text-primary focus:outline-none min-w-[200px]"
                            />
                        ) : (
                            <h2 
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTitle(data.label as string);
                                    setIsEditingTitle(true);
                                }}
                                className="text-xl font-bold tracking-tight text-text-primary cursor-text"
                            >
                                {data.label as string}
                            </h2>
                        )}
                        {activeProjects > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-text-secondary">
                                {activeProjects} active
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden sm:flex items-center gap-3 w-48">
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                            <div 
                                className="h-full rounded-full transition-all duration-500" 
                                style={{ 
                                    width: `${progressPercentage}%`,
                                    backgroundColor: `hsl(${hue}, 60%, 50%)`
                                }} 
                            />
                        </div>
                        <span className="text-xs font-bold text-text-secondary w-10">{progressPercentage}%</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => addProject(domain.id, "")}
                            className="p-2 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
                            title="Add Project"
                        >
                            <Plus size={18} />
                        </button>
                        <button
                            onClick={() => deleteNode(domain.id)}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-text-secondary hover:text-red-400 transition-colors"
                            title="Delete Domain"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Projects List */}
            {isExpanded && projects.length > 0 && (
                <div className="flex flex-col gap-4 pl-6 ml-3 mt-4 border-l-2 border-white/10 hover:border-white/30 transition-colors relative group/thread">
                    {projects.map(p => (
                        <div key={p.id} className="relative">
                            {/* Horizontal connector branch */}
                            <div className="absolute -left-6 top-6 w-4 h-[2px] bg-white/10 group-hover/thread:bg-white/30 transition-colors rounded-r-full" />
                            <ProjectRow project={p} />
                        </div>
                    ))}
                </div>
            )}
            
            {isExpanded && projects.length === 0 && (
                <div className="pl-6 ml-3 mt-4 border-l-2 border-white/10 hover:border-white/30 transition-colors">
                    <div className="relative">
                        <div className="absolute -left-6 top-6 w-4 h-[2px] bg-white/10 transition-colors rounded-r-full" />
                        <button
                            onClick={() => addProject(domain.id, "")}
                            className="flex items-center gap-2 px-4 py-4 text-sm font-medium text-text-secondary hover:text-text-primary bg-white/[0.02] hover:bg-white/[0.05] rounded-xl border border-dashed border-white/10 hover:border-white/20 transition-all w-full justify-center"
                        >
                            <Plus size={18} /> Add first project
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(DomainSection);
