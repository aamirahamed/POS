import { memo, useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps, NodeToolbar } from '@xyflow/react';
import { Plus, ChevronDown, ChevronUp, Trash2, CheckCircle, Play, Pause } from 'lucide-react';
import { LifeMapNode } from '@/types/lifemap';
import { useLifeMapStore } from '@/store/useLifeMapStore';

const InitiativeNode = ({ id, data, selected }: NodeProps) => {
    const { addSubnode, toggleNodeExpansion, deleteNode, updateNode } = useLifeMapStore();
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(data.editing as boolean || false);
    const [editValue, setEditValue] = useState(data.label as string);
    const [showStateMenu, setShowStateMenu] = useState(false);
    
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
        timeoutRef.current = setTimeout(() => {
            setIsHovered(false);
            setShowStateMenu(false);
        }, 300);
    };

    const handleAddSubnode = () => addSubnode(id, "");
    
    const isExpanded = data.expanded as boolean;
    const hue = (data.hue as number) || 210;
    const status = (data.status as string) || 'active'; // active, backlog, paused, completed

    const setStatus = (newStatus: string) => {
        updateNode(id, { status: newStatus as LifeMapNode['data']['status'] });
        setShowStateMenu(false);
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

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') submitEdit();
    };

    // Derived State Visuals
    let borderStyle = `solid 1px hsl(${hue}, 65%, 45%)`;
    let bgColor = `hsla(${hue}, 65%, 12%, 0.7)`;
    let shadow = selected ? `0 0 15px hsla(${hue}, 65%, 45%, 0.3)` : 'none';
    let opacity = 1;
    let filter = 'none';

    if (status === 'active') {
        borderStyle = `solid 1.5px hsl(${hue}, 80%, 60%)`;
        bgColor = `hsla(${hue}, 70%, 15%, 0.9)`;
        shadow = `0 0 20px hsla(${hue}, 70%, 50%, 0.2)`;
    } else if (status === 'backlog') {
        borderStyle = `dashed 1.5px hsl(${hue}, 30%, 40%)`;
        bgColor = `hsla(${hue}, 20%, 10%, 0.6)`;
        opacity = 0.85;
    } else if (status === 'paused') {
        borderStyle = `solid 1px hsl(0, 0%, 40%)`;
        bgColor = `hsla(0, 0%, 15%, 0.6)`;
        opacity = 0.7;
        filter = 'grayscale(30%)';
    } else if (status === 'completed') {
        borderStyle = `solid 1px hsl(${hue}, 20%, 30%)`;
        bgColor = `hsla(${hue}, 20%, 10%, 0.4)`;
        opacity = 0.5;
    }

    const stateColors: any = {
        active: 'text-green-400 bg-green-400/10 border-green-400/30',
        backlog: 'text-gray-300 bg-gray-400/10 border-gray-400/30',
        paused: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
        completed: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/30'
    };

    const stateIcons: any = {
        active: '🟢',
        backlog: '⚪',
        paused: '⏸',
        completed: '✓'
    };

    return (
        <div
            style={{ border: borderStyle, backgroundColor: bgColor, boxShadow: shadow, opacity, filter }}
            className={`
        relative px-4 py-3 rounded-xl min-w-[150px] text-center
        transition-all duration-500 group flex flex-col items-center gap-2
        ${selected ? 'scale-105 z-50' : 'hover:scale-[1.02]'}
      `}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onDoubleClick={() => {
                setIsEditing(true);
                setEditValue(data.label as string);
            }}
        >
            <NodeToolbar isVisible={selected || isHovered} position={Position.Top} className="flex gap-2">
                <button onClick={() => setStatus('active')} className="p-1 rounded-full bg-surface hover:bg-green-600/30 text-green-400 transition-colors" title="Activate"><Play size={12} /></button>
                <button onClick={() => setStatus('paused')} className="p-1 rounded-full bg-surface hover:bg-orange-600/30 text-orange-400 transition-colors" title="Pause"><Pause size={12} /></button>
                <button onClick={() => setStatus('completed')} className="p-1 rounded-full bg-surface hover:bg-indigo-600/30 text-indigo-400 transition-colors" title="Complete"><CheckCircle size={12} /></button>
                <div className="w-[1px] h-4 bg-white/20 self-center mx-1" />
                <button onClick={handleAddSubnode} className="p-1 rounded-full bg-surface hover:bg-accent text-text-primary transition-colors" title="Add Execution Node"><Plus size={12} /></button>
                <button onClick={() => toggleNodeExpansion(id)} className="p-1 rounded-full bg-surface hover:bg-accent text-text-primary transition-colors" title={isExpanded ? "Collapse" : "Expand"}>
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                <button onClick={() => deleteNode(id)} className="p-1 rounded-full bg-surface hover:bg-red-500 text-text-primary transition-colors" title="Delete">
                    <Trash2 size={12} />
                </button>
            </NodeToolbar>

            <Handle type="target" position={Position.Top} id="target-top" className="invisible" />

            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={submitEdit}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent text-sm font-bold text-text-primary text-center focus:outline-none border-b border-accent"
                />
            ) : (
                <div className={`text-sm font-bold tracking-wide text-text-primary ${status === 'completed' ? 'line-through opacity-60' : ''}`}>
                    {data.label as string}
                </div>
            )}

            {/* State Chip Dropdown */}
            <div className="relative">
                <div 
                    onClick={(e) => { e.stopPropagation(); setShowStateMenu(!showStateMenu); }}
                    className={`cursor-pointer inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] uppercase font-bold tracking-widest transition-colors ${stateColors[status]}`}
                >
                    <span>{stateIcons[status]}</span>
                    <span>{status}</span>
                    <span className="opacity-50 ml-0.5">▼</span>
                </div>
                
                {showStateMenu && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-surface-elevated border border-white/10 rounded-lg shadow-2xl flex flex-col z-[100] text-[10px] uppercase font-bold tracking-widest w-32 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <button onClick={(e) => { e.stopPropagation(); setStatus('active'); }} className="px-3 py-2 hover:bg-white/10 text-left text-green-400 flex items-center gap-2"><span>🟢</span> Active</button>
                        <button onClick={(e) => { e.stopPropagation(); setStatus('backlog'); }} className="px-3 py-2 hover:bg-white/10 text-left text-gray-300 flex items-center gap-2"><span>⚪</span> Backlog</button>
                        <button onClick={(e) => { e.stopPropagation(); setStatus('paused'); }} className="px-3 py-2 hover:bg-white/10 text-left text-orange-400 flex items-center gap-2"><span>⏸</span> Paused</button>
                        <button onClick={(e) => { e.stopPropagation(); setStatus('completed'); }} className="px-3 py-2 hover:bg-white/10 text-left text-indigo-400 flex items-center gap-2"><span>✓</span> Completed</button>
                    </div>
                )}
            </div>

            {/* Persistent Add Execution Node Button */}
            <button 
                onClick={(e) => { e.stopPropagation(); handleAddSubnode(); }}
                className="absolute -bottom-2.5 left-1/2 transform -translate-x-1/2 w-5 h-5 bg-surface hover:bg-accent border border-white/10 rounded-full flex items-center justify-center text-text-secondary hover:text-white transition-all shadow-md group-hover:opacity-100 opacity-60 z-10"
                title="Add Execution Node"
            >
                <Plus size={10} />
            </button>

            <Handle type="source" position={Position.Bottom} id="source-bottom" className="invisible" />
        </div>
    );
};

export default memo(InitiativeNode);
