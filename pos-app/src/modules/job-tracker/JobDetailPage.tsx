import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import {
    ArrowLeft, Building2, MapPin, Briefcase, Wallet, Calendar, ExternalLink, Star, Trash2,
    CheckCircle2, AlertTriangle, OctagonX, FileText, ShieldCheck, Gauge, Route as RouteIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useJobTrackerStore } from '@/store/useJobTrackerStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FitBadge } from './components/FitBadge';
import { DocsPanel } from './components/DocsPanel';
import { JobGaps } from './components/JobGaps';
import { Job, JobActivity, JobStatus } from './types';

const STATUS_OPTIONS: { value: JobStatus; label: string; color: string }[] = [
    { value: 'wishlist', label: 'Wishlist', color: 'bg-[#1E2330] text-slate-300 border-slate-600/30' },
    { value: 'applied', label: 'Applied', color: 'bg-blue-900/30 text-blue-300 border-blue-700/30' },
    { value: 'interviewing', label: 'Interviewing', color: 'bg-amber-900/30 text-amber-300 border-amber-700/30' },
    { value: 'offer', label: 'Offer', color: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/30' },
    { value: 'rejected', label: 'Rejected', color: 'bg-red-900/30 text-red-300 border-red-700/30' },
    { value: 'archived', label: 'Archived', color: 'bg-[#1A1F2B] text-slate-400 border-slate-700/30' },
    { value: 'unavailable', label: 'Unavailable', color: 'bg-[#1A1F2B] text-slate-500 border-slate-700/30 line-through' },
];

interface ReportSection { id: string; title: string; body: string }

// Splits a career-ops report into its "## " sections. The Machine Summary is
// shown as structured data and the archived JD has its own section, so both
// are left out of the report body.
const splitReport = (md: string): { sections: ReportSection[]; jd?: string } => {
    const parts = md.split(/^## /m).slice(1);
    const sections: ReportSection[] = [];
    let jd: string | undefined;
    for (const part of parts) {
        const newline = part.indexOf('\n');
        const title = (newline === -1 ? part : part.slice(0, newline)).trim();
        const body = newline === -1 ? '' : part.slice(newline + 1).trim();
        if (/^machine summary/i.test(title)) continue;
        if (/^job description/i.test(title)) { jd = body; continue; }
        sections.push({ id: `section-${sections.length}`, title, body });
    }
    return { sections, jd };
};

const Markdown = ({ children }: { children: string }) => (
    <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-headings:text-foreground prose-strong:text-foreground prose-table:text-xs prose-th:text-left prose-td:align-top prose-a:text-accent">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
);

const Fact = ({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value?: string | null }) =>
    value ? (
        <div className="flex items-start gap-2 text-sm">
            <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
                <div className="text-foreground break-words">{value}</div>
            </div>
        </div>
    ) : null;

const ListBlock = ({ title, items, icon: Icon, tone }: { title: string; items?: string[]; icon: typeof MapPin; tone: string }) =>
    items && items.length > 0 ? (
        <div className="space-y-2">
            <div className={`flex items-center gap-2 text-sm font-semibold ${tone}`}>
                <Icon className="h-4 w-4" /> {title}
            </div>
            <ul className="space-y-1.5 text-sm text-zinc-300 list-disc pl-5">
                {items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
        </div>
    ) : null;

const formatDate = (value?: string | null) => (value ? format(new Date(value), 'd MMM yyyy') : undefined);

export const JobDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { updateJob, updateJobStatus, togglePriority, deleteJob } = useJobTrackerStore();
    const storeJob = useJobTrackerStore(s => s.jobs.find(j => j.id === id));

    const [job, setJob] = useState<Job | null>(null);
    const [activities, setActivities] = useState<JobActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);

    // The list view leaves out the report body, so the detail page loads the full row.
    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            const [{ data, error: jobError }, { data: acts }] = await Promise.all([
                supabase.from('jobs').select('*').eq('id', id).single(),
                supabase.from('job_activities').select('*').eq('job_id', id).order('activity_date', { ascending: false }),
            ]);
            if (cancelled) return;
            if (jobError) setError(jobError.message);
            else {
                setJob(data as Job);
                setNotes((data as Job).notes ?? '');
            }
            setActivities((acts ?? []) as JobActivity[]);
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [id]);

    // Keep status and priority in step with changes made through the store.
    const current = job ? { ...job, status: storeJob?.status ?? job.status, priority: storeJob?.priority ?? job.priority } : null;
    const report = useMemo(() => (job?.report_md ? splitReport(job.report_md) : null), [job?.report_md]);
    const evaluation = job?.evaluation ?? null;
    const jdText = job?.description || report?.jd;
    const handleDocsChange = useCallback((fields: Partial<Job>) => setJob(j => (j ? { ...j, ...fields } : j)), []);
    const handleDocsActivity = useCallback((content: string) => {
        const now = new Date().toISOString();
        setActivities(a => [{ id: `local-${Date.now()}`, job_id: id ?? '', user_id: '', type: 'note', content, activity_date: now, created_at: now }, ...a]);
    }, [id]);

    if (loading) return <div className="p-8 text-muted-foreground">Loading job…</div>;
    if (error || !current) {
        return (
            <div className="p-8 space-y-4">
                <Link to="/jobs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to Job Tracker</Link>
                <div className="text-red-300">{error ?? 'Job not found.'}</div>
            </div>
        );
    }

    const statusConfig = STATUS_OPTIONS.find(s => s.value === current.status) ?? STATUS_OPTIONS[0];

    const handleStatus = async (status: JobStatus) => {
        setJob(j => (j ? { ...j, status } : j));
        await updateJobStatus(current.id, status);
        setActivities(a => [{ id: `local-${Date.now()}`, job_id: current.id, user_id: current.user_id, type: 'status_change', content: `Moved to ${status}`, activity_date: new Date().toISOString(), created_at: new Date().toISOString() }, ...a]);
    };

    const handlePriority = async () => {
        setJob(j => (j ? { ...j, priority: !current.priority } : j));
        await togglePriority(current.id);
    };

    const handleSaveNotes = async () => {
        setSavingNotes(true);
        try {
            await updateJob(current.id, { notes });
            setJob(j => (j ? { ...j, notes } : j));
        } finally {
            setSavingNotes(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Delete this job?')) return;
        await deleteJob(current.id);
        navigate('/jobs');
    };

    const scrollTo = (sectionId: string) => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    return (
        <div className="h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
                {/* Header */}
                <div className="space-y-4">
                    <Link to="/jobs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" /> Job Tracker
                    </Link>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-3xl font-bold tracking-tight text-foreground">{current.role}</h1>
                                <FitBadge score={current.fit_score} verdict={current.fit_verdict} showLabel />
                            </div>
                            <div className="flex items-center gap-2 text-text-secondary">
                                <Building2 className="h-4 w-4" /> <span>{current.company}</span>
                                {current.location && <><span className="opacity-40">·</span><MapPin className="h-4 w-4" /> <span>{current.location}</span></>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={handlePriority} title={current.priority ? 'Remove priority' : 'Mark as priority'}>
                                <Star className={`h-4 w-4 ${current.priority ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger className={`px-3 h-9 text-xs font-bold tracking-wide uppercase rounded-md border ${statusConfig.color}`}>
                                    {statusConfig.label}
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {STATUS_OPTIONS.map(s => (
                                        <DropdownMenuItem key={s.value} onClick={() => handleStatus(s.value)}>{s.label}</DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            {current.url && (
                                <Button asChild className="gap-2">
                                    <a href={current.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Open posting</a>
                                </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={handleDelete} title="Delete job"><Trash2 className="h-4 w-4 text-red-400" /></Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
                    {/* Main column */}
                    <div className="space-y-6 min-w-0">
                        {/* Verdict and summary */}
                        {(evaluation || current.fit_notes) && (
                            <div className="rounded-2xl border border-white/5 bg-surface-elevated p-6 space-y-5">
                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                    <Gauge className="h-4 w-4 text-amber-400" /> Evaluation summary
                                </div>
                                {evaluation?.lead && <Markdown>{evaluation.lead}</Markdown>}
                                {current.fit_notes && <p className="text-sm text-zinc-300 whitespace-pre-wrap">{current.fit_notes}</p>}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <ListBlock title="Strengths" items={evaluation?.top_strengths} icon={CheckCircle2} tone="text-emerald-300" />
                                    <ListBlock title="Gaps" items={evaluation?.soft_gaps} icon={AlertTriangle} tone="text-amber-300" />
                                </div>
                                <ListBlock title="Hard stops" items={evaluation?.hard_stops} icon={OctagonX} tone="text-red-300" />
                            </div>
                        )}

                        {/* Section navigation */}
                        {report && report.sections.length > 0 && (
                            <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-background/90 backdrop-blur">
                                <div className="flex flex-wrap gap-1.5">
                                    {report.sections.map(s => (
                                        <button key={s.id} onClick={() => scrollTo(s.id)} className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface/60 border border-border/50 text-muted-foreground hover:text-foreground">
                                            {s.title}
                                        </button>
                                    ))}
                                    {jdText && (
                                        <button onClick={() => scrollTo('section-jd')} className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface/60 border border-border/50 text-muted-foreground hover:text-foreground">
                                            Job description
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Full report */}
                        {report?.sections.map(s => (
                            <section key={s.id} id={s.id} className="scroll-mt-16 rounded-2xl border border-white/5 bg-surface-elevated p-6 space-y-3">
                                <h2 className="text-lg font-semibold text-foreground">{s.title}</h2>
                                <Markdown>{s.body}</Markdown>
                            </section>
                        ))}

                        {!report && (
                            <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                                {current.fit_score !== null && current.fit_score !== undefined
                                    ? 'First-pass triage only. The full career-ops evaluation has not been run for this role yet.'
                                    : 'No career-ops evaluation for this role.'}
                            </div>
                        )}

                        {/* Job description */}
                        {jdText && (
                            <section id="section-jd" className="scroll-mt-16 rounded-2xl border border-white/5 bg-surface-elevated p-6 space-y-3">
                                <h2 className="text-lg font-semibold text-foreground">Job description</h2>
                                <Markdown>{jdText}</Markdown>
                            </section>
                        )}
                    </div>

                    {/* Sidebar */}
                    <aside className="space-y-4 lg:sticky lg:top-4">
                        <DocsPanel job={current} onChange={handleDocsChange} onActivity={handleDocsActivity} />
                        <JobGaps jobId={current.id} />

                        <div className="rounded-2xl border border-white/5 bg-surface-elevated p-5 space-y-4">
                            <div className="text-sm font-semibold text-foreground">Fit</div>
                            <Fact icon={Gauge} label="Score" value={current.fit_score !== null && current.fit_score !== undefined ? `${Number(current.fit_score).toFixed(1)} / 5` : undefined} />
                            <Fact icon={CheckCircle2} label="Decision" value={evaluation?.decision} />
                            <Fact icon={ShieldCheck} label="Posting legitimacy" value={evaluation?.legitimacy} />
                            <Fact icon={AlertTriangle} label="Risk level" value={evaluation?.risk_level} />
                            <Fact icon={Briefcase} label="Role type" value={current.archetype} />
                            <Fact icon={FileText} label="CV to use" value={current.cv_pick} />
                            <Fact icon={RouteIcon} label="Via" value={evaluation?.via} />
                            <Fact icon={ShieldCheck} label="Work authorisation" value={evaluation?.work_auth} />
                            <Fact icon={Calendar} label="Evaluated" value={evaluation?.date ? formatDate(evaluation.date) : formatDate(current.fit_updated_at)} />
                            <Fact icon={FileText} label="Full report file" value={current.report_path} />
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-surface-elevated p-5 space-y-4">
                            <div className="text-sm font-semibold text-foreground">Role</div>
                            <Fact icon={MapPin} label="Location" value={current.location} />
                            <Fact icon={Briefcase} label="Work mode" value={current.work_mode !== 'unknown' ? current.work_mode : undefined} />
                            <Fact icon={Briefcase} label="Employment type" value={current.employment_type !== 'unknown' ? current.employment_type : undefined} />
                            <Fact icon={Wallet} label="Salary" value={current.salary_range || 'Not stated'} />
                            <Fact icon={Calendar} label="Posted" value={formatDate(current.posted_at)} />
                            <Fact icon={Calendar} label="Added" value={formatDate(current.created_at)} />
                            <Fact icon={RouteIcon} label="Source" value={current.source} />
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-surface-elevated p-5 space-y-3">
                            <div className="text-sm font-semibold text-foreground">Notes</div>
                            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5} placeholder="Your notes on this role…" className="text-sm" />
                            <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes || notes === (job?.notes ?? '')}>
                                {savingNotes ? 'Saving…' : 'Save notes'}
                            </Button>
                        </div>

                        {activities.length > 0 && (
                            <div className="rounded-2xl border border-white/5 bg-surface-elevated p-5 space-y-3">
                                <div className="text-sm font-semibold text-foreground">Activity</div>
                                <ul className="space-y-2 text-sm">
                                    {activities.map(a => (
                                        <li key={a.id} className="flex justify-between gap-3">
                                            <span className="text-zinc-300">{a.content}</span>
                                            <span className="text-xs text-muted-foreground shrink-0">{formatDate(a.activity_date)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
};
