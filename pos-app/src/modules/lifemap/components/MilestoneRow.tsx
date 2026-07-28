import { memo, useState } from 'react';
import { useLifeMapStore } from '@/store/useLifeMapStore';
import { LifeMapNode } from '@/types/lifemap';
import { CheckCircle, Circle, Trash2, ChevronDown, ChevronRight, Square, CheckSquare, Plus, FileText, Link } from 'lucide-react';

interface Props {
    milestone: LifeMapNode;
}

const MilestoneRow = ({ milestone }: Props) => {
    const { setSelectedExecutionNodeId, deleteNode, updateNode, toggleNodeTask, addTaskToNode, editTaskInNode } = useLifeMapStore();
    const [isTasksExpanded, setIsTasksExpanded] = useState(false);
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [newTaskText, setNewTaskText] = useState('');
    
    // Editing states
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editingTitle, setEditingTitle] = useState('');
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editingTaskText, setEditingTaskText] = useState('');

    const data = milestone.data;
    const isCompleted = data.status === 'completed';
    const tasks = (data.tasks as { id: string; text: string; completed: boolean }[]) || [];
    const priority = (data.priority as string) || 'medium';

    const completedTasksCount = tasks.filter(t => t.completed).length;
    const totalTasksCount = tasks.length;
    const progressPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

    const priorityColor = {
        low: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
        medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
        high: 'text-red-400 bg-red-400/10 border-red-400/20'
    }[priority] || 'text-text-secondary bg-white/5 border-white/10';

    const toggleStatus = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newStatus = isCompleted ? 'active' : 'completed';
        updateNode(milestone.id, { status: newStatus as LifeMapNode['data']['status'], lastUpdated: Date.now() });
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        deleteNode(milestone.id);
    };

    const toggleTasks = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsTasksExpanded(!isTasksExpanded);
    };

    return (
        <div className="flex flex-col">
            <div
                onClick={() => setSelectedExecutionNodeId(milestone.id)}
                className={`
                    group flex items-center justify-between gap-3 p-3 px-6 cursor-pointer border-b border-white/5 last:border-0
                    transition-all duration-200 
                    ${isCompleted ? 'opacity-50 grayscale-[30%] bg-transparent hover:bg-white/[0.02]' : 'bg-transparent hover:bg-white/[0.04]'}
                `}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                        onClick={toggleTasks}
                        className={`p-1 -ml-1 rounded transition-colors ${tasks.length > 0 || isAddingTask || isTasksExpanded ? 'hover:bg-white/10 text-text-secondary' : 'opacity-0 group-hover:opacity-100 hover:bg-white/10 text-text-secondary/50'}`}
                        title="Toggle Tasks"
                    >
                        {isTasksExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    <button
                        onClick={toggleStatus}
                        className={`p-1 -ml-1 rounded-full hover:bg-white/10 transition-colors ${isCompleted ? 'text-green-400' : 'text-text-secondary hover:text-green-400'}`}
                    >
                        {isCompleted ? <CheckCircle size={16} /> : <Circle size={16} />}
                    </button>
                <div className="flex flex-col min-w-0 flex-1">
                    {isEditingTitle ? (
                        <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={() => {
                                setIsEditingTitle(false);
                                if (editingTitle.trim() && editingTitle !== data.label) {
                                    updateNode(milestone.id, { label: editingTitle.trim() });
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setIsEditingTitle(false);
                                    if (editingTitle.trim() && editingTitle !== data.label) {
                                        updateNode(milestone.id, { label: editingTitle.trim() });
                                    }
                                } else if (e.key === 'Escape') {
                                    setIsEditingTitle(false);
                                }
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            className="bg-black/40 border border-white/20 rounded px-2 py-0.5 text-sm font-medium text-text-primary focus:outline-none w-full"
                        />
                    ) : (
                        <span 
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingTitle(data.label as string);
                                setIsEditingTitle(true);
                            }}
                            className={`text-sm font-medium truncate ${isCompleted ? 'line-through text-text-secondary' : 'text-text-primary'}`}
                        >
                            {data.label as string}
                        </span>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 w-full">
                        <div className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border flex-shrink-0 ${priorityColor}`}>
                            {priority}
                        </div>
                        
                        {/* Resource / Canvas Pills */}
                        <div className="flex items-center gap-2 flex-1 justify-end mx-2 overflow-hidden" style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%)' }}>
                            {data.canvases?.map(c => (
                                <div key={c.id} className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 whitespace-nowrap flex-shrink-0">
                                    <FileText size={10} />
                                    <span className="text-[10px] font-medium truncate max-w-[120px]">{c.title}</span>
                                </div>
                            ))}
                            {data.resources?.map(r => (
                                <a 
                                    key={r.id} 
                                    href={r.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-text-secondary hover:text-text-primary whitespace-nowrap flex-shrink-0 cursor-pointer"
                                >
                                    <Link size={10} />
                                    <span className="text-[10px] font-medium truncate max-w-[120px]">{r.title}</span>
                                </a>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 w-[100px] flex-shrink-0">
                            <div className="flex-1 h-1 bg-black/40 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full transition-all duration-500"
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-text-secondary whitespace-nowrap w-6 text-right">
                                {completedTasksCount}/{totalTasksCount}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={handleDelete}
                    className="p-1.5 rounded-md hover:bg-red-500/20 text-text-secondary hover:text-red-400 transition-colors"
                    title="Delete Milestone"
                >
                    <Trash2 size={14} />
                </button>
            </div>
            </div>

            {/* Action Items Drill Down */}
            {isTasksExpanded && (
                <div className="flex flex-col gap-2 pl-4 ml-10 mr-4 pb-3 mt-1 mb-2 border-l-2 border-white/10 hover:border-white/30 transition-colors relative">
                    {/* Horizontal connector branches could be added here, but the vertical line hover is usually enough for leaf nodes */}
                    {tasks.map(task => (
                        <div key={task.id} className="flex items-start gap-3 group/task">
                            <button
                                onClick={() => toggleNodeTask(milestone.id, task.id)}
                                className={`mt-0.5 flex-shrink-0 transition-colors ${task.completed ? 'text-green-500/70' : 'text-text-secondary hover:text-green-400/80'}`}
                            >
                                {task.completed ? <CheckSquare size={13} /> : <Square size={13} />}
                            </button>
                            {editingTaskId === task.id ? (
                                <input
                                    type="text"
                                    value={editingTaskText}
                                    onChange={(e) => setEditingTaskText(e.target.value)}
                                    onBlur={() => {
                                        setEditingTaskId(null);
                                        if (editingTaskText.trim() && editingTaskText !== task.text) {
                                            editTaskInNode(milestone.id, task.id, editingTaskText.trim());
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setEditingTaskId(null);
                                            if (editingTaskText.trim() && editingTaskText !== task.text) {
                                                editTaskInNode(milestone.id, task.id, editingTaskText.trim());
                                            }
                                        } else if (e.key === 'Escape') {
                                            setEditingTaskId(null);
                                        }
                                    }}
                                    autoFocus
                                    className="bg-black/40 border border-white/20 rounded px-2 py-0.5 text-[13px] text-text-primary focus:outline-none w-full"
                                />
                            ) : (
                                <span 
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        setEditingTaskText(task.text);
                                        setEditingTaskId(task.id);
                                    }}
                                    className={`text-[13px] leading-relaxed ${task.completed ? 'text-text-secondary line-through' : 'text-text-secondary hover:text-text-primary transition-colors cursor-text'}`}
                                >
                                    {task.text}
                                </span>
                            )}
                        </div>
                    ))}
                    
                    {isAddingTask ? (
                        <div className="flex items-center gap-3 mt-1">
                            <Square size={13} className="text-text-secondary/30 flex-shrink-0 mt-0.5" />
                            <input
                                type="text"
                                value={newTaskText}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newTaskText.trim()) {
                                        addTaskToNode(milestone.id, newTaskText.trim());
                                        setNewTaskText('');
                                    } else if (e.key === 'Escape') {
                                        setIsAddingTask(false);
                                        setNewTaskText('');
                                    }
                                }}
                                onBlur={() => {
                                    if (!newTaskText.trim()) setIsAddingTask(false);
                                }}
                                autoFocus
                                placeholder="What needs to be done?"
                                className="flex-1 bg-transparent text-[13px] text-text-primary focus:outline-none placeholder:text-text-secondary/50"
                            />
                        </div>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsAddingTask(true); }}
                            className="flex items-center gap-2 text-text-secondary/60 hover:text-text-secondary transition-colors text-[13px] mt-1 w-max"
                        >
                            <Plus size={13} /> Add action item
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default memo(MilestoneRow);
