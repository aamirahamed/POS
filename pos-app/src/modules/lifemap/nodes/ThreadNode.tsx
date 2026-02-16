import { memo, useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps, NodeToolbar } from '@xyflow/react';
import { Plus, ChevronDown, ChevronUp, Trash2, CheckCircle, Circle } from 'lucide-react';
import { useLifeMapStore } from '@/store/useLifeMapStore';

const ThreadNode = ({ id, data, selected }: NodeProps) => {
    const { addSubnode, toggleNodeExpansion, deleteNode, updateNode } = useLifeMapStore();
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
        timeoutRef.current = setTimeout(() => setIsHovered(false), 300); // 300ms delay
    };

    const handleAddSubnode = () => {
        addSubnode(id, ""); // Empty string triggers editing mode in SubNode
    };

    const isExpanded = data.expanded as boolean;
    const isCompleted = data.status === 'completed';
    const hue = (data.hue as number) || 0;

    const toggleStatus = () => {
        updateNode(id, { status: isCompleted ? 'active' : 'completed' });
    };

    const submitEdit = () => {
        if (editValue.trim()) {
            updateNode(id, { label: editValue, editing: false });
            setIsEditing(false);
        } else {
            // Keep previous value if empty, or maybe delete if it was new? 
            // For now, revert to original label if empty
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

    return (
        <div
            style={{
                borderColor: isCompleted ? `hsl(${hue}, 40%, 30%)` : `hsl(${hue}, 70%, 40%)`,
                backgroundColor: `hsla(${hue}, 70%, 15%, 0.6)`,
                boxShadow: selected ? `0 0 15px hsla(${hue}, 70%, 40%, 0.2)` : 'none',
            }}
            className={`
        relative px-4 py-2 rounded-lg min-w-[120px] text-center
        border transition-all duration-200 group
        ${selected
                    ? 'scale-105'
                    : isCompleted ? 'opacity-60' : 'hover:border-opacity-100'
                }
      `}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onDoubleClick={() => {
                setIsEditing(true);
                setEditValue(data.label as string);
            }}
        >
            <NodeToolbar isVisible={selected || isHovered} position={Position.Top} className="flex gap-2">
                <button
                    onClick={handleAddSubnode}
                    className="p-1 rounded-full bg-surface hover:bg-accent text-text-primary transition-colors"
                    title="Add Subnode"
                >
                    <Plus size={12} />
                </button>
                <button
                    onClick={() => toggleNodeExpansion(id)}
                    className="p-1 rounded-full bg-surface hover:bg-accent text-text-primary transition-colors"
                    title={isExpanded ? "Collapse" : "Expand"}
                >
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                <button
                    onClick={toggleStatus}
                    className={`p-1 rounded-full bg-surface hover:bg-green-600 text-text-primary transition-colors ${isCompleted ? 'text-green-500' : ''}`}
                    title="Toggle Status"
                >
                    {isCompleted ? <CheckCircle size={12} /> : <Circle size={12} />}
                </button>
                <button
                    onClick={() => {
                        if (confirm('Delete Thread?')) deleteNode(id);
                    }}
                    className="p-1 rounded-full bg-surface hover:bg-red-500 text-text-primary transition-colors"
                    title="Delete"
                >
                    <Trash2 size={12} />
                </button>
            </NodeToolbar>

            <Handle type="target" position={Position.Left} id="target-left" className="invisible" />
            <Handle type="target" position={Position.Right} id="target-right" className="invisible" />
            <Handle type="target" position={Position.Top} id="target-top" className="invisible" />
            <Handle type="target" position={Position.Bottom} id="target-bottom" className="invisible" />

            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={submitEdit}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent text-xs font-medium text-text-primary text-center focus:outline-none border-b border-accent"
                />
            ) : (
                <div className={`text-xs font-medium text-text-primary ${isCompleted ? 'line-through text-text-secondary' : ''}`}>
                    {data.label as string}
                </div>
            )}

            <Handle type="source" position={Position.Left} id="source-left" className="invisible" />
            <Handle type="source" position={Position.Right} id="source-right" className="invisible" />
            <Handle type="source" position={Position.Top} id="source-top" className="invisible" />
            <Handle type="source" position={Position.Bottom} id="source-bottom" className="invisible" />
        </div>
    );
};

export default memo(ThreadNode);
