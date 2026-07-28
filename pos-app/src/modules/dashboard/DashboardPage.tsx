import { FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLifeMapStore } from '@/store/useLifeMapStore';
import { useRemindersStore } from '@/store/useRemindersStore';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useTodayStore, FocusItem } from '@/store/useTodayStore';
import { CalendarSection } from './components/CalendarSection';
import { RemindersWidget } from './components/RemindersWidget';
import { Sparkles, Bot, Plus, ListTodo, Target, Map, ShoppingCart, Zap, X, Bell, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useProfileStore } from '@/store/useProfileStore';

const DashboardPage: FC = () => {
    const navigate = useNavigate();
    
    // Stores
    const { 
        nodes, 
        setCommandCenterOpen,
        loadFromDB
    } = useLifeMapStore();
    const { reminders } = useRemindersStore();
    const { items: shoppingItems, addItem: addShoppingItem } = useShoppingStore();
    const { focusItems, addFocusNode, removeFocusNode } = useTodayStore();

    // Local State
    const [showFocusSelector, setShowFocusSelector] = useState(false);


    // Load life map and profile facts from DB on mount
    useEffect(() => {
        loadFromDB();
        useProfileStore.getState().loadFacts();
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
    const backlogProjects = nodes.filter(n => n.type === 'project' && n.data.status === 'backlog').length;

    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    // Focus Candidates
    const focusCandidates = nodes.filter(n => 
        (n.type === 'project' || n.type === 'milestone') && 
        n.data.status !== 'completed' && n.data.status !== 'archived' &&
        !focusItems.some(f => f.id === n.id)
    );






    // Render Focus Items with Notes & Duration
    const renderFocusItem = (focus: FocusItem) => {
        const node = nodes.find(n => n.id === focus.id);
        if (!node) return null;

        const isExecution = node.type === 'milestone';
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
    if (backlogProjects > 3) suggestions.push(`You have ${backlogProjects} projects in backlog. Consider activating one.`);
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
                            <span className="font-medium text-white">{backlogProjects}</span>
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

                        {/* ── TODAY'S FOCUS (100%) ── */}
                        <div className="p-5 space-y-4">
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
                                            <p className="text-sm text-text-secondary">No available active projects or milestones.</p>
                                        ) : (
                                            focusCandidates.map(node => (
                                                <div key={node.id} className="flex items-center justify-between p-2.5 bg-surface hover:bg-surface-hover rounded-lg cursor-pointer border border-transparent hover:border-border transition-colors" onClick={() => { addFocusNode(node.id); setShowFocusSelector(false); }}>
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${node.type === 'milestone' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                            {node.type === 'milestone' ? <ListTodo size={12} /> : <Target size={12} />}
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

                        {/* ── HORIZONTAL DIVIDER ── */}
                        <div className="border-t border-border/60 mx-6" />

                        {/* ── BOTTOM ROW: ACTIVE REMINDERS (100%) ── */}
                        <div className="p-6">
                            <RemindersWidget />
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
