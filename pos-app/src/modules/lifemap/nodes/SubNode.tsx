import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps, NodeToolbar } from '@xyflow/react';
import { Trash2, CheckCircle, Circle, Maximize2, ListTodo, BookOpen, Flame, Clock, Play } from 'lucide-react';
import { useLifeMapStore } from '@/store/useLifeMapStore';

const SubNode = ({ id, data, selected }: NodeProps) => {
    const { deleteNode, updateNode, addTaskToNode, toggleNodeTask, setSelectedExecutionNodeId } = useLifeMapStore();
    const parentStatus = useLifeMapStore(state => {
        const parent = state.nodes.find(n => n.id === data.parentId);
        return (parent?.data?.status as string) || 'active';
    });
    
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(data.editing as boolean || false);
    const [editValue, setEditValue] = useState(data.label as string);
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [newTaskText, setNewTaskText] = useState("");

    const inputRef = useRef<HTMLInputElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => setIsHovered(false), 300);
    };

    const isCompleted = data.status === 'completed';
    const hue = (data.hue as number) || 0;
    const tasks = (data.tasks as { id: string; text: string; completed: boolean }[]) || [];
    const priority = (data.priority as string) || 'medium';
    const notes = (data.notes as string) || '';
    const resources = (data.resources as any[]) || [];
    const streak = (data.streak as number) || 0;
    const lastUpdated = (data.lastUpdated as number) || Date.now();

    const completedTasksCount = tasks.filter(t => t.completed).length;
    const totalTasksCount = tasks.length;
    const progressPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

    const toggleStatus = (e: React.MouseEvent) => {
        e.stopPropagation();
        updateNode(id, { status: isCompleted ? 'active' : 'completed', lastUpdated: Date.now() });
    };

    const submitEdit = () => {
        if (editValue.trim()) {
            updateNode(id, { label: editValue, editing: false, lastUpdated: Date.now() });
            setIsEditing(false);
        } else {
            setEditValue(data.label as string);
            setIsEditing(false);
            updateNode(id, { editing: false });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            submitEdit();
        }
    };

    const handleTaskToggle = (e: React.MouseEvent, taskId: string) => {
        e.stopPropagation();
        toggleNodeTask(id, taskId);
        updateNode(id, { lastUpdated: Date.now() });
    };

    const submitNewTask = () => {
        if (newTaskText.trim()) {
            addTaskToNode(id, newTaskText.trim());
            setNewTaskText("");
            // Keep adding mode open for rapid entry
        } else {
            setIsAddingTask(false);
        }
    };

    const handleTaskKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.stopPropagation();
            submitNewTask();
        } else if (e.key === 'Escape') {
            e.stopPropagation();
            setIsAddingTask(false);
        }
    };

    const openDrawer = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedExecutionNodeId(id);
    };

    let borderColor = isCompleted ? `hsl(${hue}, 20%, 30%)` : `hsl(${hue}, 50%, 40%)`;
    let bgColor = `hsla(${hue}, 40%, 12%, 0.85)`;
    let opacity = isCompleted ? 0.7 : 1;
    let filter = 'none';
    let bStyle = `solid 1px ${borderColor}`;
    let shadowClass = selected ? 'shadow-[0_0_20px_rgba(255,255,255,0.1)]' : isCompleted ? 'shadow-sm' : 'hover:shadow-2xl';

    if (parentStatus === 'backlog') {
        opacity = isCompleted ? 0.4 : 0.75;
        bStyle = `dashed 1px hsl(${hue}, 30%, 40%)`;
        bgColor = `hsla(${hue}, 20%, 10%, 0.6)`;
        shadowClass = selected ? 'shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'shadow-none hover:shadow-lg';
    } else if (parentStatus === 'paused') {
        opacity = isCompleted ? 0.4 : 0.6;
        filter = 'grayscale(50%)';
        bStyle = `solid 1px hsl(0, 0%, 30%)`;
        bgColor = `hsla(0, 0%, 10%, 0.7)`;
        shadowClass = 'shadow-none';
    } else if (parentStatus === 'completed') {
        opacity = 0.4;
        filter = 'grayscale(30%)';
        bStyle = `solid 1px hsl(${hue}, 20%, 30%)`;
        shadowClass = 'shadow-none';
    }

    const priorityColor = {
        low: 'text-blue-400',
        medium: 'text-amber-400',
        high: 'text-red-400'
    }[priority] || 'text-text-secondary';

    return (
        <div
            style={{
                border: selected ? 'solid 1px rgba(255,255,255,0.3)' : bStyle,
                backgroundColor: bgColor,
                opacity,
                filter,
                minWidth: '240px',
                maxWidth: '280px'
            }}
            className={`
        relative rounded-xl text-left backdrop-blur-md
        transition-all duration-300 group flex flex-col
        ${shadowClass} ${selected ? 'scale-[1.02]' : (parentStatus === 'active' && !isCompleted ? 'hover:-translate-y-1' : '')}
      `}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={openDrawer}
        >
            <NodeToolbar isVisible={selected || isHovered} position={Position.Top} className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={openDrawer}
                    className="p-1.5 rounded-full bg-surface hover:bg-accent text-text-primary transition-colors shadow-md"
                    title="Expand Workspace"
                >
                    <Maximize2 size={12} />
                </button>
                <button
                    onClick={toggleStatus}
                    className={`p-1.5 rounded-full bg-surface hover:bg-green-600/30 transition-colors shadow-md ${isCompleted ? 'text-green-400' : 'text-text-primary'}`}
                    title="Toggle Status"
                >
                    {isCompleted ? <CheckCircle size={12} /> : <Circle size={12} />}
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        deleteNode(id);
                    }}
                    className="p-1.5 rounded-full bg-surface hover:bg-red-500/30 text-text-primary transition-colors shadow-md"
                    title="Delete"
                >
                    <Trash2 size={12} />
                </button>
            </NodeToolbar>

            <Handle type="target" position={Position.Top} id="target-top" className="invisible" />

            {/* HEADER SECTION */}
            <div className="p-3 border-b border-white/5 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1" onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditValue(data.label as string); }}>
                        {isEditing ? (
                            <input
                                ref={inputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={submitEdit}
                                onKeyDown={handleKeyDown}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full bg-black/30 rounded px-1 text-sm font-bold text-text-primary focus:outline-none"
                            />
                        ) : (
                            <h3 className={`text-sm font-bold tracking-tight text-text-primary ${isCompleted ? 'line-through text-text-secondary' : ''} leading-tight`}>
                                {data.label as string}
                            </h3>
                        )}
                    </div>
                    <div className={`mt-0.5 text-[10px] uppercase font-bold tracking-wider ${priorityColor} opacity-80 flex-shrink-0`}>
                        {priority}
                    </div>
                </div>

                {/* PROGRESS & STATUS */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden relative">
                        <div 
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all duration-500 rounded-full"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                    <div className="text-[10px] font-medium text-text-secondary flex gap-1.5">
                        <span className="text-text-primary">{progressPercentage}%</span>
                        <span>({completedTasksCount}/{totalTasksCount})</span>
                    </div>
                </div>
            </div>

            <div className="p-3 flex flex-col gap-3">
                {/* ACTIVE ACTIONS */}
                <div className="flex flex-col gap-1.5">
                    {tasks.length > 0 ? (
                        <>
                            {tasks.map(task => (
                                <div
                                    key={task.id}
                                    className="flex items-start gap-2 text-xs group/task cursor-pointer hover:bg-white/5 p-1 -mx-1 rounded transition-colors"
                                    onClick={(e) => handleTaskToggle(e, task.id)}
                                >
                                    <div className={`mt-0.5 transition-colors ${task.completed ? 'text-green-500' : 'text-text-secondary group-hover/task:text-blue-400'}`}>
                                        {task.completed ? <CheckCircle size={10} /> : <Circle size={10} />}
                                    </div>
                                    <span className={`flex-1 break-words leading-tight ${task.completed ? 'line-through text-text-secondary opacity-60' : 'text-text-primary opacity-90'}`}>
                                        {task.text}
                                    </span>
                                </div>
                            ))}
                            {tasks.length === 0 && !isAddingTask && (
                                <div className="text-xs text-text-secondary italic pl-1 flex items-center gap-1.5">
                                    No tasks added yet.
                                </div>
                            )}
                        </>
                    ) : (
                        !isAddingTask && (
                            <div className="text-xs text-text-secondary italic opacity-70">
                                No active actions...
                            </div>
                        )
                    )}

                    {/* Add Quick Task Input */}
                    {isAddingTask ? (
                        <div className="flex items-center gap-2 text-xs p-1 -mx-1 mt-1 bg-black/20 rounded">
                            <Circle size={10} className="text-text-secondary opacity-50 flex-shrink-0" />
                            <input
                                autoFocus
                                type="text"
                                value={newTaskText}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                onKeyDown={handleTaskKeyDown}
                                onBlur={() => submitNewTask()}
                                placeholder="Type task..."
                                className="flex-1 bg-transparent text-text-primary focus:outline-none placeholder:text-text-secondary/50"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    ) : (
                        <div 
                            className="text-[10px] text-text-secondary hover:text-white transition-colors cursor-pointer pl-4 pt-1"
                            onClick={(e) => { e.stopPropagation(); setIsAddingTask(true); }}
                        >
                            + Quick task
                        </div>
                    )}
                </div>

                {/* QUICK NOTES */}
                {notes && (
                    <div className="bg-black/20 rounded p-2 text-[10px] text-text-secondary leading-snug border border-white/5 line-clamp-2">
                        {notes}
                    </div>
                )}

                {/* RESOURCES */}
                {resources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {resources.slice(0, 2).map((res, i) => (
                            <div key={i} className="flex items-center gap-1 text-[9px] bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded text-text-secondary transition-colors cursor-pointer border border-white/5">
                                <BookOpen size={8} />
                                <span className="truncate max-w-[80px]">{res.title}</span>
                            </div>
                        ))}
                        {resources.length > 2 && (
                            <div className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-text-secondary border border-white/5">
                                +{resources.length - 2}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MOMENTUM INDICATORS */}
            <div className="px-3 py-2 border-t border-white/5 bg-black/10 rounded-b-xl flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                    <Clock size={10} className="opacity-60" />
                    <span>Updated {new Date(lastUpdated).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
                {streak > 0 && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-orange-400">
                        <Flame size={10} />
                        <span>{streak}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(SubNode);
