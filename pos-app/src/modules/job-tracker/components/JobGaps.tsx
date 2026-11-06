import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Puzzle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { IMPORTANCE_META, STATUS_META, SkillImportance, SkillStatus } from '../skills';

interface GapRow {
    id: string;
    importance: SkillImportance;
    skill_ledger: { term: string; status: SkillStatus } | null;
}

const RANK: Record<SkillImportance, number> = { critical: 0, high: 1, meaningful: 2, nice: 3 };

// The skill-ledger terms this role asked for, recorded when its application was tailored.
export const JobGaps = ({ jobId }: { jobId: string }) => {
    const [rows, setRows] = useState<GapRow[]>([]);

    useEffect(() => {
        let cancelled = false;
        supabase
            .from('skill_sightings')
            .select('id, importance, skill_ledger(term, status)')
            .eq('job_id', jobId)
            .then(({ data }) => {
                if (!cancelled) setRows(((data ?? []) as unknown as GapRow[]).filter(r => r.skill_ledger));
            });
        return () => { cancelled = true; };
    }, [jobId]);

    if (rows.length === 0) return null;
    const sorted = [...rows].sort((a, b) => RANK[a.importance] - RANK[b.importance]);

    return (
        <div className="rounded-2xl border border-white/5 bg-surface-elevated p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Puzzle className="h-4 w-4 text-amber-400" /> Gaps in this role
                </div>
                <Link to="/jobs?tab=skills" className="text-xs text-muted-foreground hover:text-foreground">Review all</Link>
            </div>
            <ul className="space-y-2">
                {sorted.map(r => (
                    <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0">
                            <span className="text-zinc-200">{r.skill_ledger!.term}</span>
                            <span className={`ml-2 text-[11px] ${IMPORTANCE_META[r.importance].tone}`}>{IMPORTANCE_META[r.importance].label}</span>
                        </span>
                        <span className={`shrink-0 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${STATUS_META[r.skill_ledger!.status].tone}`}>
                            {STATUS_META[r.skill_ledger!.status].label}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};
