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

import CenterNode from './nodes/CenterNode';
import PillarNode from './nodes/PillarNode';
import ThreadNode from './nodes/ThreadNode';
import SubNode from './nodes/SubNode';

const nodeTypes: NodeTypes = {
    center: CenterNode,
    pillar: PillarNode,
    thread: ThreadNode,
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
        setEdges
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

    return (
        <div className="h-full w-full bg-background relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
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
        </div>
    );
};

export default LifeMap;
