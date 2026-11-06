// Skill ledger: terms job ads ask for that the CVs don't back up yet. Claude Code
// records them while tailoring applications (mcp-server/src/skillsService.ts);
// this page is where Aamir reviews them and approves CV wording.
import { supabase } from '@/lib/supabase';

export type SkillStatus = 'unreviewed' | 'confirmed' | 'wording_proposed' | 'approved' | 'not_done' | 'learning' | 'dont_claim' | 'resolved_wording';
export type SkillCategory = 'method' | 'technique' | 'tool' | 'domain' | 'credential' | 'experience' | 'other';
export type SkillImportance = 'critical' | 'high' | 'meaningful' | 'nice';

export interface SkillSighting {
    id: string;
    ledger_id: string;
    job_id: string | null;
    company: string | null;
    role: string | null;
    quote: string | null;
    importance: SkillImportance;
    match: 'missing' | 'partial';
    source: 'build' | 'career-ops';
    created_at: string;
}

export interface SkillEntry {
    id: string;
    term: string;
    aliases: string[];
    category: SkillCategory;
    kind: 'buildable' | 'fixed';
    status: SkillStatus;
    mapped_to: string | null;
    evidence_where: string | null;
    evidence_what: string | null;
    evidence_result: string | null;
    proposed_wording: string | null;
    approved_wording: string | null;
    interview_line: string | null;
    bg_req_key: string | null;
    first_seen_at: string;
    last_seen_at: string;
    updated_at: string;
    sightings: SkillSighting[];
}

export const STATUS_META: Record<SkillStatus, { label: string; tone: string }> = {
    unreviewed: { label: 'To review', tone: 'bg-amber-900/30 text-amber-300 border-amber-700/30' },
    confirmed: { label: 'Waiting for Claude', tone: 'bg-blue-900/30 text-blue-300 border-blue-700/30' },
    wording_proposed: { label: 'Wording to approve', tone: 'bg-violet-900/30 text-violet-300 border-violet-700/30' },
    approved: { label: 'Usable in CVs', tone: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/30' },
    not_done: { label: 'Not done', tone: 'bg-red-900/30 text-red-300 border-red-700/30' },
    learning: { label: 'Learning', tone: 'bg-sky-900/30 text-sky-300 border-sky-700/30' },
    dont_claim: { label: "Don't claim", tone: 'bg-[#1A1F2B] text-slate-400 border-slate-700/30' },
    resolved_wording: { label: 'Covered by wording', tone: 'bg-[#1A1F2B] text-slate-400 border-slate-700/30' },
};

export const CATEGORY_LABEL: Record<SkillCategory, string> = {
    method: 'Method',
    technique: 'Technique',
    tool: 'Tool',
    domain: 'Domain',
    credential: 'Credential',
    experience: 'Experience',
    other: 'Other',
};

export const IMPORTANCE_META: Record<SkillImportance, { label: string; tone: string; weight: number }> = {
    critical: { label: 'Critical', tone: 'text-red-300', weight: 4 },
    high: { label: 'High', tone: 'text-amber-300', weight: 3 },
    meaningful: { label: 'Meaningful', tone: 'text-sky-300', weight: 2 },
    nice: { label: 'Nice to have', tone: 'text-slate-400', weight: 1 },
};

// How strongly the market asks for a term: every job counts, weighted by how much it mattered there.
export const demandScore = (s: SkillEntry) => s.sightings.reduce((sum, x) => sum + IMPORTANCE_META[x.importance].weight, 0);

export const importanceCounts = (s: SkillEntry) => {
    const counts: Partial<Record<SkillImportance, number>> = {};
    for (const x of s.sightings) counts[x.importance] = (counts[x.importance] ?? 0) + 1;
    return counts;
};

export const loadSkillLedger = async (): Promise<SkillEntry[]> => {
    const [{ data: rows, error }, { data: sightings, error: sErr }] = await Promise.all([
        supabase.from('skill_ledger').select('*'),
        supabase.from('skill_sightings').select('*').order('created_at', { ascending: false }),
    ]);
    if (error) throw error;
    if (sErr) throw sErr;
    const byLedger = new Map<string, SkillSighting[]>();
    for (const s of (sightings ?? []) as SkillSighting[]) {
        const list = byLedger.get(s.ledger_id) ?? [];
        list.push(s);
        byLedger.set(s.ledger_id, list);
    }
    return ((rows ?? []) as Omit<SkillEntry, 'sightings'>[]).map(r => ({ ...r, aliases: r.aliases ?? [], sightings: byLedger.get(r.id) ?? [] }));
};

export const updateSkillEntry = async (id: string, updates: Partial<Omit<SkillEntry, 'id' | 'sightings'>>) => {
    const { error } = await supabase
        .from('skill_ledger')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
    if (error) throw error;
};

export const deleteSkillEntry = async (id: string) => {
    const { error } = await supabase.from('skill_ledger').delete().eq('id', id);
    if (error) throw error;
};

// Brain Gym's market matrix for the same requirement, so a gap shows how the wider market rates it.
export interface BrainGymLink { name: string; readiness: 'ready' | 'partial' | 'gap' | null; track: 'ba' | 'pm' }

export const loadBrainGymLinks = async (): Promise<Map<string, BrainGymLink>> => {
    const { data, error } = await supabase.from('bg_requirements').select('req_key, name, readiness, track');
    if (error) return new Map(); // Brain Gym data is optional here
    const links = new Map<string, BrainGymLink>();
    // Senior BA is the primary track, so it wins when both tracks have the requirement.
    for (const r of (data ?? []) as (BrainGymLink & { req_key: string })[]) {
        if (!links.has(r.req_key) || r.track === 'ba') links.set(r.req_key, { name: r.name, readiness: r.readiness, track: r.track });
    }
    return links;
};
