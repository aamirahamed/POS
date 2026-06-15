import { FC, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLifeMapStore } from '@/store/useLifeMapStore';
import { LifeMapNode } from '@/types/lifemap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { toast } from 'sonner';
import { 
    Zap, 
    ArrowLeft, 
    Check, 
    ChevronsUpDown, 
    Sparkles, 
    Link as LinkIcon, 
    FileText, 
    Clock, 
    Trash2, 
    ExternalLink, 
    CheckCircle2
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
    const [openSelect, setOpenSelect] = useState(false);
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
        <div className="min-h-full bg-background pb-12 flex flex-col items-center">
            
            {/* Top Bar Navigation */}
            <div className="w-full max-w-md px-4 py-4 flex items-center justify-between border-b border-border/40 backdrop-blur-md sticky top-0 bg-background/80 z-20 shrink-0">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => navigate(-1)}
                    className="h-9 w-9 rounded-lg"
                >
                    <ArrowLeft size={18} />
                </Button>
                <div className="flex items-center gap-1.5 font-bold tracking-tight text-white">
                    <Zap size={16} className="text-accent fill-accent/15" />
                    <span>Quick Capture</span>
                </div>
                <div className="w-9 h-9" /> {/* Spacer for symmetry */}
            </div>

            <div className="w-full max-w-md px-4 mt-6 space-y-6">
                
                {/* Form Card */}
                <Card className="border-border/60 bg-surface/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden relative">
                    <CardHeader className="pb-4 pt-6">
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
                            <Sparkles size={16} className="text-accent" />
                            <span>Capture Idea</span>
                        </CardTitle>
                        <CardDescription className="text-xs text-text-secondary">
                            Auto-detects URLs. Leave Node empty to place in Inbox.
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            
                            {/* Segmented control for Type */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Capture Type</Label>
                                <div className="grid grid-cols-2 gap-1 p-1 bg-surface-elevated border border-border/40 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => handleTypeSelect('task')}
                                        className={cn(
                                            "flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200",
                                            captureType === 'task' 
                                                ? "bg-accent text-white shadow-md" 
                                                : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                                        )}
                                    >
                                        <FileText size={14} />
                                        <span>Task / Todo</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleTypeSelect('resource')}
                                        className={cn(
                                            "flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200",
                                            captureType === 'resource' 
                                                ? "bg-accent text-white shadow-md" 
                                                : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                                        )}
                                    >
                                        <LinkIcon size={14} />
                                        <span>Link / Resource</span>
                                    </button>
                                </div>
                            </div>

                            {/* Main Text Input */}
                            <div className="space-y-1.5">
                                <Label htmlFor="inputText" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                    {captureType === 'task' ? 'Task Description' : 'Resource URL'}
                                </Label>
                                <Input
                                    id="inputText"
                                    ref={inputRef}
                                    placeholder={captureType === 'task' ? 'Buy groceries, code next layout...' : 'Paste youtube.com, medium.com or website URL...'}
                                    value={inputText}
                                    onChange={(e) => handleInputChange(e.target.value)}
                                    className="bg-surface border-border/80 focus:border-accent text-sm rounded-xl py-5"
                                />
                            </div>

                            {/* Optional Title Input for resources */}
                            {captureType === 'resource' && (
                                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <Label htmlFor="resourceTitle" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                        Resource Title <span className="text-text-secondary/50 font-normal lowercase">(optional)</span>
                                    </Label>
                                    <Input
                                        id="resourceTitle"
                                        placeholder="Add a friendly title (e.g. NextJS Routing Video)..."
                                        value={resourceTitle}
                                        onChange={(e) => setResourceTitle(e.target.value)}
                                        className="bg-surface border-border/80 focus:border-accent text-sm rounded-xl py-5"
                                    />
                                </div>
                            )}

                            {/* Execution Node Combobox Dropdown */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Target Execution Node</Label>
                                <Popover open={openSelect} onOpenChange={setOpenSelect}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openSelect}
                                            className="w-full justify-between bg-surface border-border/80 hover:bg-surface text-text-primary text-sm font-normal rounded-xl py-5 shadow-sm"
                                        >
                                            <span className="truncate">
                                                {selectedNodeId === 'subnode-inbox' 
                                                    ? 'Inbox (Threadless Captures)' 
                                                    : subnodes.find(n => n.id === selectedNodeId)?.data.label || 'Inbox (Threadless)'}
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[calc(100vw-32px)] max-w-sm p-0 border-border bg-surface shadow-2xl rounded-2xl overflow-hidden z-[1000]">
                                        <Command className="bg-surface text-text-primary">
                                            <CommandInput placeholder="Search execution nodes..." className="text-sm py-3 border-none bg-surface-elevated text-text-primary" />
                                            <CommandList className="max-h-[200px] overflow-auto">
                                                <CommandEmpty>No execution nodes found.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem
                                                        value="inbox-subnode-threadless"
                                                        onSelect={() => {
                                                            setSelectedNodeId('subnode-inbox');
                                                            setOpenSelect(false);
                                                        }}
                                                        className="cursor-pointer text-xs font-semibold py-2.5 px-3 flex items-center justify-between"
                                                    >
                                                        <span>📥 Inbox (Threadless captures)</span>
                                                        {selectedNodeId === 'subnode-inbox' && <Check className="h-4 w-4 text-accent" />}
                                                    </CommandItem>
                                                    {subnodes
                                                        .filter(n => n.id !== 'subnode-inbox')
                                                        .map((node) => {
                                                            const path = resolveNodePath(node.id, nodes, edges);
                                                            return (
                                                                <CommandItem
                                                                    key={node.id}
                                                                    value={`${node.data.label} ${path}`}
                                                                    onSelect={() => {
                                                                        setSelectedNodeId(node.id);
                                                                        setOpenSelect(false);
                                                                    }}
                                                                    className="cursor-pointer py-3 px-3 flex flex-col items-start gap-0.5 border-t border-border/10"
                                                                >
                                                                    <div className="flex items-center justify-between w-full">
                                                                        <span className="font-bold text-xs text-white">{node.data.label}</span>
                                                                        {selectedNodeId === node.id && <Check className="h-4 w-4 text-accent shrink-0" />}
                                                                    </div>
                                                                    <span className="text-[10px] text-text-secondary truncate max-w-full font-medium">
                                                                        {path}
                                                                    </span>
                                                                </CommandItem>
                                                            );
                                                        })
                                                    }
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                {selectedNodeId && selectedNodeId !== 'subnode-inbox' && (
                                    <div className="text-[10px] text-text-secondary font-semibold pl-1">
                                        Path: {resolveNodePath(selectedNodeId, nodes, edges)}
                                    </div>
                                )}
                            </div>

                            {/* Submit Button */}
                            <Button 
                                type="submit" 
                                className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-5 rounded-xl shadow-lg shadow-accent/20 transition-all text-sm mt-2 flex items-center justify-center gap-1.5 active:scale-[0.98]"
                            >
                                <Zap size={14} className="fill-white" />
                                <span>Capture Item</span>
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Recent Items List */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <Clock size={14} className="text-text-secondary" />
                        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Recent Captures (Top 20)</h3>
                    </div>

                    <div className="space-y-2.5">
                        {recentCaptures.length === 0 ? (
                            <div className="text-center p-8 bg-surface/30 border border-dashed border-border/40 rounded-2xl text-xs text-text-secondary">
                                No items captured recently. Try capturing a task or link above!
                            </div>
                        ) : (
                            recentCaptures.map((item) => (
                                <Card key={item.id} className="border-border/40 bg-surface/50 hover:bg-surface/75 backdrop-blur-sm rounded-xl p-3 flex.col transition-colors group shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-2.5 min-w-0">
                                            <div className="mt-0.5 shrink-0">
                                                {item.type === 'task' ? (
                                                    <div className="p-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">
                                                        <CheckCircle2 size={13} />
                                                    </div>
                                                ) : (
                                                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                        <LinkIcon size={13} />
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
                                                        className="text-[10px] text-accent hover:underline flex items-center gap-0.5 mt-1 select-none font-medium truncate max-w-[200px]"
                                                    >
                                                        <span>Open link</span>
                                                        <ExternalLink size={8} />
                                                    </a>
                                                )}

                                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                    <Badge variant="secondary" className="text-[9px] font-bold px-1.5 py-0 bg-surface-elevated text-text-secondary border border-border/20 rounded">
                                                        {item.nodeLabel}
                                                    </Badge>
                                                    <span className="text-[9px] text-text-secondary font-medium">
                                                        &bull; {formatTimeAgo(item.createdAt)}
                                                    </span>
                                                </div>
                                                {item.path && item.nodeId !== 'subnode-inbox' && (
                                                    <div className="text-[8px] text-text-secondary/60 font-semibold truncate mt-1">
                                                        {item.path}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteRecent(item.id, item.nodeId, item.type)}
                                            className="h-7 w-7 text-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded-lg shrink-0"
                                            title="Delete Capture"
                                        >
                                            <Trash2 size={13} />
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
