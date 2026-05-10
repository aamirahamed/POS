import { FC, useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchLifeMap, saveLifeMap } from '@/services/lifeMapService';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    NodeTypes,
    Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useLifeMapStore } from '@/store/useLifeMapStore';
import { Button } from "@/components/ui/button";
import { Trash2 } from 'lucide-react';

import CenterNode from './nodes/CenterNode';
import PillarNode from './nodes/PillarNode';
import ThreadNode from './nodes/ThreadNode';
import InitiativeNode from './nodes/InitiativeNode';
import SubNode from './nodes/SubNode';
import ExecutionNodeDrawer from './components/ExecutionNodeDrawer';

const nodeTypes: NodeTypes = {
    center: CenterNode,
    pillar: PillarNode,
    thread: ThreadNode,
    initiative: InitiativeNode,
    subnode: SubNode,
};

const LifeMap: FC = () => {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        setNodes,
        setEdges,
        triggerLayout,
        nodeToDelete,
        confirmDeleteNode,
        setNodeToDelete
    } = useLifeMapStore();

    // Sync state
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 1. Fetch user and load data
    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                const data = await fetchLifeMap(user.id);
                if (data) {
                    // Only override if remote data exists
                    if (data.nodes && data.nodes.length > 0) {
                        setNodes(data.nodes);
                        setEdges(data.edges);
                        // Trigger the new layout engine to reposition old saved nodes correctly
                        setTimeout(() => triggerLayout(), 50);
                    }
                }
                setIsLoaded(true);
            }
        };
        load();
    }, [setNodes, setEdges]);

    // 2. Auto-save on changes
    useEffect(() => {
        if (!userId || !isLoaded) return;

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
            await saveLifeMap(userId, nodes, edges);
            // console.log('Auto-saved to Supabase');
        }, 2000); // 2 second debounce

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [nodes, edges, userId, isLoaded]);



    // Actually I'm replacing the whole body, so I can rewrite handleAddPillar.

    const { addPillar } = useLifeMapStore();
    const handleAddPillar = useCallback(() => {
        const title = prompt("Enter Pillar Name:");
        if (title) addPillar(title);
    }, [addPillar]);

    const styledEdges = edges.map(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        let relevantInitiative = null;
        if (sourceNode?.type === 'initiative') {
            relevantInitiative = sourceNode;
        } else if (targetNode?.type === 'initiative') {
            relevantInitiative = targetNode;
        } else if (targetNode?.type === 'thread') {
            // Find all initiatives belonging to this thread
            const childInitiatives = nodes.filter(n => n.type === 'initiative' && n.data.parentId === targetNode.id);
            
            if (childInitiatives.length > 0) {
                // Priority: active > paused > backlog > completed
                const active = childInitiatives.find(n => (n.data.status || 'active') === 'active');
                const paused = childInitiatives.find(n => n.data.status === 'paused');
                const backlog = childInitiatives.find(n => n.data.status === 'backlog');
                
                relevantInitiative = active || paused || backlog || childInitiatives[0];
            }
        }

        if (relevantInitiative) {
            const status = relevantInitiative.data.status || 'active';
            const hue = targetNode?.type === 'thread' ? (targetNode.data.hue || 210) : (relevantInitiative.data.hue || 210);
            
            if (status === 'active') {
                return { ...edge, animated: true, style: { stroke: `hsl(${hue}, 70%, 60%)`, strokeWidth: 2, opacity: 1 } };
            } else if (status === 'backlog') {
                return { ...edge, animated: false, style: { stroke: `hsl(${hue}, 30%, 40%)`, strokeWidth: 1.5, strokeDasharray: '5,5', opacity: 0.6 } };
            } else if (status === 'paused') {
                return { ...edge, animated: false, style: { stroke: '#6b7280', strokeWidth: 1.5, opacity: 0.4 } };
            } else if (status === 'completed') {
                return { ...edge, animated: false, style: { stroke: `hsl(${hue}, 20%, 30%)`, strokeWidth: 1.5, opacity: 0.3 } };
            }
        }
        return edge;
    });

    return (
        <div className="h-full w-full bg-background relative">
            <ReactFlow
                nodes={nodes}
                edges={styledEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                className="bg-background"
                colorMode="dark"
                minZoom={0.1}
                maxZoom={2}
            >
                <Background color="#27272a" gap={20} size={1} />
                <Controls className="bg-surface border-border fill-text-secondary" />
                <MiniMap
                    nodeColor={(n) => {
                        if (n.type === 'center') return '#6366f1';
                        if (n.type === 'pillar') return '#27272a';
                        return '#3f3f46';
                    }}
                    className="bg-surface border-border"
                />
                <Panel position="top-right">
                    <Button onClick={handleAddPillar} variant="default" size="sm">New Pillar</Button>
                    <div className="mt-2 text-[10px] text-text-secondary text-right">
                        {userId ? 'Syncing...' : 'Local Mode'}
                    </div>
                </Panel>
            </ReactFlow>
            
            {nodeToDelete && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#121214] border border-white/10 rounded-2xl p-6 w-[420px] shadow-2xl flex flex-col gap-4 scale-in-95 duration-200">
                        <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
                            <Trash2 size={20} /> Delete Node?
                        </h3>
                        <p className="text-sm text-text-secondary leading-relaxed">
                            Are you sure you want to delete this node? This will also permanently delete all of its child nodes and connected execution tasks. This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3 mt-4">
                            <button 
                                onClick={() => setNodeToDelete(null)} 
                                className="px-5 py-2.5 rounded-lg text-sm font-medium text-text-primary hover:bg-white/5 transition-colors border border-transparent"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDeleteNode} 
                                className="px-5 py-2.5 rounded-lg text-sm font-bold bg-red-500 text-white shadow-lg hover:bg-red-600 transition-colors"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ExecutionNodeDrawer />
        </div>
    );
};

export default LifeMap;
