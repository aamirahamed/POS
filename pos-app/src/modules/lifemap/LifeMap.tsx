import { FC, useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { saveLifeMap } from '@/services/lifeMapService';
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
import { Trash2, Download, Upload, ChevronsUp, ChevronsDown } from 'lucide-react';

import CenterNode from './nodes/CenterNode';
import DomainNode from './nodes/DomainNode';
import ProjectNode from './nodes/ProjectNode';
import MilestoneNode from './nodes/MilestoneNode';
import ExecutionNodeDrawer from './components/ExecutionNodeDrawer';
import InboxPanel from './components/InboxPanel';
import DomainsView from './components/DomainsView';
import { Layers, Map as MapIcon } from 'lucide-react';

const nodeTypes: NodeTypes = {
    center: CenterNode,
    domain: DomainNode,
    project: ProjectNode,
    milestone: MilestoneNode,
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
        setNodeToDelete,
        loadFromDB,
        collapseAll,
        expandAll
    } = useLifeMapStore();

    // Sync state
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [activeView, setActiveView] = useState<'domains' | 'map'>('domains');
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 1. Fetch user and load data
    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
            }
            await loadFromDB();
            // Trigger the new layout engine to reposition nodes correctly
            setTimeout(() => triggerLayout(), 50);
            setIsLoaded(true);
        };
        load();
    }, [loadFromDB, triggerLayout]);

    // Export JSON backup
    const handleExportJSON = useCallback(() => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ nodes, edges }, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `lifemap_backup_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }, [nodes, edges]);

    // Import JSON backup
    const handleImportJSON = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const fileObj = event.target.files && event.target.files[0];
        if (!fileObj) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const parsed = JSON.parse(e.target?.result as string);
                if (parsed.nodes && Array.isArray(parsed.nodes)) {
                    setNodes(parsed.nodes);
                    if (parsed.edges) setEdges(parsed.edges);
                    setTimeout(() => triggerLayout(), 100);
                    alert(`Successfully imported ${parsed.nodes.length} nodes!`);
                }
            } catch (err) {
                alert("Failed to parse JSON file.");
            }
        };
        reader.readAsText(fileObj);
    }, [setNodes, setEdges, triggerLayout]);

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



    const { addDomain } = useLifeMapStore();
    const handleAddDomain = useCallback(() => {
        const title = prompt("Enter Domain Name:");
        if (title) addDomain(title);
    }, [addDomain]);

    const styledEdges = edges.map(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        let relevantProject = null;
        if (sourceNode?.type === 'project') {
            relevantProject = sourceNode;
        } else if (targetNode?.type === 'project') {
            relevantProject = targetNode;
        } else if (targetNode?.type === 'milestone') {
            const parentProject = nodes.find(n => n.id === targetNode.data.parentId);
            if (parentProject) {
                relevantProject = parentProject;
            }
        }

        // Base clean connector style: thin, low opacity, no animation
        const baseStyle = { strokeWidth: 1.5, opacity: 0.25 };

        if (relevantProject) {
            const status = relevantProject.data.status || 'active';
            const hue = targetNode?.type === 'milestone' ? (targetNode.data.hue || 210) : (relevantProject.data.hue || 210);
            
            if (status === 'active') {
                return { ...edge, animated: false, style: { ...baseStyle, stroke: `hsl(${hue}, 50%, 50%)`, opacity: 0.45 } };
            } else if (status === 'backlog') {
                return { ...edge, animated: false, style: { ...baseStyle, stroke: `hsl(${hue}, 20%, 40%)`, strokeDasharray: '5,5', opacity: 0.2 } };
            } else if (status === 'paused') {
                return { ...edge, animated: false, style: { ...baseStyle, stroke: '#6b7280', opacity: 0.15 } };
            } else if (status === 'completed') {
                return { ...edge, animated: false, style: { ...baseStyle, stroke: `hsl(${hue}, 15%, 30%)`, opacity: 0.15 } };
            }
        }
        return { ...edge, animated: false, style: { ...baseStyle, stroke: '#52525b' } };
    });

    return (
        <div className="h-full w-full bg-background relative flex flex-col">
            {/* View Toggle Bar */}
            <div className="absolute top-6 left-6 z-40 bg-[#121214]/80 p-1.5 rounded-xl border border-white/10 backdrop-blur-md flex items-center gap-1 shadow-lg">
                <button
                    onClick={() => setActiveView('domains')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'domains' ? 'bg-white/10 text-white shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
                >
                    <Layers size={16} /> Domains
                </button>
                <button
                    onClick={() => setActiveView('map')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'map' ? 'bg-white/10 text-white shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
                >
                    <MapIcon size={16} /> Map
                </button>
            </div>

            {activeView === 'map' ? (
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
                        if (n.type === 'domain') return '#27272a';
                        return '#3f3f46';
                    }}
                    className="bg-surface border-border"
                />
                <Panel position="top-right" className="flex items-center gap-2 bg-[#121214]/80 p-2 rounded-xl border border-white/10 backdrop-blur-md">
                    <Button onClick={handleAddDomain} variant="default" size="sm">+ Domain</Button>
                    <div className="w-[1px] h-5 bg-white/10" />
                    <Button onClick={expandAll} variant="outline" size="sm" className="flex items-center gap-1.5 text-xs text-text-primary border-white/10 hover:bg-white/5" title="Expand All">
                        <ChevronsDown size={13} /> Expand
                    </Button>
                    <Button onClick={collapseAll} variant="outline" size="sm" className="flex items-center gap-1.5 text-xs text-text-primary border-white/10 hover:bg-white/5" title="Collapse All">
                        <ChevronsUp size={13} /> Collapse
                    </Button>
                    <div className="w-[1px] h-5 bg-white/10" />
                    <Button onClick={handleExportJSON} variant="outline" size="sm" className="flex items-center gap-1.5 text-xs text-text-primary border-white/10 hover:bg-white/5">
                        <Download size={13} /> Export
                    </Button>
                    <label className="cursor-pointer">
                        <span className="px-3 py-1.5 rounded-md border border-white/10 text-xs text-text-primary hover:bg-white/5 transition-colors flex items-center gap-1.5 bg-surface font-medium">
                            <Upload size={13} /> Import
                        </span>
                        <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                    </label>
                    <div className="text-[10px] text-text-secondary pl-2 border-l border-white/10">
                        {userId ? '🟢 Cloud Sync' : '🟡 Local Mode'}
                    </div>
                </Panel>
            </ReactFlow>
            ) : (
                <DomainsView />
            )}
            
            {nodeToDelete && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#121214] border border-white/10 rounded-2xl p-6 w-[420px] shadow-2xl flex flex-col gap-4 scale-in-95 duration-200">
                        <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
                            <Trash2 size={20} /> Delete Node?
                        </h3>
                        <p className="text-sm text-text-secondary leading-relaxed">
                            Are you sure you want to delete this node? This will also permanently delete all of its child nodes and connected tasks. This action cannot be undone.
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
            <InboxPanel />
        </div>
    );
};

export default LifeMap;
