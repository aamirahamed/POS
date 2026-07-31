import React, { useMemo } from 'react';
import { useLifeMapStore } from '@/store/useLifeMapStore';
import { LifeMapNode } from '@/types/lifemap';
import { Target, CheckCircle2, Hexagon, FolderDot, CheckSquare } from 'lucide-react';

interface MiniMapTreeProps {
    payload: {
        type: string;
        nodeId: string;
        taskText?: string;
    };
}

export const MiniMapTree: React.FC<MiniMapTreeProps> = ({ payload }) => {
    const { nodes } = useLifeMapStore();

    const lineage = useMemo(() => {
        const path: LifeMapNode[] = [];
        let currentId: string | undefined = payload.nodeId;

        while (currentId) {
            const node = nodes.find(n => n.id === currentId);
            if (!node) break;
            
            // Insert at the beginning so the root is first
            path.unshift(node);
            currentId = node.data?.parentId;
        }

        return path;
    }, [payload.nodeId, nodes]);

    if (lineage.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-0 relative my-2 pl-2">
            {lineage.map((node, index) => {
                const isTarget = node.id === payload.nodeId;
                const hue = node.data?.hue || 210;
                
                return (
                    <div key={node.id} className="relative flex flex-col items-start w-full" style={{ zIndex: 100 - index }}>
                        <div 
                            className="relative flex items-center"
                            style={{ marginLeft: `${index * 48}px` }}
                        >
                            {/* Vertical and horizontal connection lines (elbow) */}
                            {index > 0 && (
                                <div 
                                    className="absolute border-l-2 border-b-2 border-white/20 rounded-bl-xl z-0"
                                    style={{ 
                                        width: '16px', 
                                        height: '64px',
                                        left: '-16px',
                                        top: '-40px'
                                    }}
                                />
                            )}

                            {/* Node Rendering */}
                            <div 
                                className={`
                                    relative z-10 flex items-center gap-3 pr-3 py-2.5 rounded-xl border transition-all duration-300
                                    ${node.type === 'domain' ? 'pl-3' : 'pl-[15px]'}
                                    ${isTarget 
                                        ? 'bg-black/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.6)] scale-100 ring-1 ring-white/10 my-2' 
                                        : 'bg-white/5 opacity-70 scale-95 hover:opacity-100 my-1'
                                    }
                                `}
                                style={{
                                    borderColor: `hsl(${hue}, 40%, 25%)`,
                                    ...(isTarget && { boxShadow: `0 0 15px -5px hsl(${hue}, 60%, 40%)` }),
                                    // Domain gets a thick left border to look foundational
                                    ...(node.type === 'domain' && { borderLeftWidth: '4px', borderLeftColor: `hsl(${hue}, 60%, 50%)` }),
                                    // Project gets a dashed border
                                    ...(node.type === 'project' && { borderStyle: 'dashed', borderWidth: '1px' }),
                                }}
                            >
                                {/* Icon based on node type */}
                                <div 
                                    className={`
                                        w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-inner
                                        ${node.type === 'domain' ? 'bg-transparent' : ''}
                                    `}
                                    style={{
                                        backgroundColor: node.type !== 'domain' ? `hsl(${hue}, 30%, 15%)` : 'transparent',
                                        color: `hsl(${hue}, 80%, 70%)`
                                    }}
                                >
                                    {node.type === 'domain' && <Hexagon size={20} strokeWidth={2.5} className="fill-current/10" />}
                                    {node.type === 'project' && <FolderDot size={18} />}
                                    {node.type === 'milestone' && <Target size={18} />}
                                    {!['domain', 'project', 'milestone'].includes(node.type) && <CheckCircle2 size={18} />}
                                </div>
                                
                                <div className="flex flex-col min-w-[140px] max-w-[240px]">
                                    {/* Explicit Type Label */}
                                    <span 
                                        className="text-[9px] uppercase tracking-widest font-bold mb-0.5 opacity-80"
                                        style={{ color: `hsl(${hue}, 60%, 65%)` }}
                                    >
                                        {node.type}
                                    </span>
                                    
                                    {/* Node Title */}
                                    <span className="text-[14px] font-semibold text-white truncate drop-shadow-sm leading-tight">
                                        {node.data?.label || 'Untitled Node'}
                                    </span>

                                    {/* New Item Indicator */}
                                    {isTarget && payload.type !== 'add_task_to_node' && (
                                        <span 
                                            className="text-[10px] uppercase tracking-wider font-bold mt-1.5 flex items-center gap-1.5"
                                            style={{ color: `hsl(${hue}, 80%, 75%)` }}
                                        >
                                            <span 
                                                className="w-1.5 h-1.5 rounded-full animate-pulse" 
                                                style={{ backgroundColor: `hsl(${hue}, 80%, 70%)`, boxShadow: `0 0 5px hsl(${hue}, 80%, 70%)` }}
                                            />
                                            Just Added
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            {payload.type === 'add_task_to_node' && payload.taskText && (
                <div className="relative flex flex-col items-start w-full" style={{ zIndex: 90 }}>
                    <div 
                        className="relative flex items-center"
                        style={{ marginLeft: `${lineage.length * 48}px` }}
                    >
                        <div 
                            className="absolute border-l-2 border-b-2 border-white/20 rounded-bl-xl z-0"
                            style={{ 
                                width: '16px', 
                                height: '64px',
                                left: '-16px',
                                top: '-40px'
                            }}
                        />
                        <div 
                            className="relative z-10 flex items-center gap-3 pr-3 py-2.5 pl-[15px] rounded-xl border border-indigo-500/40 bg-indigo-500/10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.6)] ring-1 ring-white/10 my-2"
                        >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-inner bg-indigo-500/20 text-indigo-400">
                                <CheckSquare size={16} />
                            </div>
                            <div className="flex flex-col min-w-[140px] max-w-[240px]">
                                <span className="text-[9px] uppercase tracking-widest font-bold mb-0.5 opacity-80 text-indigo-400">
                                    Action Item Added
                                </span>
                                <span className="text-[14px] font-semibold text-white break-words leading-tight">
                                    {payload.taskText}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
