import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps, NodeToolbar } from '@xyflow/react';
import { Trash2, CheckCircle, Circle, Maximize2, Clock } from 'lucide-react';
import { LifeMapNode } from '@/types/lifemap';
import { useLifeMapStore } from '@/store/useLifeMapStore';

const MilestoneNode = ({ id, data, selected }: NodeProps) => {
    const { deleteNode, updateNode, setSelectedExecutionNodeId } = useLifeMapStore();
    const parentStatus = useLifeMapStore(state => {
        const parent = state.nodes.find(n => n.id === data.parentId);
        return (parent?.data?.status as string) || 'active';
    });
    
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(data.editing as boolean || false);
    const [editValue, setEditValue] = useState(data.label as string);

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
    const lastUpdated = (data.lastUpdated as number) || Date.now();

    const completedTasksCount = tasks.filter(t => t.completed).length;
    const totalTasksCount = tasks.length;
    const progressPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

    const toggleStatus = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newStatus = isCompleted ? 'active' : 'completed';
        updateNode(id, { status: newStatus as LifeMapNode['data']['status'], lastUpdated: Date.now() });
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
        relative rounded-xl text-left backdrop-blur-md p-3
        transition-all duration-300 group flex flex-col gap-2
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
                    title="Open Milestone Details"
                >
                    <Maximize2 size={12} />
                </button>
                {id !== 'milestone-inbox' && id !== 'subnode-inbox' && (
                    <>
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
                    </>
                )}
            </NodeToolbar>

            <Handle type="target" position={Position.Top} id="target-top" className="invisible" />

            {/* Row 1: Title (left) + Priority pill (right) */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1" onDoubleClick={(e) => { if (id !== 'milestone-inbox' && id !== 'subnode-inbox') { e.stopPropagation(); setIsEditing(true); setEditValue(data.label as string); } }}>
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

            {/* Row 2: Progress bar (full width) with percentage and fraction on the right */}
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

            {/* Row 3: Small 'Updated Jul 25' text */}
            <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                <Clock size={10} className="opacity-60" />
                <span>Updated {new Date(lastUpdated).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
        </div>
    );
};

export default memo(MilestoneNode);
