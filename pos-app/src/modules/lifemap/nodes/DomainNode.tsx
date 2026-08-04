import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps, NodeToolbar } from '@xyflow/react';
import { Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useLifeMapStore } from '@/store/useLifeMapStore';

const DomainNode = ({ id, data, selected }: NodeProps) => {
    const { addProject, toggleNodeExpansion, deleteNode, updateNode, setSelectedBriefNodeId } = useLifeMapStore();
    const childCount = useLifeMapStore(state => state.nodes.filter(n => n.data.parentId === id).length);
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

    const handleAddProject = () => {
        addProject(id, ""); // Empty string triggers editing mode in ProjectNode
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
                backgroundColor: `hsla(${hue}, 50%, 12%, 0.95)`,
                boxShadow: selected ? `0 0 20px hsla(${hue}, 70%, 50%, 0.3)` : 'none',
            }}
            className={`
        relative px-8 py-5 rounded-xl min-w-[200px] text-center
        border-[3px] transition-all duration-200 shadow-lg group
        ${selected
                    ? 'scale-105'
                    : 'hover:border-opacity-100' // Base styles handled by inline
                }
      `}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => {
                e.stopPropagation();
                setSelectedBriefNodeId(id);
            }}
            onDoubleClick={() => {
                if (id !== 'domain-inbox' && id !== 'pillar-inbox') {
                    setIsEditing(true);
                    setEditValue(data.label as string);
                }
            }}
        >
            <NodeToolbar isVisible={selected || isHovered} position={Position.Top} className="flex gap-2">
                {id !== 'domain-inbox' && id !== 'pillar-inbox' && (
                    <button
                        onClick={handleAddProject}
                        className="p-1 rounded-full bg-surface-hover hover:bg-accent text-text-primary transition-colors"
                        title="Add Project"
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
                {id !== 'domain-inbox' && id !== 'pillar-inbox' && (
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
                    <div className="text-lg font-bold tracking-wide text-text-primary">
                        {data.label as string}
                    </div>
                )}
                {!isExpanded && (
                    <div className="text-[10px] text-text-secondary uppercase tracking-widest mt-1">
                        Collapsed
                    </div>
                )}
                {isExpanded && childCount > 0 && (
                    <div className="text-[10px] text-text-secondary mt-1">
                        {childCount} {childCount === 1 ? 'project' : 'projects'}
                    </div>
                )}
            </div>

            {/* Persistent Add Project Button */}
            {id !== 'domain-inbox' && id !== 'pillar-inbox' && (
                <button 
                    onClick={(e) => { e.stopPropagation(); handleAddProject(); }}
                    className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-surface-hover hover:bg-accent border border-white/10 rounded-full flex items-center justify-center text-text-secondary hover:text-white transition-all shadow-md group-hover:opacity-100 opacity-60 z-10"
                    title="Add Project"
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

export default memo(DomainNode);
