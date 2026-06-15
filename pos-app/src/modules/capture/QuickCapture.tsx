import { FC, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLifeMapStore } from '@/store/useLifeMapStore';
import { LifeMapNode } from '@/types/lifemap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
    Zap, 
    ArrowLeft, 
    Check, 
    Sparkles, 
    Link as LinkIcon, 
    FileText, 
    Clock, 
    Trash2, 
    ExternalLink, 
    CheckCircle2,
    Search,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper: check if string is URL
const isUrl = (str: string) => {
    try {
        const parsed = new URL(str);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_) {
        return /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/gi.test(str);
    }
};

// Helper: detect resource type
const detectResourceType = (urlStr: string): 'youtube' | 'article' | 'link' => {
    const lower = urlStr.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
        return 'youtube';
    }
    if (
        lower.includes('medium.com') || 
        lower.includes('wikipedia.org') || 
        lower.includes('substack.com') || 
        lower.includes('/article/') || 
        lower.includes('/blog/')
    ) {
        return 'article';
    }
    return 'link';
};

// Helper: clean URL (prepend https if missing)
const cleanUrl = (urlStr: string) => {
    if (!/^https?:\/\//i.test(urlStr)) {
        return `https://${urlStr}`;
    }
    return urlStr;
};

// Helper: Resolve parent path for subnodes
const resolveNodePath = (subnodeId: string, nodes: LifeMapNode[], edges: any[]): string => {
    if (subnodeId === 'subnode-inbox') return 'Inbox';
    const subnode = nodes.find(n => n.id === subnodeId);
    if (!subnode) return '';

    const edgeToSubnode = edges.find(e => e.target === subnodeId);
    if (!edgeToSubnode) return '';

    const parentNode = nodes.find(n => n.id === edgeToSubnode.source);
    if (!parentNode) return '';

    if (parentNode.type === 'initiative') {
        const edgeToInit = edges.find(e => e.target === parentNode.id);
        const threadNode = edgeToInit ? nodes.find(n => n.id === edgeToInit.source) : null;

        if (threadNode && threadNode.type === 'thread') {
            const edgeToThread = edges.find(e => e.target === threadNode.id);
            const pillarNode = edgeToThread ? nodes.find(n => n.id === edgeToThread.source) : null;

            if (pillarNode && pillarNode.type === 'pillar') {
                return `${pillarNode.data.label} > ${threadNode.data.label} > ${parentNode.data.label}`;
            }
            return `${threadNode.data.label} > ${parentNode.data.label}`;
        }
        return parentNode.data.label;
    } else if (parentNode.type === 'thread') {
        const edgeToThread = edges.find(e => e.target === parentNode.id);
        const pillarNode = edgeToThread ? nodes.find(n => n.id === edgeToThread.source) : null;

        if (pillarNode && pillarNode.type === 'pillar') {
            return `${pillarNode.data.label} > ${parentNode.data.label}`;
        }
        return parentNode.data.label;
    }
    return parentNode.data.label;
};

