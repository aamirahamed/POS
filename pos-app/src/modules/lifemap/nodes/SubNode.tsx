import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps, NodeToolbar } from '@xyflow/react';
import { Trash2, CheckCircle, Circle, Plus } from 'lucide-react';
import { useLifeMapStore } from '@/store/useLifeMapStore';

const SubNode = ({ id, data, selected }: NodeProps) => {
    const { deleteNode, updateNode, addTaskToNode, toggleNodeTask } = useLifeMapStore();
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(data.editing as boolean || false);
    const [editValue, setEditValue] = useState(data.label as string);

    // Task addition state
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [newTaskText, setNewTaskText] = useState("");

    const inputRef = useRef<HTMLInputElement>(null);
    const taskInputRef = useRef<HTMLInputElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isSubmittingRef = useRef(false);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    useEffect(() => {
        if (isAddingTask && taskInputRef.current) {
            taskInputRef.current.focus();
        }
    }, [isAddingTask]);

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

    const toggleStatus = () => {
        updateNode(id, { status: isCompleted ? 'active' : 'completed' });
    };

    const submitEdit = () => {
        if (editValue.trim()) {
            updateNode(id, { label: editValue, editing: false });
            setIsEditing(false);
        } else {
            setEditValue(data.label as string);
            setIsEditing(false);
            updateNode(id, { editing: false });
        }
    };

    const submitNewTask = () => {
        if (newTaskText.trim()) {
            addTaskToNode(id, newTaskText.trim());
            setNewTaskText("");
            setIsAddingTask(true); // Keep input open for multiple additions
        } else {
            setIsAddingTask(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            submitEdit();
        }
    };

    const handleTaskKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            isSubmittingRef.current = true;
            submitNewTask();
            setTimeout(() => { isSubmittingRef.current = false; }, 100);
        } else if (e.key === 'Escape') {
            setIsAddingTask(false);
        }
    };

    const handleInputBlur = () => {
        // If we just submitted via Enter, ignore the blur event
        if (isSubmittingRef.current) {
            setTimeout(() => taskInputRef.current?.focus(), 10);
            return;
        }
        submitNewTask();
    };

    // Calculate background colors based on hue
    const borderColor = isCompleted ? `hsl(${hue}, 30%, 30%)` : `hsl(${hue}, 60%, 40%)`;
    const bgColor = `hsla(${hue}, 60%, 15%, 0.8)`; // Slightly more opaque for list readability


    return (
        <div
            style={{
                borderColor: borderColor,
                backgroundColor: bgColor,
                minWidth: '180px', // Wider to accommodate tasks
            }}
            className={`
        relative rounded-lg text-left
        border transition-all duration-200 group flex flex-col
        ${selected
                    ? 'shadow-lg scale-105'
                    : isCompleted ? 'opacity-60' : ''
                }
      `}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <NodeToolbar isVisible={selected || isHovered} position={Position.Top} className="flex gap-1">
                <button
                    onClick={() => setIsAddingTask(true)}
                    className="p-1 rounded-full bg-surface hover:bg-accent text-text-primary transition-colors"
                    title="Add Task"
                >
                    <Plus size={10} />
                </button>
                <button
                    onClick={toggleStatus}
                    className={`p-1 rounded-full bg-surface hover:bg-green-600 text-text-primary transition-colors ${isCompleted ? 'text-green-500' : ''}`}
                    title="Toggle Status"
                >
                    {isCompleted ? <CheckCircle size={10} /> : <Circle size={10} />}
                </button>
                <button
                    onClick={() => deleteNode(id)}
                    className="p-1 rounded-full bg-surface hover:bg-red-500 text-text-primary transition-colors"
                    title="Delete"
                >
                    <Trash2 size={10} />
                </button>
            </NodeToolbar>

            <Handle type="target" position={Position.Top} id="target-top" className="invisible" />

            {/* Header / Main Label */}
            <div
                className="px-3 py-2 border-b border-white/10"
                onDoubleClick={() => {
                    setIsEditing(true);
                    setEditValue(data.label as string);
                }}
            >
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={submitEdit}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-transparent text-sm font-bold text-text-primary focus:outline-none"
                    />
                ) : (
                    <div className={`text-sm font-bold text-text-primary ${isCompleted ? 'line-through text-text-secondary' : ''}`}>
                        {data.label as string}
                    </div>
                )}
            </div>

            {/* Task List */}
            {(tasks.length > 0 || isAddingTask) && (
                <div className="p-2 space-y-1">
                    {tasks.map(task => (
                        <div
                            key={task.id}
                            className="flex items-start gap-2 text-xs group/task cursor-pointer hover:bg-white/5 p-1 rounded"
                            onClick={() => toggleNodeTask(id, task.id)}
                        >
                            <div className={`mt-0.5 ${task.completed ? 'text-green-400' : 'text-text-secondary'}`}>
                                {task.completed ? <CheckCircle size={12} /> : <Circle size={12} />}
                            </div>
                            <span className={`flex-1 break-words ${task.completed ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                                {task.text}
                            </span>
                        </div>
                    ))}

                    {/* Add Task Input */}
                    {isAddingTask && (
                        <div className="flex items-center gap-2 mt-2 px-1">
                            <Circle size={12} className="text-text-secondary opacity-50" />
                            <input
                                ref={taskInputRef}
                                type="text"
                                placeholder="Add task..."
                                value={newTaskText}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                onKeyDown={handleTaskKeyDown}
                                onBlur={handleInputBlur}
                                className="w-full bg-transparent text-xs text-text-primary focus:outline-none placeholder:text-text-secondary/50"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Empty state helper if no tasks and not adding */}
            {tasks.length === 0 && !isAddingTask && !isCompleted && (
                <div
                    className="px-3 py-2 text-[10px] text-text-secondary italic cursor-pointer hover:text-accent text-center"
                    onClick={() => setIsAddingTask(true)}
                >
                    + Add tasks
                </div>
            )}
        </div>
    );
};

export default memo(SubNode);
