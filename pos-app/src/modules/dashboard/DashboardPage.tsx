import { FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLifeMapStore } from '@/store/useLifeMapStore';
import { useRemindersStore } from '@/store/useRemindersStore';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useTodayStore, BrainDumpItem, FocusItem } from '@/store/useTodayStore';
import { processUserCommand } from '@/services/geminiService';
import { useIncubatorStore } from '@/store/useIncubatorStore';
import { CalendarSection } from './components/CalendarSection';
import { Sparkles, ArrowRight, Bot, Plus, ListTodo, Target, Map, ShoppingCart, Zap, X, BrainCircuit, MessageSquare, Loader2, Bell, Clock, Calendar, Edit2, Trash2, RefreshCw, Check } from 'lucide-react';
import { format } from 'date-fns';

const DashboardPage: FC = () => {
    const navigate = useNavigate();
    
    // Stores
    const { nodes, setCommandCenterOpen } = useLifeMapStore();
    const { reminders } = useRemindersStore();
    const { items: shoppingItems, addItem: addShoppingItem } = useShoppingStore();
    const { focusItems, brainDumpHistory, addFocusNode, removeFocusNode, addFocusNote, deleteFocusNote, addBrainDump, updateBrainDump, deleteBrainDump } = useTodayStore();

    // Local State
    const [dumpInput, setDumpInput] = useState('');
    const [isDumping, setIsDumping] = useState(false);
    const [showFocusSelector, setShowFocusSelector] = useState(false);
    
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

    // Brain Dump Logic
    const { addThought: addToIncubator } = useIncubatorStore();

    const executeAction = async (text: string, isRetry = false, existingId?: string) => {
        try {
            const action = await processUserCommand(text, nodes);
            
            if (action.actionType === 'shopping' && action.shoppingItem) {
                await addShoppingItem(action.shoppingItem);
            } else if (action.actionType === 'reminder' && action.reminderText) {
                useRemindersStore.getState().addReminder(action.reminderText);
            } else if (action.actionType === 'lifemap' && action.lifeMapAction) {
                const { typeToCreate, name, parentName } = action.lifeMapAction;
                const { addPillar, addThread, addInitiative, addSubnode, addTaskToNode, addInboxItem } = useLifeMapStore.getState();
                
                if (typeToCreate === 'pillar') {
                    addPillar(name);
                } else if (parentName) {
                    const query = parentName.toLowerCase();
                    const match = nodes.find(n => n.data.label?.toString().toLowerCase() === query) 
                               || nodes.find(n => n.data.label?.toString().toLowerCase().includes(query));
                    if (match) {
                        const normalizedType = typeToCreate.toLowerCase().trim();
                        if (normalizedType === 'thread') addThread(match.id, name);
                        else if (normalizedType === 'initiative') addInitiative(match.id, name);
                        else if (normalizedType === 'subnode' || normalizedType === 'execution node') addSubnode(match.id, name);
                        else if (normalizedType === 'task') addTaskToNode(match.id, name);
                        else addInitiative(match.id, name);
                    } else {
                        addInboxItem(`[Orphaned] ${name}`);
                    }
                }
            } else if (action.actionType === 'inbox' || action.actionType === 'question') {
                // Route to Thought Incubator — the human-controlled holding space
                const note = action.actionType === 'question'
                    ? action.reply  // AI's clarifying question
                    : 'Could not confidently classify this thought.';
                addToIncubator(text, note);
            }

            if (isRetry && existingId) {
                updateBrainDump(existingId, { actionType: action.actionType, actionResult: action.reply });
            } else {
                addBrainDump({ text, actionType: action.actionType, actionResult: action.reply });
            }

        } catch (error: any) {
            console.error(error);
            useLifeMapStore.getState().addInboxItem(text);
            if (isRetry && existingId) {
                updateBrainDump(existingId, { actionType: 'error', actionResult: 'Saved to Inbox (Error)' });
            } else {
                addBrainDump({ text, actionType: 'error', actionResult: 'Saved to Inbox (Error)' });
            }
        }
    };

    const handleBrainDump = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = dumpInput.trim();
        if (!text) return;

        setDumpInput('');
        setIsDumping(true);
        await executeAction(text);
        setIsDumping(false);
    };

    // Focus Candidates
    const focusCandidates = nodes.filter(n => 
        (n.type === 'initiative' || n.type === 'subnode') && 
        n.data.status !== 'completed' && n.data.status !== 'archived' &&
        !focusItems.some(f => f.id === n.id)
    );

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


    // Render Editable Brain Dump Item
    const BrainDumpItemCard = ({ item }: { item: BrainDumpItem }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editText, setEditText] = useState(item.text);

        const handleSave = () => {
            if (editText.trim() && editText !== item.text) {
                updateBrainDump(item.id, { text: editText.trim() });
                executeAction(editText.trim(), true, item.id);
            }
            setIsEditing(false);
        };

        return (
            <div className={`flex flex-col p-4 bg-surface border border-border rounded-2xl shadow-sm group transition-all ${item.reviewed ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between">
                    {isEditing ? (
                        <div className="flex-1 flex items-center gap-2 mr-2">
                            <input autoFocus value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} onBlur={handleSave} className="flex-1 bg-surface-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent/50" />
                        </div>
                    ) : (
                        <div className="text-sm text-white mb-2 flex items-start gap-2.5 flex-1">
                            <MessageSquare size={16} className="text-text-secondary mt-0.5 shrink-0" />
                            <span className={item.reviewed ? 'line-through text-text-secondary leading-relaxed' : 'leading-relaxed'}>{item.text}</span>
                        </div>
                    )}
                    
                    <div className="flex items-center gap-1 opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
                        {!isEditing && (
                            <>
                                <button onClick={() => updateBrainDump(item.id, { reviewed: !item.reviewed })} className="p-1.5 text-text-secondary hover:text-emerald-400 rounded-lg hover:bg-surface-elevated" title="Mark Reviewed">
                                    <Check size={14} />
                                </button>
                                <button onClick={() => setIsEditing(true)} className="p-1.5 text-text-secondary hover:text-blue-400 rounded-lg hover:bg-surface-elevated" title="Edit">
                                    <Edit2 size={14} />
                                </button>
                                <button onClick={() => { setIsDumping(true); executeAction(item.text, true, item.id).finally(() => setIsDumping(false)); }} className="p-1.5 text-text-secondary hover:text-amber-400 rounded-lg hover:bg-surface-elevated" title="Retry Processing">
                                    <RefreshCw size={14} />
                                </button>
                                <button onClick={() => deleteBrainDump(item.id)} className="p-1.5 text-text-secondary hover:text-red-400 rounded-lg hover:bg-surface-elevated" title="Delete">
                                    <Trash2 size={14} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
                {!isEditing && (
                    <div className="text-xs text-text-secondary flex items-center gap-1.5 pl-6 pr-12">
                        <Bot size={12} className="text-accent shrink-0" />
                        <span className="text-accent/90 truncate font-medium">{item.actionResult}</span>
                    </div>
                )}
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

                            {/* ── RIGHT: BRAIN DUMP (38%) ── */}
                            <div className="flex-[38] p-5 space-y-3 min-w-0">
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <BrainCircuit size={16} className="text-pink-400 shrink-0" />
                                    Brain Dump
                                </h2>

                                <form onSubmit={handleBrainDump}>
                                    <div className="relative flex items-center">
                                        <input
                                            type="text"
                                            value={dumpInput}
                                            onChange={(e) => setDumpInput(e.target.value)}
                                            placeholder="Capture a thought..."
                                            disabled={isDumping}
                                            className="w-full bg-surface-elevated border border-border rounded-xl pl-4 pr-12 py-3 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-pink-500/40 focus:ring-1 focus:ring-pink-500/40 transition-all shadow-inner disabled:opacity-50"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!dumpInput.trim() || isDumping}
                                            className="absolute right-2 w-8 h-8 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white rounded-lg flex items-center justify-center transition-colors shadow-sm"
                                        >
                                            {isDumping ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                                        </button>
                                    </div>
                                </form>

                                {brainDumpHistory.length > 0 && (
                                    <div className="flex flex-col gap-2 pt-1">
                                        {brainDumpHistory.slice(0, 6).map(item => (
                                            <BrainDumpItemCard key={item.id} item={item} />
                                        ))}
                                    </div>
                                )}
                            </div>
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
