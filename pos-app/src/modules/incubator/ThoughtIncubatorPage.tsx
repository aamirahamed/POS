import { FC, useState, useRef, useEffect } from 'react';
import { useIncubatorStore, IncubatedThought, RouteDestination } from '@/store/useIncubatorStore';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useRemindersStore } from '@/store/useRemindersStore';
import { useLifeMapStore } from '@/store/useLifeMapStore';
import {
    Lightbulb, Archive, Trash2, ChevronDown, Search,
    Clock, ArrowUpRight, RotateCcw, Inbox, CheckCircle2,
    SlidersHorizontal,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// ─── Route Destination Config ──────────────────────────────────────────────────
const ROUTE_OPTIONS: { value: RouteDestination; label: string; color: string }[] = [
    { value: 'life-map',     label: 'Life Map',    color: 'text-blue-400' },
    { value: 'reminder',     label: 'Reminder',    color: 'text-amber-400' },
    { value: 'shopping',     label: 'Shopping',    color: 'text-emerald-400' },
    { value: 'wishlist',     label: 'Wishlist',    color: 'text-pink-400' },
    { value: 'assignments',  label: 'Assignments', color: 'text-purple-400' },
    { value: 'archive',      label: 'Archive',     color: 'text-text-secondary' },
];

// ─── Route Dropdown ────────────────────────────────────────────────────────────
const RouteDropdown: FC<{ thought: IncubatedThought }> = ({ thought }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { routeThought, archiveThought } = useIncubatorStore();
    const { addItem: addShopping } = useShoppingStore();
    const { addReminder } = useRemindersStore();
    const { addInboxItem } = useLifeMapStore();

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleRoute = (dest: RouteDestination) => {
        setOpen(false);
        if (dest === 'archive') {
            archiveThought(thought.id);
            return;
        }

        // Side-effect: actually route to the destination
        switch (dest) {
            case 'shopping':
                addShopping(thought.text);
                break;
            case 'reminder':
                addReminder(thought.text);
                break;
            case 'life-map':
                addInboxItem(thought.text);
                navigate('/life-map');
                break;
            case 'wishlist':
                navigate('/wishlist');
                break;
            case 'assignments':
                navigate('/tracker');
                break;
        }

        routeThought(thought.id, dest);
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent/10 hover:bg-accent/20 px-2.5 py-1.5 rounded-lg transition-colors"
            >
                Move to
                <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1.5 w-40 bg-surface-elevated border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    {ROUTE_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => handleRoute(opt.value)}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-surface-hover transition-colors text-left"
                        >
                            <ArrowUpRight size={13} className={opt.color} />
                            <span className="text-sm font-medium text-text-primary">{opt.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Thought Card ──────────────────────────────────────────────────────────────
const ThoughtCard: FC<{ thought: IncubatedThought }> = ({ thought }) => {
    const { deleteThought, restoreThought, archiveThought } = useIncubatorStore();
    const isArchived = thought.status === 'archived';
    const isRouted   = thought.status === 'routed';

    const routedOption = ROUTE_OPTIONS.find(o => o.value === thought.routedTo);

    return (
        <div className={`group relative flex flex-col gap-3 bg-surface-elevated border rounded-2xl p-4 transition-all shadow-sm
            ${isArchived ? 'border-border/40 opacity-50' : isRouted ? 'border-emerald-500/20 bg-emerald-500/[0.02]' : 'border-border hover:border-border/80 hover:bg-surface-hover'}`}
        >
            {/* Status badge for routed */}
            {isRouted && routedOption && (
                <div className="flex items-center gap-1.5 mb-0.5">
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest">
                        Routed → {routedOption.label}
                    </span>
                </div>
            )}
            {isArchived && (
                <div className="flex items-center gap-1.5 mb-0.5">
                    <Archive size={11} className="text-text-secondary/60" />
                    <span className="text-[11px] font-medium text-text-secondary/60 uppercase tracking-widest">Archived</span>
                </div>
            )}

            {/* Thought text */}
            <p className={`text-sm font-medium leading-relaxed ${isArchived || isRouted ? 'text-text-secondary' : 'text-white'}`}>
                {thought.text}
            </p>

            {/* Assistant note */}
            {thought.assistantNote && (
                <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">
                    <Lightbulb size={12} className="text-amber-400/70 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-amber-400/70 italic leading-relaxed">{thought.assistantNote}</span>
                </div>
            )}

            {/* Footer row */}
            <div className="flex items-center justify-between gap-3 pt-0.5">
                <span className="text-[11px] text-text-secondary/50 flex items-center gap-1.5">
                    <Clock size={10} />
                    {formatDistanceToNow(thought.createdAt, { addSuffix: true })}
                </span>

                <div className="flex items-center gap-1.5">
                    {/* Restore if archived or routed */}
                    {(isArchived || isRouted) && (
                        <button
                            onClick={() => restoreThought(thought.id)}
                            title="Restore to pending"
                            className="p-1.5 text-text-secondary hover:text-white hover:bg-surface rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <RotateCcw size={13} />
                        </button>
                    )}

                    {/* Archive (only for pending) */}
                    {thought.status === 'pending' && (
                        <button
                            onClick={() => archiveThought(thought.id)}
                            title="Archive"
                            className="p-1.5 text-text-secondary hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Archive size={13} />
                        </button>
                    )}

                    {/* Delete */}
                    <button
                        onClick={() => deleteThought(thought.id)}
                        title="Delete permanently"
                        className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <Trash2 size={13} />
                    </button>

                    {/* Route — only for pending */}
                    {thought.status === 'pending' && <RouteDropdown thought={thought} />}
                </div>
            </div>
        </div>
    );
};

// ─── Filter Tab ────────────────────────────────────────────────────────────────
type FilterMode = 'pending' | 'all' | 'archived' | 'routed';

const FILTERS: { value: FilterMode; label: string }[] = [
    { value: 'pending',  label: 'Unprocessed' },
    { value: 'all',      label: 'All' },
    { value: 'routed',   label: 'Routed' },
    { value: 'archived', label: 'Archived' },
];

// ─── Main Page ─────────────────────────────────────────────────────────────────
const ThoughtIncubatorPage: FC = () => {
    const { thoughts } = useIncubatorStore();
    const [filter, setFilter]   = useState<FilterMode>('pending');
    const [search, setSearch]   = useState('');
    const [sortDesc, setSortDesc] = useState(true);

    const pending  = thoughts.filter(t => t.status === 'pending').length;
    const routed   = thoughts.filter(t => t.status === 'routed').length;
    const archived = thoughts.filter(t => t.status === 'archived').length;

    const filtered = thoughts
        .filter(t => {
            if (filter === 'pending')  return t.status === 'pending';
            if (filter === 'archived') return t.status === 'archived';
            if (filter === 'routed')   return t.status === 'routed';
            return true;
        })
        .filter(t => search.trim() === '' || t.text.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => sortDesc ? b.createdAt - a.createdAt : a.createdAt - b.createdAt);

    return (
        <div className="min-h-screen bg-background text-text-primary pb-24 md:pb-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">

                {/* ── Header ── */}
                <section className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                            <Lightbulb size={20} className="text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Thought Incubator</h1>
                            <p className="text-sm text-text-secondary mt-0.5">Unresolved thoughts waiting for clarity.</p>
                        </div>
                    </div>

                    {/* Stat chips */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        <div className="flex items-center gap-2 bg-surface border border-border px-3 py-1.5 rounded-xl text-sm">
                            <Inbox size={13} className="text-amber-400" />
                            <span className="font-medium text-white">{pending}</span>
                            <span className="text-text-secondary">unprocessed</span>
                        </div>
                        <div className="flex items-center gap-2 bg-surface border border-border px-3 py-1.5 rounded-xl text-sm">
                            <CheckCircle2 size={13} className="text-emerald-400" />
                            <span className="font-medium text-white">{routed}</span>
                            <span className="text-text-secondary">routed</span>
                        </div>
                        <div className="flex items-center gap-2 bg-surface border border-border px-3 py-1.5 rounded-xl text-sm">
                            <Archive size={13} className="text-text-secondary/60" />
                            <span className="font-medium text-white">{archived}</span>
                            <span className="text-text-secondary">archived</span>
                        </div>
                    </div>
                </section>

                {/* ── Filters + Search ── */}
                <section className="flex flex-col sm:flex-row gap-3">
                    {/* Filter tabs */}
                    <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1 shrink-0">
                        {FILTERS.map(f => (
                            <button
                                key={f.value}
                                onClick={() => setFilter(f.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    filter === f.value
                                        ? 'bg-accent/15 text-accent border border-accent/20'
                                        : 'text-text-secondary hover:text-white'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/50" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search thoughts..."
                            className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-accent/30 transition-all"
                        />
                    </div>

                    {/* Sort toggle */}
                    <button
                        onClick={() => setSortDesc(!sortDesc)}
                        title={sortDesc ? 'Newest first' : 'Oldest first'}
                        className="flex items-center gap-1.5 px-3 py-2.5 bg-surface border border-border rounded-xl text-xs font-medium text-text-secondary hover:text-white transition-colors shrink-0"
                    >
                        <SlidersHorizontal size={13} />
                        {sortDesc ? 'Newest' : 'Oldest'}
                    </button>
                </section>

                {/* ── Thought List ── */}
                <section className="space-y-3">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
                            <div className="w-16 h-16 rounded-3xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-center">
                                <Lightbulb size={28} className="text-amber-400/50" />
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-base font-semibold text-white">
                                    {search ? 'No thoughts match your search.' : 'Your mind feels clear right now.'}
                                </p>
                                <p className="text-sm text-text-secondary max-w-xs">
                                    {search
                                        ? 'Try a different search term.'
                                        : 'Thoughts that couldn\'t be classified will appear here.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        filtered.map(thought => (
                            <ThoughtCard key={thought.id} thought={thought} />
                        ))
                    )}
                </section>

            </div>
        </div>
    );
};

export default ThoughtIncubatorPage;
