import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, ChevronDown, ChevronRight, MessageSquareQuote, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    BrainGymLink, CATEGORY_LABEL, IMPORTANCE_META, STATUS_META, SkillEntry, SkillImportance, importanceCounts,
} from '../skills';

interface SkillCardProps {
    skill: SkillEntry;
    brainGym?: BrainGymLink;
    onUpdate: (id: string, updates: Partial<Omit<SkillEntry, 'id' | 'sightings'>>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

const IMPORTANCE_ORDER: SkillImportance[] = ['critical', 'high', 'meaningful', 'nice'];

const Evidence = ({ skill }: { skill: SkillEntry }) =>
    skill.evidence_where || skill.evidence_what ? (
        <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3 text-sm space-y-1">
            {skill.evidence_where && <div><span className="text-muted-foreground">Where: </span><span className="text-zinc-200">{skill.evidence_where}</span></div>}
            {skill.evidence_what && <div><span className="text-muted-foreground">What: </span><span className="text-zinc-200">{skill.evidence_what}</span></div>}
            {skill.evidence_result && <div><span className="text-muted-foreground">Result: </span><span className="text-zinc-200">{skill.evidence_result}</span></div>}
        </div>
    ) : null;

export const SkillCard = ({ skill, brainGym, onUpdate, onDelete }: SkillCardProps) => {
    const [open, setOpen] = useState(false);
    const [editingEvidence, setEditingEvidence] = useState(false);
    const [where, setWhere] = useState(skill.evidence_where ?? '');
    const [what, setWhat] = useState(skill.evidence_what ?? '');
    const [result, setResult] = useState(skill.evidence_result ?? '');
    const [wording, setWording] = useState(skill.status === 'approved' ? skill.approved_wording ?? '' : skill.proposed_wording ?? '');
    const [editingWording, setEditingWording] = useState(false);
    const [busy, setBusy] = useState(false);

    const run = async (fn: () => Promise<void>) => {
        setBusy(true);
        try { await fn(); } finally { setBusy(false); }
    };

    const setStatus = (status: SkillEntry['status']) => run(() => onUpdate(skill.id, { status }));

    const saveEvidence = () => run(async () => {
        await onUpdate(skill.id, {
            evidence_where: where.trim() || null,
            evidence_what: what.trim() || null,
            evidence_result: result.trim() || null,
            // New or changed evidence goes back to Claude for wording, unless wording is already approved.
            ...(skill.status === 'approved' ? {} : { status: 'confirmed' as const }),
        });
        setEditingEvidence(false);
    });

    const approve = () => run(async () => {
        await onUpdate(skill.id, { approved_wording: wording.trim(), status: 'approved' });
        setEditingWording(false);
    });

    const counts = importanceCounts(skill);
    const meta = STATUS_META[skill.status];
    const showForm = editingEvidence;
    const canMarkDone = ['unreviewed', 'not_done', 'learning', 'dont_claim'].includes(skill.status);

    return (
        <div className="rounded-2xl border border-white/5 bg-surface-elevated p-5 space-y-3">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-foreground">{skill.term}</h3>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-white/5 text-muted-foreground">{CATEGORY_LABEL[skill.category]}</span>
                        {skill.kind === 'fixed' && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-white/5 text-muted-foreground" title="Experience, background or credentials: can't be added quickly">Fixed</span>}
                    </div>
                    {skill.aliases.length > 0 && <div className="text-xs text-muted-foreground">Also: {skill.aliases.join(', ')}</div>}
                </div>
                <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${meta.tone}`}>{meta.label}</span>
            </div>

            {/* Demand */}
            <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 text-sm text-zinc-300 hover:text-foreground">
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Asked in {skill.sightings.length} {skill.sightings.length === 1 ? 'job' : 'jobs'}
                <span className="flex items-center gap-2 text-xs">
                    {IMPORTANCE_ORDER.filter(i => counts[i]).map(i => (
                        <span key={i} className={IMPORTANCE_META[i].tone}>{counts[i]} {IMPORTANCE_META[i].label.toLowerCase()}</span>
                    ))}
                </span>
            </button>
            {open && (
                <ul className="space-y-2 pl-6">
                    {skill.sightings.map(s => (
                        <li key={s.id} className="text-sm space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[11px] font-semibold ${IMPORTANCE_META[s.importance].tone}`}>{IMPORTANCE_META[s.importance].label}</span>
                                {s.job_id
                                    ? <Link to={`/jobs/${s.job_id}`} className="text-foreground hover:text-accent">{s.company} · {s.role}</Link>
                                    : <span className="text-foreground">{s.company} · {s.role}</span>}
                                {s.match === 'partial' && <span className="text-[11px] text-muted-foreground">(partly covered)</span>}
                            </div>
                            {s.quote && <p className="text-xs text-muted-foreground italic">“{s.quote}”</p>}
                        </li>
                    ))}
                </ul>
            )}

            {/* Status-specific body */}
            {skill.status === 'resolved_wording' && (
                <p className="text-sm text-zinc-300">Already on the CV as <span className="text-foreground font-medium">{skill.mapped_to}</span>. Builds use the ad's term.</p>
            )}

            {skill.interview_line && ['unreviewed', 'not_done', 'learning', 'dont_claim'].includes(skill.status) && (
                <div className="flex gap-2 text-sm text-zinc-300">
                    <MessageSquareQuote className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <span><span className="text-muted-foreground">If asked: </span>{skill.interview_line}</span>
                </div>
            )}

            {brainGym && ['unreviewed', 'not_done', 'learning'].includes(skill.status) && (
                <Link to="/brain-gym" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                    <Brain className="h-3.5 w-3.5" />
                    Brain Gym: {brainGym.name}{brainGym.readiness && <> · market readiness <span className="text-zinc-300">{brainGym.readiness}</span></>}
                </Link>
            )}

            {!showForm && ['confirmed', 'wording_proposed', 'approved'].includes(skill.status) && <Evidence skill={skill} />}

            {skill.status === 'confirmed' && !showForm && (
                <p className="text-xs text-muted-foreground">Claude drafts CV wording at the next build, or when you say <span className="font-mono text-foreground">update my skills</span> in Claude Code.</p>
            )}

            {(skill.status === 'wording_proposed' || (skill.status === 'approved' && editingWording)) && (
                <div className="space-y-2">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{skill.status === 'approved' ? 'Approved wording' : 'Proposed CV wording'}</div>
                    <Textarea value={wording} onChange={e => setWording(e.target.value)} rows={3} className="text-sm" />
                </div>
            )}

            {skill.status === 'approved' && !editingWording && skill.approved_wording && (
                <div className="space-y-1">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Approved wording</div>
                    <p className="text-sm text-zinc-200 whitespace-pre-wrap">{skill.approved_wording}</p>
                </div>
            )}

            {showForm && (
                <div className="space-y-2 rounded-lg border border-white/10 p-3">
                    <Input value={where} onChange={e => setWhere(e.target.value)} placeholder="Where: role or project, and roughly when" className="text-sm" />
                    <Textarea value={what} onChange={e => setWhat(e.target.value)} rows={3} placeholder="What you did, in a sentence or two" className="text-sm" />
                    <Input value={result} onChange={e => setResult(e.target.value)} placeholder="Result or metric (optional)" className="text-sm" />
                    <div className="flex gap-2">
                        <Button size="sm" onClick={saveEvidence} disabled={busy || !where.trim() || !what.trim()}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingEvidence(false)}>Cancel</Button>
                    </div>
                </div>
            )}

            {/* Actions */}
            {!showForm && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                    {canMarkDone && <Button size="sm" onClick={() => setEditingEvidence(true)} disabled={busy}>I've done this</Button>}
                    {skill.status === 'unreviewed' && (
                        <>
                            <Button size="sm" variant="outline" onClick={() => setStatus('not_done')} disabled={busy}>Not done</Button>
                            <Button size="sm" variant="outline" onClick={() => setStatus('learning')} disabled={busy}>Learning</Button>
                            <Button size="sm" variant="outline" onClick={() => setStatus('dont_claim')} disabled={busy}>Don't claim</Button>
                        </>
                    )}
                    {skill.status === 'not_done' && <Button size="sm" variant="outline" onClick={() => setStatus('learning')} disabled={busy}>Learning</Button>}
                    {skill.status === 'learning' && <Button size="sm" variant="outline" onClick={() => setStatus('not_done')} disabled={busy}>Not done</Button>}
                    {(skill.status === 'not_done' || skill.status === 'learning') && <Button size="sm" variant="outline" onClick={() => setStatus('dont_claim')} disabled={busy}>Don't claim</Button>}
                    {skill.status === 'dont_claim' && <Button size="sm" variant="outline" onClick={() => setStatus('not_done')} disabled={busy}>Allow claiming</Button>}
                    {skill.status === 'wording_proposed' && (
                        <>
                            <Button size="sm" onClick={approve} disabled={busy || !wording.trim()}>Approve wording</Button>
                            <Button size="sm" variant="outline" onClick={() => setStatus('confirmed')} disabled={busy} title="Send it back to Claude for a new draft">Ask for a redraft</Button>
                        </>
                    )}
                    {skill.status === 'approved' && (editingWording
                        ? <>
                            <Button size="sm" onClick={approve} disabled={busy || !wording.trim()}>Save wording</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setWording(skill.approved_wording ?? ''); setEditingWording(false); }}>Cancel</Button>
                        </>
                        : <Button size="sm" variant="outline" onClick={() => setEditingWording(true)} disabled={busy}>Edit wording</Button>)}
                    {['confirmed', 'wording_proposed', 'approved'].includes(skill.status) && (
                        <Button size="sm" variant="ghost" onClick={() => setEditingEvidence(true)} disabled={busy}>Edit evidence</Button>
                    )}
                    {skill.status === 'resolved_wording' && (
                        <Button size="sm" variant="outline" onClick={() => setStatus('unreviewed')} disabled={busy}>Not the same thing</Button>
                    )}
                    {(skill.status === 'confirmed' || skill.status === 'not_done' || skill.status === 'learning' || skill.status === 'dont_claim') && (
                        <Button size="sm" variant="ghost" onClick={() => setStatus('unreviewed')} disabled={busy} className="text-muted-foreground">Back to review</Button>
                    )}
                    <Button
                        size="icon"
                        variant="ghost"
                        className="ml-auto h-8 w-8"
                        title="Delete this entry"
                        onClick={() => { if (confirm(`Delete "${skill.term}" from the ledger?`)) run(() => onDelete(skill.id)); }}
                        disabled={busy}
                    >
                        <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                </div>
            )}
        </div>
    );
};
