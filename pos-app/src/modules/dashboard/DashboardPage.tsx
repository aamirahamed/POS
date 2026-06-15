import { FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLifeMapStore } from '@/store/useLifeMapStore';
import { useRemindersStore } from '@/store/useRemindersStore';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useTodayStore, FocusItem } from '@/store/useTodayStore';
import { CalendarSection } from './components/CalendarSection';
import { Sparkles, ArrowRight, Bot, Plus, ListTodo, Target, Map, ShoppingCart, Zap, X, Bell, Clock, Calendar, Trash2, Check, Inbox, ExternalLink, Link as LinkIcon, Search, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

// Helper: clean URL
const cleanUrl = (urlStr: string) => {
    if (!/^https?:\/\//i.test(urlStr)) {
        return `https://${urlStr}`;
    }
    return urlStr;
};

// Helper: Resolve parent path for subnodes
const resolveNodePath = (subnodeId: string, nodesList: any[], edgesList: any[]): string => {
    if (subnodeId === 'subnode-inbox') return 'Inbox';
    const subnode = nodesList.find(n => n.id === subnodeId);
    if (!subnode) return '';

    const edgeToSubnode = edgesList.find(e => e.target === subnodeId);
    if (!edgeToSubnode) return '';

    const parentNode = nodesList.find(n => n.id === edgeToSubnode.source);
    if (!parentNode) return '';

    if (parentNode.type === 'initiative') {
        const edgeToInit = edgesList.find(e => e.target === parentNode.id);
        const threadNode = edgeToInit ? nodesList.find(n => n.id === edgeToInit.source) : null;

        if (threadNode && threadNode.type === 'thread') {
            const edgeToThread = edgesList.find(e => e.target === threadNode.id);
            const pillarNode = edgeToThread ? nodesList.find(n => n.id === edgeToThread.source) : null;

            if (pillarNode && pillarNode.type === 'pillar') {
                return `${pillarNode.data.label} > ${threadNode.data.label} > ${parentNode.data.label}`;
            }
            return `${threadNode.data.label} > ${parentNode.data.label}`;
        }
        return parentNode.data.label;
    } else if (parentNode.type === 'thread') {
        const edgeToThread = edgesList.find(e => e.target === parentNode.id);
        const pillarNode = edgeToThread ? nodesList.find(n => n.id === edgeToThread.source) : null;

        if (pillarNode && pillarNode.type === 'pillar') {
            return `${pillarNode.data.label} > ${parentNode.data.label}`;
        }
        return parentNode.data.label;
    }
    return parentNode.data.label;
};

const DashboardPage: FC = () => {
    const navigate = useNavigate();
    
    // Stores
    const { 
        nodes, 
        edges, 
        setCommandCenterOpen,
        addTaskToNode,
        addResource,
        deleteTaskFromNode,
        removeResource,
        loadFromDB
    } = useLifeMapStore();
    const { reminders } = useRemindersStore();
    const { items: shoppingItems, addItem: addShoppingItem } = useShoppingStore();
    const { focusItems, addFocusNode, removeFocusNode } = useTodayStore();

    // Local State
    const [showFocusSelector, setShowFocusSelector] = useState(false);
    const [itemSearchQueries, setItemSearchQueries] = useState<Record<string, string>>({});

    // Quick Capture States
    const [captureType, setCaptureType] = useState<'task' | 'resource'>('task');
    const [captureInputText, setCaptureInputText] = useState('');
    const [captureResourceTitle, setCaptureResourceTitle] = useState('');
    const [captureSelectedNodeId, setCaptureSelectedNodeId] = useState<string>('subnode-inbox');
    const [captureSearchQuery, setCaptureSearchQuery] = useState('');
    const [showAllNodes, setShowAllNodes] = useState(false);
    const [isManualOverride, setIsManualOverride] = useState(false);

    // Load life map from DB on mount
    useEffect(() => {
        loadFromDB();
    }, [loadFromDB]);
    
    // Live Time State
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Derived Stats
    const activeReminders = reminders.filter(r => !r.completed).length;
    const activeFocuses = focusItems.length;
    const backlogInitiatives = nodes.filter(n => n.type === 'initiative' && n.data.status === 'backlog').length;

    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    // Quick Capture Logic & Helpers
    const handleCaptureInputChange = (val: string) => {
        setCaptureInputText(val);

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

    const handleCaptureTypeSelect = (type: 'task' | 'resource') => {
        setCaptureType(type);
        setIsManualOverride(true);
    };

    const handleCaptureSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        const content = captureInputText.trim();
        if (!content) {
            toast.error('Please enter content to capture');
            return;
        }

        const targetNode = captureSelectedNodeId || 'subnode-inbox';
        const targetNodeLabel = nodes.find(n => n.id === targetNode)?.data.label || 'Inbox';

        if (captureType === 'task') {
            addTaskToNode(targetNode, content);
            toast.success(`Task added to "${targetNodeLabel}"`);
        } else {
            // Resource
            const url = cleanUrl(content);
            const resType = detectResourceType(url);
            const title = captureResourceTitle.trim() || content;

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
        setCaptureInputText('');
        setCaptureResourceTitle('');
        setIsManualOverride(false);
        setCaptureType('task');
    };

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
        const query = captureSearchQuery.toLowerCase().trim();
        return label.includes(query) || path.includes(query);
    });

    // Determine which subnodes to show as pills
    const visibleSubnodes = captureSearchQuery.trim() !== ''
        ? filteredSubnodes
        : (showAllNodes ? filteredSubnodes : filteredSubnodes.slice(0, 10));

    // Focus Candidates
    const focusCandidates = nodes.filter(n => 
        (n.type === 'initiative' || n.type === 'subnode') && 
        n.data.status !== 'completed' && n.data.status !== 'archived' &&
        !focusItems.some(f => f.id === n.id)
    );

    // Filter out target execution nodes
    const executionNodes = nodes.filter(n => n.type === 'subnode' && n.id !== 'subnode-inbox');

    // Get inbox subnode items
    const inboxTasks = inboxSubnode?.data?.tasks || [];
    const inboxResources = inboxSubnode?.data?.resources || [];
    const inboxItems = [
        ...inboxTasks.map(t => ({ ...t, type: 'task' as const })),
        ...inboxResources.map(r => ({ ...r, type: 'resource' as const, text: r.title }))
    ].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const handleMoveItem = (itemId: string, type: 'task' | 'resource', targetNodeId: string) => {
        const targetNode = nodes.find(n => n.id === targetNodeId);
        const targetNodeLabel = targetNode?.data?.label || 'Target Node';

        if (type === 'task') {
            const task = inboxTasks.find(t => t.id === itemId);
            if (task) {
                addTaskToNode(targetNodeId, task.text);
                deleteTaskFromNode('subnode-inbox', itemId);
                toast.success(`Moved task to "${targetNodeLabel}"`);
            }
        } else {
            const resource = inboxResources.find(r => r.id === itemId);
            if (resource) {
                addResource(targetNodeId, resource);
                removeResource('subnode-inbox', itemId);
                toast.success(`Moved resource to "${targetNodeLabel}"`);
            }
        }
    };

    const handleDeleteInboxItem = (itemId: string, type: 'task' | 'resource') => {
        if (type === 'task') {
            deleteTaskFromNode('subnode-inbox', itemId);
            toast.success("Discarded inbox task");
        } else {
            removeResource('subnode-inbox', itemId);
            toast.success("Discarded inbox resource");
        }
    };


    // Render Focus Items with Notes & Duration
    const renderFocusItem = (focus: FocusItem) => {
        const node = nodes.find(n => n.id === focus.id);
        if (!node) return null;

        const isExecution = node.type === 'subnode';
        const parentNode = nodes.find(n => n.id === node.data.parentId);
        const daysInFocus = Math.floor((Date.now() - focus.addedAt) / (1000 * 60 * 60 * 24));
        const durationText = daysInFocus === 0 ? 'Today' : daysInFocus === 1 ? '1 day' : `${daysInFocus}d`;
        const latestNote = focus.notes[focus.notes.length - 1];

        const goToLifeMap = () => {
            if (isExecution) useLifeMapStore.getState().setSelectedExecutionNodeId(node.id);
            navigate('/life-map');
        };

        return (
            <div key={focus.id} className="flex items-center gap-3 bg-surface-elevated border border-border rounded-xl px-3 py-2.5 hover:bg-surface-hover transition-colors group relative shadow-sm">
                {/* Icon */}
                <div
                    onClick={goToLifeMap}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 cursor-pointer ${isExecution ? 'bg-indigo-500/10 text-indigo-400' : 'bg-blue-500/10 text-blue-400'}`}
                >
                    {isExecution ? <ListTodo size={15} /> : <Target size={15} />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0" onClick={goToLifeMap}>
                    <div className="flex items-center gap-2 cursor-pointer">
                        <span className="text-sm font-semibold text-text-primary hover:text-white truncate leading-tight">{node.data.label}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {parentNode && (
                            <span className="text-[11px] font-medium text-text-secondary/70 truncate">{parentNode.data.label}</span>
                        )}
                        <span className="text-[10px] text-text-secondary/50 flex items-center gap-1 shrink-0">
                            <Clock size={10} />
                            {durationText}
                        </span>
                        {latestNote && (
                            <span className="text-[11px] text-text-secondary/60 italic truncate max-w-[140px]">"{latestNote.text}"</span>
                        )}
                    </div>
                </div>

                {/* Remove */}
                <button
                    onClick={() => removeFocusNode(focus.id)}
                    className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 lg:group-hover:opacity-100 transition-all shrink-0"
                >
                    <X size={14} />
                </button>
            </div>
        );
    };




    // Generate lightweight suggestions
    const suggestions = [];
    if (backlogInitiatives > 3) suggestions.push(`You have ${backlogInitiatives} initiatives in backlog. Consider activating one.`);
    if (activeReminders > 0) suggestions.push(`You have ${activeReminders} active reminders to review.`);
    if (shoppingItems.filter(i => !i.completed).length > 5) suggestions.push(`Your shopping list has over 5 items pending.`);
    if (suggestions.length === 0) suggestions.push(`Everything is on track. Have a great day!`);

    return (
        <div className="min-h-screen bg-background text-text-primary pb-24 md:pb-12">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 lg:space-y-10">

                {/* ── GREETING ─────────────────────────────────────────── */}
                <section>
                    <div className="flex items-start justify-between gap-4">
                        {/* Left: date + greeting */}
                        <div className="flex flex-col gap-1.5">
                            <div className="text-xs font-bold text-text-secondary flex items-center gap-2 uppercase tracking-widest">
                                <Calendar size={13} className="text-accent" />
                                {format(now, 'EEEE, MMMM d')}
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                                {greeting}, Aamir
                            </h1>
                        </div>

                        {/* Right: large clock */}
                        <div className="flex flex-col items-end shrink-0">
                            <span className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight tabular-nums leading-none">
                                {format(now, 'h:mm')}
                            </span>
                            <span className="text-xs font-bold uppercase tracking-widest text-text-secondary/60 mt-1">
                                {format(now, 'a')}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-4">
                        <div className="flex items-center gap-2 bg-surface px-3.5 py-2 rounded-xl border border-border text-sm">
                            <Bell size={14} className="text-amber-400" />
                            <span className="font-medium text-white">{activeReminders}</span>
                            <span className="text-text-secondary">reminders</span>
                        </div>
                        <div className="flex items-center gap-2 bg-surface px-3.5 py-2 rounded-xl border border-border text-sm">
                            <Target size={14} className="text-blue-400" />
                            <span className="font-medium text-white">{activeFocuses}</span>
                            <span className="text-text-secondary">active focuses</span>
                        </div>
                        <div className="flex items-center gap-2 bg-surface px-3.5 py-2 rounded-xl border border-border text-sm">
                            <Zap size={14} className="text-indigo-400" />
                            <span className="font-medium text-white">{backlogInitiatives}</span>
                            <span className="text-text-secondary">in backlog</span>
                        </div>
                    </div>
                </section>

                {/* ── TWO-ZONE GRID ─────────────────────────────────────── */}
                <div className="flex flex-col gap-6 lg:gap-8">

                    {/* ══ ZONE 1: FOCUS & CAPTURE ════════════════════════════
                        Horizontal split: Focus (left 62%) | Brain Dump (right 38%) */}
                    <div className="bg-surface border border-border rounded-3xl shadow-sm overflow-hidden">

                        {/* Zone label */}
                        <div className="px-6 pt-4 pb-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50">Focus & Capture Zone</p>
                        </div>

                        {/* ── HORIZONTAL SPLIT ── */}
                        <div className="flex flex-col md:flex-row">

                            {/* ── LEFT: TODAY'S FOCUS (62%) ── */}
                            <div className="flex-[62] p-5 space-y-4 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                                        <Target size={16} className="text-accent shrink-0" />
                                        Today's Focus
                                    </h2>
                                    <button
                                        onClick={() => setShowFocusSelector(!showFocusSelector)}
                                        className="text-xs font-medium text-accent hover:text-accent-hover flex items-center gap-1 bg-accent/10 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
                                    >
                                        <Plus size={13} /> Add
                                    </button>
                                </div>

                                {showFocusSelector && (
                                    <div className="p-3 bg-surface-elevated border border-border rounded-xl animate-in fade-in slide-in-from-top-2 shadow-lg">
                                        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2.5">Select from Life Map</h3>
                                        <div className="max-h-44 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                                            {focusCandidates.length === 0 ? (
                                                <p className="text-sm text-text-secondary">No available active initiatives or nodes.</p>
                                            ) : (
                                                focusCandidates.map(node => (
                                                    <div key={node.id} className="flex items-center justify-between p-2.5 bg-surface hover:bg-surface-hover rounded-lg cursor-pointer border border-transparent hover:border-border transition-colors" onClick={() => { addFocusNode(node.id); setShowFocusSelector(false); }}>
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${node.type === 'subnode' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                                {node.type === 'subnode' ? <ListTodo size={12} /> : <Target size={12} />}
                                                            </div>
                                                            <span className="text-sm font-medium text-white truncate">{node.data.label}</span>
                                                        </div>
                                                        <Plus size={13} className="text-text-secondary shrink-0" />
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2.5">
                                    {focusItems.length === 0 ? (
                                        <div className="py-6 border border-dashed border-border rounded-xl text-center flex flex-col items-center gap-2.5 bg-surface-elevated/40">
                                            <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center shadow-sm">
                                                <Target size={18} className="text-text-secondary" />
                                            </div>
                                            <p className="text-xs text-text-secondary max-w-[200px]">No focus set. Choose your priorities intentionally.</p>
                                        </div>
                                    ) : (
                                        focusItems.map(renderFocusItem)
                                    )}
                                </div>
                            </div>

                            {/* ── Vertical Divider (desktop) / Horizontal Divider (mobile) ── */}
                            <div className="hidden md:block w-px bg-border/60 my-5" />
                            <div className="md:hidden mx-5 border-t border-border/60" />

                            {/* ── RIGHT: QUICK CAPTURE (38%) ── */}
                            <div className="flex-[38] p-5 space-y-4 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                                        <Zap size={16} className="text-accent shrink-0 fill-accent/15" />
                                        Quick Capture
                                    </h2>
                                    {captureSearchQuery.trim() === '' && subnodes.length > 10 && (
                                        <button
                                            type="button"
                                            onClick={() => setShowAllNodes(!showAllNodes)}
                                            className="text-accent hover:text-accent-hover text-xs font-bold flex items-center gap-0.5 transition-colors py-1 px-1.5 rounded hover:bg-accent/5"
                                        >
                                            <span>{showAllNodes ? 'Show Less' : `Show All (${subnodes.length})`}</span>
                                            {showAllNodes ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                        </button>
                                    )}
                                </div>

                                <form onSubmit={handleCaptureSubmit} className="space-y-4">
                                    {/* Segmented control for Type */}
                                    <div className="grid grid-cols-2 gap-1 p-1 bg-surface-elevated border border-border/40 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => handleCaptureTypeSelect('task')}
                                            className={cn(
                                                "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all duration-200 active:scale-98",
                                                captureType === 'task' 
                                                    ? "bg-accent text-white shadow-md shadow-accent/10" 
                                                    : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                                            )}
                                        >
                                            <FileText size={13} />
                                            <span>Task / Todo</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleCaptureTypeSelect('resource')}
                                            className={cn(
                                                "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all duration-200 active:scale-98",
                                                captureType === 'resource' 
                                                    ? "bg-accent text-white shadow-md shadow-accent/10" 
                                                    : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                                            )}
                                        >
                                            <LinkIcon size={13} />
                                            <span>Link / Resource</span>
                                        </button>
                                    </div>

                                    {/* Main Text Input */}
                                    <div className="space-y-1">
                                        <label htmlFor="captureInputText" className="text-[10px] font-bold text-text-secondary uppercase tracking-widest pl-0.5">
                                            {captureType === 'task' ? 'Task Description' : 'Resource URL'}
                                        </label>
                                        <Input
                                            id="captureInputText"
                                            placeholder={captureType === 'task' ? '' : 'Paste link or URL...'}
                                            value={captureInputText}
                                            onChange={(e) => handleCaptureInputChange(e.target.value)}
                                            className="bg-surface-elevated border-border/60 focus:border-accent text-sm rounded-xl h-10 px-3 shadow-inner"
                                        />
                                    </div>

                                    {/* Optional Title Input for resources */}
                                    {captureType === 'resource' && (
                                        <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <label htmlFor="captureResourceTitle" className="text-[10px] font-bold text-text-secondary uppercase tracking-widest pl-0.5">
                                                Resource Title <span className="text-text-secondary/40 font-normal lowercase">(optional)</span>
                                            </label>
                                            <Input
                                                id="captureResourceTitle"
                                                placeholder="Add a friendly title..."
                                                value={captureResourceTitle}
                                                onChange={(e) => setCaptureResourceTitle(e.target.value)}
                                                className="bg-surface-elevated border-border/60 focus:border-accent text-sm rounded-xl h-10 px-3 shadow-inner"
                                            />
                                        </div>
                                    )}

                                    {/* Pill-based Execution Node Selector */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest pl-0.5">Target Execution Node</label>
                                        </div>

                                        {/* Search Filter for Pills */}
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-text-secondary h-3 w-3" />
                                            <Input
                                                placeholder="Filter nodes..."
                                                value={captureSearchQuery}
                                                onChange={(e) => setCaptureSearchQuery(e.target.value)}
                                                className="pl-8 bg-surface-elevated/40 border-border/40 focus:border-accent text-xs rounded-lg h-8 text-white focus-visible:ring-0"
                                            />
                                        </div>

                                        {/* Pills Grid Container */}
                                        <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1 py-0.5 custom-scrollbar">
                                            {visibleSubnodes.length === 0 ? (
                                                <div className="w-full text-center py-2 text-[10px] text-text-secondary italic">
                                                    No matching execution nodes.
                                                </div>
                                            ) : (
                                                visibleSubnodes.map((node) => {
                                                    const hue = node.data.hue || 210;
                                                    const isSelected = captureSelectedNodeId === node.id;
                                                    const taskCount = node.data.tasks?.length || 0;
                                                    const path = resolveNodePath(node.id, nodes, edges);

                                                    return (
                                                        <button
                                                            key={node.id}
                                                            type="button"
                                                            onClick={() => setCaptureSelectedNodeId(node.id)}
                                                            style={{
                                                                borderColor: isSelected ? `hsl(${hue}, 70%, 50%)` : 'rgba(255,255,255,0.06)',
                                                                backgroundColor: isSelected ? `hsla(${hue}, 75%, 15%, 0.35)` : 'rgba(255,255,255,0.02)',
                                                                color: isSelected ? 'white' : 'var(--text-secondary)'
                                                            }}
                                                            className={cn(
                                                                "inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg border text-[10px] font-semibold transition-all duration-150 active:scale-95 hover:text-white",
                                                                isSelected ? "shadow-sm" : "hover:border-white/10 hover:bg-white/5"
                                                            )}
                                                            title={path ? `${path} > ${node.data.label}` : node.data.label}
                                                        >
                                                            {/* Left Hue Dot */}
                                                            <span 
                                                                className="w-1.5 h-1.5 rounded-full shrink-0" 
                                                                style={{ backgroundColor: `hsl(${hue}, 70%, 55%)` }}
                                                            />
                                                            
                                                            <span className="truncate max-w-[120px]">{node.data.label}</span>
                                                            
                                                            {/* Task count badge */}
                                                            {taskCount > 0 && (
                                                                <span className="bg-white/5 text-[8px] px-1 rounded font-bold">
                                                                    {taskCount}
                                                                </span>
                                                            )}

                                                            {isSelected && <Check size={9} className="text-white shrink-0 ml-0.5" />}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                        
                                        {/* Selected Node Path Subtext */}
                                        {captureSelectedNodeId && (
                                            <div className="text-[9px] text-text-secondary/60 font-semibold pl-0.5 truncate">
                                                Path: {resolveNodePath(captureSelectedNodeId, nodes, edges)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Submit Button */}
                                    <Button 
                                        type="submit" 
                                        className="w-full bg-accent hover:bg-accent-hover text-white font-bold h-10 rounded-xl shadow-md shadow-accent/10 transition-all text-xs flex items-center justify-center gap-1.5 active:scale-[0.98]"
                                    >
                                        <Zap size={13} className="fill-white" />
                                        <span>Capture Item</span>
                                    </Button>
                                </form>
                            </div>
                        </div>

                        {/* ── HORIZONTAL DIVIDER ── */}
                        <div className="border-t border-border/60 mx-6" />

                        {/* ── BOTTOM ROW: INBOX TRIAGE (100%) ── */}
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <Inbox size={16} className="text-accent shrink-0" />
                                    <span>Inbox Triage</span>
                                    {inboxItems.length > 0 && (
                                        <span className="bg-accent/10 border border-accent/20 text-accent text-xs px-2 py-0.5 rounded-full font-bold ml-1">
                                            {inboxItems.length}
                                        </span>
                                    )}
                                </h2>
                                <span className="text-xs text-text-secondary">Threadless captures needing execution nodes</span>
                            </div>

                            {inboxItems.length === 0 ? (
                                <div className="py-8 text-center text-xs text-text-secondary/70 italic flex flex-col items-center gap-2 bg-surface-elevated/20 border border-dashed border-border/40 rounded-2xl">
                                    <span>🎉 All captured items are assigned! Your Inbox is completely clean.</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                                    {inboxItems.map(item => (
                                        <div key={item.id} className="flex flex-col gap-3 p-3.5 bg-surface-elevated/40 border border-border/40 hover:bg-surface-elevated/60 transition-colors rounded-2xl shadow-sm min-w-0">
                                            {/* Top Row: Icon, Title and Discard */}
                                            <div className="flex items-start justify-between gap-3 min-w-0">
                                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                                    {/* Type icon */}
                                                    <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${item.type === 'task' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                                        {item.type === 'task' ? <Check size={14} /> : <LinkIcon size={14} />}
                                                    </div>
                                                    {/* Content */}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-semibold text-white leading-normal break-words">{item.text}</p>
                                                        {item.type === 'resource' && item.url && (
                                                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent font-bold hover:underline inline-flex items-center gap-0.5 mt-1 select-none">
                                                                <span>View Link</span>
                                                                <ExternalLink size={8} />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Discard Action */}
                                                <button
                                                    onClick={() => handleDeleteInboxItem(item.id, item.type)}
                                                    className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors shrink-0"
                                                    title="Discard Item"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>

                                            {/* Bottom Area: Search and Pills Grid */}
                                            <div className="space-y-2 pt-2 border-t border-white/5 flex flex-col">
                                                {/* Search Box */}
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-text-secondary h-3 w-3" />
                                                    <Input
                                                        placeholder="Search target node..."
                                                        value={itemSearchQueries[item.id] || ''}
                                                        onChange={(e) => setItemSearchQueries(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                        className="pl-7 bg-surface/40 border-border/40 focus:border-accent text-[11px] rounded-lg h-7 text-white focus-visible:ring-0"
                                                    />
                                                </div>

                                                {/* Pills List */}
                                                <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto pr-1 py-0.5 custom-scrollbar">
                                                    {(() => {
                                                        const query = (itemSearchQueries[item.id] || '').toLowerCase().trim();
                                                        const filtered = executionNodes.filter(node => {
                                                            const label = node.data.label.toLowerCase();
                                                            const path = resolveNodePath(node.id, nodes, edges).toLowerCase();
                                                            return label.includes(query) || path.includes(query);
                                                        });

                                                        if (filtered.length === 0) {
                                                            return (
                                                                <div className="w-full py-1 text-[10px] text-text-secondary/70 italic pl-1">
                                                                    No matching execution nodes.
                                                                </div>
                                                            );
                                                        }

                                                        return filtered.map(node => {
                                                            const hue = node.data.hue || 210;
                                                            const path = resolveNodePath(node.id, nodes, edges);

                                                            return (
                                                                <button
                                                                    key={node.id}
                                                                    type="button"
                                                                    onClick={() => handleMoveItem(item.id, item.type, node.id)}
                                                                    style={{
                                                                        borderColor: `hsla(${hue}, 70%, 50%, 0.2)`,
                                                                        backgroundColor: `hsla(${hue}, 75%, 15%, 0.15)`
                                                                    }}
                                                                    className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-md border text-[9px] font-medium text-text-secondary hover:text-white hover:border-white/20 transition-all max-w-full"
                                                                    title={path ? `${path} > ${node.data.label}` : node.data.label}
                                                                >
                                                                    {/* Left Hue Dot */}
                                                                    <span 
                                                                        className="w-1.5 h-1.5 rounded-full shrink-0" 
                                                                        style={{ backgroundColor: `hsl(${hue}, 70%, 55%)` }}
                                                                    />
                                                                    <span className="truncate">{node.data.label}</span>
                                                                </button>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>


                    {/* ══ ZONE 2: OPERATIONAL AWARENESS ══════════════════════
                        A single unified surface for all roster/calendar widgets. */}
                    <div className="bg-surface border border-border rounded-3xl shadow-sm overflow-hidden flex flex-col gap-0">

                        {/* Zone label */}
                        <div className="px-6 pt-5 pb-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50">Operational Awareness Zone</p>
                        </div>

                        {/* CalendarSection handles its own embedded styling via the embedded prop */}
                        <CalendarSection embedded />
                    </div>
                </div>

                {/* ── BOTTOM ROW: SUGGESTIONS + QUICK ACTIONS ──────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Assistant Suggestions */}
                    <section className="bg-surface border border-border rounded-3xl p-5 shadow-sm space-y-4">
                        <h2 className="text-base font-bold text-white flex items-center gap-2.5">
                            <Sparkles size={17} className="text-amber-400" />
                            Assistant Suggestions
                        </h2>
                        <div className="space-y-2.5">
                            {suggestions.map((suggestion, idx) => (
                                <div key={idx} className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-3">
                                    <Sparkles size={15} className="text-amber-400 shrink-0 mt-0.5" />
                                    <p className="text-sm font-medium text-text-secondary leading-relaxed">{suggestion}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Quick Actions */}
                    <section className="bg-surface border border-border rounded-3xl p-5 shadow-sm space-y-4">
                        <h2 className="text-base font-bold text-white flex items-center gap-2.5">
                            <Zap size={17} className="text-teal-400" />
                            Quick Actions
                        </h2>
                        <div className="grid grid-cols-4 gap-3">
                            <button onClick={() => navigate('/life-map')} className="p-4 bg-surface-elevated hover:bg-surface-hover border border-border rounded-2xl flex flex-col items-center justify-center gap-2.5 transition-all group shadow-sm">
                                <Map size={22} className="text-text-secondary group-hover:text-blue-400 transition-colors" />
                                <span className="text-xs font-medium text-text-primary">Life Map</span>
                            </button>
                            <button onClick={() => navigate('/shopping')} className="p-4 bg-surface-elevated hover:bg-surface-hover border border-border rounded-2xl flex flex-col items-center justify-center gap-2.5 transition-all group shadow-sm">
                                <ShoppingCart size={22} className="text-text-secondary group-hover:text-pink-400 transition-colors" />
                                <span className="text-xs font-medium text-text-primary">Shopping</span>
                            </button>
                            <button onClick={() => setCommandCenterOpen(true)} className="p-4 bg-surface-elevated hover:bg-surface-hover border border-border rounded-2xl flex flex-col items-center justify-center gap-2.5 transition-all group shadow-sm">
                                <Bot size={22} className="text-text-secondary group-hover:text-accent transition-colors" />
                                <span className="text-xs font-medium text-text-primary">Assistant</span>
                            </button>
                            <button onClick={() => navigate('/reminders')} className="p-4 bg-surface-elevated hover:bg-surface-hover border border-border rounded-2xl flex flex-col items-center justify-center gap-2.5 transition-all group shadow-sm">
                                <Bell size={22} className="text-text-secondary group-hover:text-amber-400 transition-colors" />
                                <span className="text-xs font-medium text-text-primary">Reminders</span>
                            </button>
                        </div>
                    </section>
                </div>

            </div>
        </div>
    );
};

export default DashboardPage;
