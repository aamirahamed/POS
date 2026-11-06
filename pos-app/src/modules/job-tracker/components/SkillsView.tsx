import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkillCard } from './SkillCard';
import { BrainGymLink, SkillEntry, SkillStatus, demandScore, deleteSkillEntry, loadBrainGymLinks, loadSkillLedger, updateSkillEntry } from '../skills';

type Filter = 'needs_you' | 'claude' | 'usable' | 'gaps' | 'wording' | 'all';

const FILTERS: { value: Filter; label: string; statuses: SkillStatus[]; hint: string }[] = [
    { value: 'needs_you', label: 'Needs you', statuses: ['unreviewed', 'wording_proposed'], hint: 'New terms to sort, and CV wording to approve.' },
    { value: 'claude', label: 'Waiting for Claude', statuses: ['confirmed'], hint: "You've confirmed these. Claude drafts CV wording at the next build, or when you say \"update my skills\"." },
    { value: 'usable', label: 'Usable in CVs', statuses: ['approved'], hint: 'Approved wording every CV build can use.' },
    { value: 'gaps', label: 'Gaps', statuses: ['not_done', 'learning', 'dont_claim'], hint: "Real gaps. Learnable ones you can build; fixed ones (experience, background, credentials) need an interview answer instead." },
    { value: 'wording', label: 'Covered by wording', statuses: ['resolved_wording'], hint: 'Already on the CV under another name. Builds switch to the ad’s term.' },
    { value: 'all', label: 'All', statuses: [], hint: 'Every term in the ledger.' },
];

const FILTER_KEY = 'job-tracker-skills-filter';
const readFilter = (): Filter => {
    try {
        const saved = localStorage.getItem(FILTER_KEY);
        return FILTERS.some(f => f.value === saved) ? (saved as Filter) : 'needs_you';
    } catch {
        return 'needs_you';
    }
};

const matches = (s: SkillEntry, q: string) => {
    if (!q) return true;
    const needle = q.toLowerCase();
    return s.term.toLowerCase().includes(needle) || s.aliases.some(a => a.toLowerCase().includes(needle));
};

const byDemand = (a: SkillEntry, b: SkillEntry) => demandScore(b) - demandScore(a) || b.last_seen_at.localeCompare(a.last_seen_at);

export const SkillsView = ({ searchQuery }: { searchQuery: string }) => {
    const [skills, setSkills] = useState<SkillEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<Filter>(readFilter);
    const [bgLinks, setBgLinks] = useState<Map<string, BrainGymLink>>(new Map());

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [ledger, links] = await Promise.all([loadSkillLedger(), loadBrainGymLinks()]);
            setSkills(ledger);
            setBgLinks(links);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const changeFilter = (value: Filter) => {
        setFilter(value);
        try { localStorage.setItem(FILTER_KEY, value); } catch { /* storage unavailable: keep for this visit only */ }
    };

    const handleUpdate = useCallback(async (id: string, updates: Partial<Omit<SkillEntry, 'id' | 'sightings'>>) => {
        await updateSkillEntry(id, updates);
        const now = new Date().toISOString();
        setSkills(list => list.map(s => (s.id === id ? { ...s, ...updates, updated_at: now } : s)));
    }, []);

    const handleDelete = useCallback(async (id: string) => {
        await deleteSkillEntry(id);
        setSkills(list => list.filter(s => s.id !== id));
    }, []);

    const counts = useMemo(() => Object.fromEntries(FILTERS.map(f => [
        f.value,
        f.statuses.length ? skills.filter(s => f.statuses.includes(s.status)).length : skills.length,
    ])) as Record<Filter, number>, [skills]);

    const active = FILTERS.find(f => f.value === filter)!;
    const visible = skills
        .filter(s => (active.statuses.length ? active.statuses.includes(s.status) : true) && matches(s, searchQuery))
        .sort(byDemand);

    // Gaps split into what can be built and what needs an interview answer.
    const groups: { title?: string; items: SkillEntry[] }[] = filter === 'gaps'
        ? [
            { title: 'Learnable', items: visible.filter(s => s.kind === 'buildable' && s.status !== 'dont_claim') },
            { title: 'Fixed: experience, background, credentials', items: visible.filter(s => s.kind === 'fixed' && s.status !== 'dont_claim') },
            { title: "Don't claim", items: visible.filter(s => s.status === 'dont_claim') },
        ].filter(g => g.items.length)
        : [{ items: visible }];

    return (
        <div className="space-y-5 pb-8">
            <div className="flex flex-wrap items-center gap-2">
                {FILTERS.map(f => (
                    <button
                        key={f.value}
                        onClick={() => changeFilter(f.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === f.value
                            ? 'bg-accent/15 border-accent/40 text-foreground'
                            : 'bg-surface/60 border-border/50 text-muted-foreground hover:text-foreground'}`}
                    >
                        {f.label} <span className="ml-1 tabular-nums opacity-70">{counts[f.value]}</span>
                    </button>
                ))}
                <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={load} title="Refresh" disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            <p className="text-sm text-muted-foreground">{active.hint}</p>

            {error && <div className="text-sm text-red-300">{error}</div>}
            {!loading && !error && visible.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground text-center">
                    {skills.length === 0
                        ? 'No skills recorded yet. Claude adds terms here while it tailors your applications.'
                        : 'Nothing here right now.'}
                </div>
            )}

            {groups.map((g, i) => (
                <div key={g.title ?? i} className="space-y-3">
                    {g.title && <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.title} · {g.items.length}</h3>}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                        {g.items.map(s => (
                            <SkillCard key={`${s.id}-${s.updated_at}`} skill={s} brainGym={s.bg_req_key ? bgLinks.get(s.bg_req_key) : undefined} onUpdate={handleUpdate} onDelete={handleDelete} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
