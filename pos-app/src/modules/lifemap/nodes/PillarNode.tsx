import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps, NodeToolbar } from '@xyflow/react';
import { Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useLifeMapStore } from '@/store/useLifeMapStore';

const PillarNode = ({ id, data, selected }: NodeProps) => {
    const { addThread, toggleNodeExpansion, deleteNode, updateNode } = useLifeMapStore();
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(data.label as string);
    const inputRef = useRef<HTMLInputElement>(null);
    const timeoutRef = useState<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        if (timeoutRef[0]) clearTimeout(timeoutRef[0]);
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        const timeout = setTimeout(() => setIsHovered(false), 300); // 300ms delay
        timeoutRef[1](timeout);
    };

    const handleAddThread = () => {
        addThread(id, ""); // Empty string triggers editing mode in ThreadNode
    };

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const submitEdit = () => {
        if (editValue.trim()) {
            updateNode(id, { label: editValue });
            setIsEditing(false);
        } else {
            setEditValue(data.label as string);
            setIsEditing(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            submitEdit();
        }
    };

    const isExpanded = data.expanded as boolean;
    const hue = (data.hue as number) || 0;

    return (
        <div
            style={{
                borderColor: `hsl(${hue}, 70%, 50%)`,
                backgroundColor: `hsla(${hue}, 70%, 10%, 0.8)`,
                boxShadow: selected ? `0 0 20px hsla(${hue}, 70%, 50%, 0.3)` : 'none',
            }}
            className={`
        relative px-6 py-4 rounded-xl min-w-[160px] text-center
        border-2 transition-all duration-200 shadow-lg group
        ${selected
                    ? 'scale-105'
                    : 'hover:border-opacity-100' // Base styles handled by inline
                }
      `}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onDoubleClick={() => {
                if (id !== 'pillar-inbox') {
                    setIsEditing(true);
                    setEditValue(data.label as string);
                }
            }}
        >
            <NodeToolbar isVisible={selected || isHovered} position={Position.Top} className="flex gap-2">
                {id !== 'pillar-inbox' && (
                    <button
                        onClick={handleAddThread}
                        className="p-1 rounded-full bg-surface-hover hover:bg-accent text-text-primary transition-colors"
                        title="Add Thread"
                    >
                        <Plus size={14} />
                    </button>
                )}
                <button
                    onClick={() => toggleNodeExpansion(id)}
                    className="p-1 rounded-full bg-surface-hover hover:bg-accent text-text-primary transition-colors"
                    title={isExpanded ? "Collapse" : "Expand"}
                >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {id !== 'pillar-inbox' && (
                    <button
                        onClick={() => deleteNode(id)}
                        className="p-1 rounded-full bg-surface-hover hover:bg-red-500 text-text-primary transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </NodeToolbar>

            <Handle type="target" position={Position.Left} id="target-left" className="invisible" />
            <Handle type="target" position={Position.Right} id="target-right" className="invisible" />
            <Handle type="target" position={Position.Top} id="target-top" className="invisible" />
            <Handle type="target" position={Position.Bottom} id="target-bottom" className="invisible" />

            <div className="flex flex-col items-center gap-1">
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={submitEdit}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-transparent text-sm font-bold tracking-wide text-text-primary text-center focus:outline-none border-b border-white/20"
                    />
                ) : (
                    <div className="text-base font-bold tracking-wide text-text-primary">
                        {data.label as string}
                    </div>
                )}
                {!isExpanded && (
                    <div className="text-[10px] text-text-secondary uppercase tracking-widest mt-1">
                        Collapsed
                    </div>
                )}
            </div>

            {/* Persistent Add Thread Button */}
            {id !== 'pillar-inbox' && (
                <button 
                    onClick={(e) => { e.stopPropagation(); handleAddThread(); }}
                    className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-surface-hover hover:bg-accent border border-white/10 rounded-full flex items-center justify-center text-text-secondary hover:text-white transition-all shadow-md group-hover:opacity-100 opacity-60 z-10"
                    title="Add Thread"
                >
                    <Plus size={12} />
                </button>
            )}

            <Handle type="source" position={Position.Left} id="source-left" className="invisible" />
            <Handle type="source" position={Position.Right} id="source-right" className="invisible" />
            <Handle type="source" position={Position.Top} id="source-top" className="invisible" />
            <Handle type="source" position={Position.Bottom} id="source-bottom" className="invisible" />
        </div>
    );
};

export default memo(PillarNode);
