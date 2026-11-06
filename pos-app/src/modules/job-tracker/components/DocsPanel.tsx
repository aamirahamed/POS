import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Check, Copy, FileText, Loader2, MessageSquare, RotateCcw, Sparkles, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useJobTrackerStore } from '@/store/useJobTrackerStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DocsStatus, Job } from '../types';

// The tailored CV and brochure cover letter are built by Claude Code in the
// portfolio repo, not here. This panel queues the request and shows what
// Claude reports back through the MCP server (update_doc_request).

type DocsFields = Pick<Job, 'docs_status' | 'docs_note' | 'docs_review_first' | 'docs_requested_at' | 'docs_updated_at' | 'docs_message' | 'docs_files'>;

const DOCS_COLUMNS = 'docs_status, docs_note, docs_review_first, docs_requested_at, docs_updated_at, docs_message, docs_files';
const OPEN_STATUSES: DocsStatus[] = ['requested', 'in_progress', 'waiting_on_you'];
const POLL_MS = 15000;

const STATUS_TEXT: Record<DocsStatus, { label: string; tone: string }> = {
    requested: { label: 'Queued for Claude', tone: 'text-amber-300' },
    in_progress: { label: 'Claude is building', tone: 'text-blue-300' },
    waiting_on_you: { label: 'Waiting on you in Claude Code', tone: 'text-violet-300' },
    ready: { label: 'Ready', tone: 'text-emerald-300' },
    failed: { label: 'Build failed', tone: 'text-red-300' },
};

const ago = (value?: string | null) => (value ? formatDistanceToNow(new Date(value), { addSuffix: true }) : '');
const fileName = (p: string) => p.split('/').pop() ?? p;

interface DocsPanelProps {
    job: Job;
    onChange: (fields: Partial<DocsFields>) => void;
    onActivity?: (content: string) => void;
}

export const DocsPanel = ({ job, onChange, onActivity }: DocsPanelProps) => {
    const updateJob = useJobTrackerStore(s => s.updateJob);
    const addActivity = useJobTrackerStore(s => s.addActivity);
    const [note, setNote] = useState(job.docs_note ?? '');
    const [reviewFirst, setReviewFirst] = useState(job.docs_review_first ?? true);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const status = job.docs_status ?? null;
    const open = status !== null && OPEN_STATUSES.includes(status);

    // Claude reports progress through the database, so check back while a request is open.
    useEffect(() => {
        if (!open) return;
        const timer = setInterval(async () => {
            const { data } = await supabase.from('jobs').select(DOCS_COLUMNS).eq('id', job.id).single();
            if (data && (data.docs_status !== job.docs_status || data.docs_updated_at !== job.docs_updated_at)) {
                onChange(data as DocsFields);
                useJobTrackerStore.setState(s => ({ jobs: s.jobs.map(j => (j.id === job.id ? { ...j, docs_status: data.docs_status } : j)) }));
            }
        }, POLL_MS);
        return () => clearInterval(timer);
    }, [open, job.id, job.docs_status, job.docs_updated_at, onChange]);

    const save = async (fields: Partial<DocsFields>, activity?: string) => {
        setSaving(true);
        setError(null);
        try {
            await updateJob(job.id, fields);
            onChange(fields);
            if (activity) {
                await addActivity({ job_id: job.id, type: 'note', content: activity, activity_date: new Date().toISOString() });
                onActivity?.(activity);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setSaving(false);
        }
    };

    const request = () => {
        const now = new Date().toISOString();
        return save({
            docs_status: 'requested',
            docs_note: note.trim() || null,
            docs_review_first: reviewFirst,
            docs_requested_at: now,
            docs_updated_at: now,
            docs_message: null,
            docs_files: null,
        }, 'Requested CV and cover letter');
    };

    const cancel = () => save({ docs_status: null, docs_message: null, docs_updated_at: new Date().toISOString() }, 'Cancelled CV and cover letter request');

    const copyPath = async (path: string) => {
        await navigator.clipboard.writeText(path);
        setCopied(path);
        setTimeout(() => setCopied(c => (c === path ? null : c)), 1500);
    };

    const showForm = status === null || status === 'ready' || status === 'failed';

    return (
        <div className="rounded-2xl border border-white/5 bg-surface-elevated p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Sparkles className="h-4 w-4 text-accent" /> CV and cover letter
                </div>
                {status && <span className={`text-xs font-medium ${STATUS_TEXT[status].tone}`}>{STATUS_TEXT[status].label}</span>}
            </div>

            {open && (
                <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2 text-zinc-300">
                        {status === 'in_progress'
                            ? <Loader2 className="h-4 w-4 mt-0.5 shrink-0 animate-spin text-blue-300" />
                            : <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />}
                        <span>
                            {status === 'requested' && <>Requested {ago(job.docs_requested_at)}. In Claude Code, say <span className="font-mono text-foreground">build the queue</span>.</>}
                            {status === 'in_progress' && <>Started {ago(job.docs_updated_at)}.</>}
                            {status === 'waiting_on_you' && <>Claude has a plan or a question for you in Claude Code.</>}
                        </span>
                    </div>
                    {job.docs_message && <p className="text-zinc-300 whitespace-pre-wrap">{job.docs_message}</p>}
                    {job.docs_note && <p className="text-xs text-muted-foreground">Your note: {job.docs_note}</p>}
                    <Button variant="ghost" size="sm" onClick={cancel} disabled={saving} className="gap-1.5 text-muted-foreground">
                        <X className="h-3.5 w-3.5" /> Cancel request
                    </Button>
                </div>
            )}

            {status === 'ready' && (
                <div className="space-y-2">
                    {job.docs_message && <p className="text-sm text-zinc-300 whitespace-pre-wrap">{job.docs_message}</p>}
                    <ul className="space-y-1.5">
                        {(job.docs_files ?? []).map(f => (
                            <li key={f.path} className="flex items-center gap-2 text-sm">
                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="min-w-0 flex-1">
                                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{f.label}</div>
                                    <div className="text-foreground truncate" title={f.path}>{fileName(f.path)}</div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyPath(f.path)} title="Copy file path">
                                    {copied === f.path ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                                </Button>
                            </li>
                        ))}
                    </ul>
                    <p className="text-xs text-muted-foreground">Built {ago(job.docs_updated_at)}. Files are on your Mac.</p>
                </div>
            )}

            {status === 'failed' && job.docs_message && <p className="text-sm text-red-300 whitespace-pre-wrap">{job.docs_message}</p>}

            {showForm && (
                <div className="space-y-3">
                    <Textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        rows={3}
                        placeholder="Anything to emphasise or avoid? (optional)"
                        className="text-sm"
                    />
                    <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                        <Checkbox checked={reviewFirst} onCheckedChange={v => setReviewFirst(v === true)} />
                        Show me the plan before building
                    </label>
                    <Button size="sm" onClick={request} disabled={saving} className="gap-2 w-full">
                        {status ? <RotateCcw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                        {saving ? 'Queuing…' : status ? 'Request a new version' : 'Build CV + cover letter'}
                    </Button>
                </div>
            )}

            {error && <p className="text-xs text-red-300">{error}</p>}
        </div>
    );
};