const QuickCapture: FC = () => {
    const navigate = useNavigate();
    const { nodes, edges, addTaskToNode, addResource, deleteTaskFromNode, removeResource } = useLifeMapStore();
    
    // States
    const [captureType, setCaptureType] = useState<'task' | 'resource'>('task');
    const [inputText, setInputText] = useState('');
    const [resourceTitle, setResourceTitle] = useState('');
    const [selectedNodeId, setSelectedNodeId] = useState<string>('subnode-inbox');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAllNodes, setShowAllNodes] = useState(false);
    const [isManualOverride, setIsManualOverride] = useState(false);
    
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus main input on mount
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // Filter nodes list to include only subnodes (execution nodes)
    const subnodes = nodes.filter(n => n.type === 'subnode');

    // Rank subnodes based on count of tasks they contain
    // inbox captures always goes first
    const inboxSubnode = subnodes.find(n => n.id === 'subnode-inbox');
    const otherSubnodes = subnodes.filter(n => n.id !== 'subnode-inbox');
    const rankedOtherSubnodes = [...otherSubnodes].sort((a, b) => {
        const aCount = a.data.tasks?.length || 0;
        const bCount = b.data.tasks?.length || 0;
        return bCount - aCount;
    });
    const allRankedSubnodes = inboxSubnode ? [inboxSubnode, ...rankedOtherSubnodes] : rankedOtherSubnodes;

    // Filter subnodes by search query
    const filteredSubnodes = allRankedSubnodes.filter(node => {
        const label = node.data.label.toLowerCase();
        const path = resolveNodePath(node.id, nodes, edges).toLowerCase();
        const query = searchQuery.toLowerCase().trim();
        return label.includes(query) || path.includes(query);
    });

    // Determine which subnodes to show as pills
    // If searching, show all matching subnodes
    // If not searching, show top 10 (or expand to all if showAllNodes is true)
    const visibleSubnodes = searchQuery.trim() !== ''
        ? filteredSubnodes
        : (showAllNodes ? filteredSubnodes : filteredSubnodes.slice(0, 10));

    // Handle input change and auto-detect URL
    const handleInputChange = (val: string) => {
        setInputText(val);

        if (val.trim() === '') {
            setIsManualOverride(false);
            setCaptureType('task');
            return;
        }

        if (!isManualOverride) {
            if (isUrl(val)) {
                setCaptureType('resource');
            } else {
                setCaptureType('task');
            }
        }
    };

    // Manual type selection overrides auto-detection
    const handleTypeSelect = (type: 'task' | 'resource') => {
        setCaptureType(type);
        setIsManualOverride(true);
    };

    // Compile Recent Captures (Top 20) across all nodes
    const getRecentCaptures = () => {
        const recentTasks = nodes.flatMap(node => 
            (node.data.tasks || []).map(t => {
                const ts = t.createdAt || (parseFloat(t.id.replace('task-', '')) || 0);
                return {
                    id: t.id,
                    type: 'task' as const,
                    title: t.text,
                    details: t.completed ? 'Completed' : 'Active',
                    createdAt: ts,
                    nodeId: node.id,
                    nodeLabel: node.data.label,
                    path: resolveNodePath(node.id, nodes, edges)
                };
            })
        );

        const recentResources = nodes.flatMap(node => 
            (node.data.resources || []).map(r => {
                const ts = r.createdAt || (parseFloat(r.id.replace('res-', '')) || 0);
                return {
                    id: r.id,
                    type: 'resource' as const,
                    title: r.title,
                    details: r.url,
                    resType: r.type,
                    createdAt: ts,
                    nodeId: node.id,
                    nodeLabel: node.data.label,
                    path: resolveNodePath(node.id, nodes, edges)
                };
            })
        );

        return [...recentTasks, ...recentResources]
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 20);
    };

    const recentCaptures = getRecentCaptures();

    // Handle delete action
    const handleDeleteRecent = (itemId: string, nodeId: string, type: 'task' | 'resource') => {
        if (type === 'task') {
            deleteTaskFromNode(nodeId, itemId);
            toast.success('Task removed');
        } else {
            removeResource(nodeId, itemId);
            toast.success('Resource removed');
        }
    };

    // Form Submission
    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        const content = inputText.trim();
        if (!content) {
            toast.error('Please enter content to capture');
            return;
        }

        const targetNode = selectedNodeId || 'subnode-inbox';
        const targetNodeLabel = nodes.find(n => n.id === targetNode)?.data.label || 'Inbox';

        if (captureType === 'task') {
            addTaskToNode(targetNode, content);
            toast.success(`Task added to "${targetNodeLabel}"`);
        } else {
            // Resource
            const url = cleanUrl(content);
            const resType = detectResourceType(url);
            const title = resourceTitle.trim() || content;

            addResource(targetNode, {
                id: `res-${Date.now()}`,
                title,
                url,
                type: resType,
                createdAt: Date.now()
            });
            toast.success(`Resource added to "${targetNodeLabel}"`);
        }

        // Reset state
        setInputText('');
        setResourceTitle('');
        setIsManualOverride(false);
        setCaptureType('task');
        
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    // Calculate time elapsed
    const formatTimeAgo = (ts: number) => {
        if (ts === 0) return 'unknown';
        const diffMs = Date.now() - ts;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    return (
        <div className="min-h-full bg-background pb-12 flex flex-col items-center px-0 sm:px-4">
            
            {/* Top Bar Navigation */}
            <div className="w-full max-w-md px-4 py-4 flex items-center justify-between border-b border-border/40 backdrop-blur-md sticky top-0 bg-background/80 z-20 shrink-0">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => navigate(-1)}
                    className="h-10 w-10 rounded-lg text-text-secondary hover:text-white hover:bg-surface-elevated"
                >
                    <ArrowLeft size={20} />
                </Button>
                <div className="flex items-center gap-2 font-bold tracking-tight text-white text-lg">
                    <Zap size={18} className="text-accent fill-accent/15" />
                    <span>Quick Capture</span>
                </div>
                <div className="w-10 h-10" /> {/* Spacer for symmetry */}
            </div>

            {/* Main Content Area */}
            <div className="w-full max-w-md px-4 sm:px-0 mt-4 sm:mt-6 flex-1 flex flex-col justify-between">
                
                {/* FIRST FOLD: The Capturing Form */}
                <div className="space-y-6 flex-1">
                    
                    {/* Header Banner */}
                    <div className="flex items-center gap-2 px-1 py-1">
                        <Sparkles size={18} className="text-accent" />
                        <h2 className="text-lg font-bold text-white">Capture Idea</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Segmented control for Type */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-text-secondary uppercase tracking-widest pl-0.5">Capture Type</Label>
                            <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-surface-elevated border border-border/40 rounded-2xl">
                                <button
                                    type="button"
                                    onClick={() => handleTypeSelect('task')}
                                    className={cn(
                                        "flex items-center justify-center gap-2.5 py-3.5 sm:py-3 rounded-xl text-sm font-bold transition-all duration-200 active:scale-98",
                                        captureType === 'task' 
                                            ? "bg-accent text-white shadow-lg shadow-accent/10" 
                                            : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                                    )}
                                >
                                    <FileText size={16} />
                                    <span>Task / Todo</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleTypeSelect('resource')}
                                    className={cn(
                                        "flex items-center justify-center gap-2.5 py-3.5 sm:py-3 rounded-xl text-sm font-bold transition-all duration-200 active:scale-98",
                                        captureType === 'resource' 
                                            ? "bg-accent text-white shadow-lg shadow-accent/10" 
                                            : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                                    )}
                                >
                                    <LinkIcon size={16} />
                                    <span>Link / Resource</span>
                                </button>
                            </div>
                        </div>

                        {/* Main Text Input */}
                        <div className="space-y-2">
                            <Label htmlFor="inputText" className="text-xs font-bold text-text-secondary uppercase tracking-widest pl-0.5">
                                {captureType === 'task' ? 'Task Description' : 'Resource URL'}
                            </Label>
                            <Input
                                id="inputText"
                                ref={inputRef}
                                placeholder={captureType === 'task' ? '' : 'Paste website link, youtube or medium URL...'}
                                value={inputText}
                                onChange={(e) => handleInputChange(e.target.value)}
                                className="bg-surface border-border/80 focus:border-accent text-base rounded-2xl h-14 px-4 shadow-sm"
                            />
                        </div>

                        {/* Optional Title Input for resources */}
                        {captureType === 'resource' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-3 duration-350">
                                <Label htmlFor="resourceTitle" className="text-xs font-bold text-text-secondary uppercase tracking-widest pl-0.5">
                                    Resource Title <span className="text-text-secondary/40 font-normal lowercase">(optional)</span>
                                </Label>
                                <Input
                                    id="resourceTitle"
                                    placeholder="Add a friendly title..."
                                    value={resourceTitle}
                                    onChange={(e) => setResourceTitle(e.target.value)}
                                    className="bg-surface border-border/80 focus:border-accent text-base rounded-2xl h-14 px-4 shadow-sm"
                                />
                            </div>
                        )}

                        {/* Pill-based Execution Node Selector */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-text-secondary uppercase tracking-widest pl-0.5">Target Execution Node</Label>
                                {searchQuery.trim() === '' && subnodes.length > 10 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAllNodes(!showAllNodes)}
                                        className="text-accent hover:text-accent-hover text-xs font-bold flex items-center gap-1 transition-colors py-1 px-1.5 rounded hover:bg-accent/5"
                                    >
                                        <span>{showAllNodes ? 'Show Less' : `Show All (${subnodes.length})`}</span>
                                        {showAllNodes ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </button>
                                )}
                            </div>

                            {/* Search Filter for Pills */}
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-text-secondary h-4 w-4" />
                                <Input
                                    placeholder="Filter nodes..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-surface-elevated/40 border-border/40 focus:border-accent text-base rounded-xl h-11"
                                />
                            </div>

                            {/* Pills Grid Container */}
                            <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto pr-1 py-1">
                                {visibleSubnodes.length === 0 ? (
                                    <div className="w-full text-center py-4 text-xs text-text-secondary italic">
                                        No matching execution nodes found.
                                    </div>
                                ) : (
                                    visibleSubnodes.map((node) => {
                                        const hue = node.data.hue || 210;
                                        const isSelected = selectedNodeId === node.id;
                                        const taskCount = node.data.tasks?.length || 0;

                                        return (
                                            <button
                                                key={node.id}
                                                type="button"
                                                onClick={() => setSelectedNodeId(node.id)}
                                                style={{
                                                    borderColor: isSelected ? `hsl(${hue}, 70%, 50%)` : 'rgba(255,255,255,0.08)',
                                                    backgroundColor: isSelected ? `hsla(${hue}, 75%, 15%, 0.45)` : 'rgba(255,255,255,0.02)',
                                                    color: isSelected ? 'white' : 'var(--text-secondary)'
                                                }}
                                                className={cn(
                                                    "inline-flex items-center gap-2 py-2 px-3.5 rounded-xl border text-xs font-semibold transition-all duration-150 active:scale-95 hover:text-white",
                                                    isSelected ? "shadow-md" : "hover:border-white/10 hover:bg-white/5"
                                                )}
                                            >
                                                {/* Left Hue Dot */}
                                                <span 
                                                    className="w-2 h-2 rounded-full shrink-0" 
                                                    style={{ backgroundColor: `hsl(${hue}, 70%, 55%)` }}
                                                />
                                                
                                                <span className="truncate max-w-[150px]">{node.data.label}</span>
                                                
                                                {/* Task count badge */}
                                                {taskCount > 0 && (
                                                    <span className="bg-white/5 text-[9px] px-1 rounded font-bold">
                                                        {taskCount}
                                                    </span>
                                                )}

                                                {isSelected && <Check size={11} className="text-white shrink-0 ml-0.5" />}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                            
                            {/* Selected Node Path Subtext */}
                            {selectedNodeId && (
                                <div className="text-[10px] text-text-secondary/70 font-semibold pl-1">
                                    Path: {resolveNodePath(selectedNodeId, nodes, edges)}
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <Button 
                            type="submit" 
                            className="w-full bg-accent hover:bg-accent-hover text-white font-bold h-14 rounded-2xl shadow-xl shadow-accent/15 transition-all text-base mt-2 flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            <Zap size={16} className="fill-white" />
                            <span>Capture Item</span>
                        </Button>
                    </form>
                </div>

                {/* Divider to separate folds */}
                <div className="w-full py-8 flex items-center justify-center opacity-30 select-none">
                    <div className="w-full h-[1px] bg-border" />
                    <span className="px-3 text-[10px] uppercase font-bold tracking-widest text-text-secondary whitespace-nowrap flex items-center gap-1.5">
                        <Clock size={10} /> Scroll for Recents
                    </span>
                    <div className="w-full h-[1px] bg-border" />
                </div>

                {/* SECOND FOLD: Recent Captures list (below the fold) */}
                <div className="space-y-4 pb-12">
                    <div className="flex items-center gap-2 px-1">
                        <Clock size={16} className="text-text-secondary" />
                        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest">Recent Captures (Top 20)</h3>
                    </div>

                    <div className="space-y-3">
                        {recentCaptures.length === 0 ? (
                            <div className="text-center p-8 bg-surface/30 border border-dashed border-border/40 rounded-2xl text-xs text-text-secondary">
                                No items captured recently. Try capturing a task or link above!
                            </div>
                        ) : (
                            recentCaptures.map((item) => (
                                <Card key={item.id} className="border-border/40 bg-surface/50 hover:bg-surface/75 backdrop-blur-sm rounded-2xl p-4 flex.col transition-colors group shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className="mt-0.5 shrink-0">
                                                {item.type === 'task' ? (
                                                    <div className="p-2 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20">
                                                        <CheckCircle2 size={15} />
                                                    </div>
                                                ) : (
                                                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                        <LinkIcon size={15} />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-bold text-white break-words pr-2 leading-relaxed">
                                                    {item.title}
                                                </div>
                                                
                                                {item.type === 'resource' && (
                                                    <a 
                                                        href={cleanUrl(item.details)} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-[10px] text-accent hover:underline inline-flex items-center gap-0.5 mt-1 select-none font-bold truncate max-w-[200px]"
                                                    >
                                                        <span>Open link</span>
                                                        <ExternalLink size={9} />
                                                    </a>
                                                )}

                                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                    <Badge variant="secondary" className="text-[9px] font-bold px-2 py-0.5 bg-surface-elevated text-text-secondary border border-border/20 rounded-lg">
                                                        {item.nodeLabel}
                                                    </Badge>
                                                    <span className="text-[10px] text-text-secondary font-medium">
                                                        &bull; {formatTimeAgo(item.createdAt)}
                                                    </span>
                                                </div>
                                                {item.path && item.nodeId !== 'subnode-inbox' && (
                                                    <div className="text-[9px] text-text-secondary/60 font-semibold truncate mt-1">
                                                        {item.path}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteRecent(item.id, item.nodeId, item.type)}
                                            className="h-8 w-8 text-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded-lg shrink-0"
                                            title="Delete Capture"
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default QuickCapture;
