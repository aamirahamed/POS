import { FC, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock, XCircle, FlaskConical, RotateCcw, Play, Pause, TimerReset } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BgDay, BgModule, isDoneOnTime } from '../quest';
import { ModuleContent, NumbersProblem, ResponseField } from '../sampleContent';
import { MODULE_META, hsl } from '../moduleMeta';
import { BgAttempt, GRADED_MODULES } from '@/services/brainGymService';
import { useBrainGymStore } from '@/store/useBrainGymStore';
import { Feedback, FeedbackView } from './FeedbackView';
import { BlockList, BlockView, Markdown } from './Blocks';
import { HelperPanel } from './HelperPanel';
import { HELPER_IDENTITY, helperModeFor } from '../helperModes';

interface Props {
    day: BgDay;
    module: BgModule;
    timezone: string;
    latestAttempt: BgAttempt | undefined;
    onSubmit: (response: Record<string, unknown>, score: number | null) => Promise<void>;
    extra?: ReactNode; // module-specific live content, e.g. the week's chart on review day
    helperOpen: boolean;
    onToggleHelper: () => void;
}

const isCorrect = (problem: NumbersProblem, raw: string): boolean => {
    const value = Number(raw.replace(/[,$%k\s]/gi, ''));
    return Number.isFinite(value) && Math.abs(value - problem.answer) <= problem.tolerance;
};

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// ── Answer timer ──────────────────────────────────────────────────────────────

const AnswerTimer: FC<{ target: number }> = ({ target }) => {
    const [elapsed, setElapsed] = useState(0);
    const [running, setRunning] = useState(false);
    const ref = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (running) ref.current = setInterval(() => setElapsed(e => e + 1), 1000);
        return () => { if (ref.current) clearInterval(ref.current); };
    }, [running]);

    const over = elapsed > target;
    const pct = Math.min(100, (elapsed / target) * 100);
    return (
        <div className="flex items-center gap-4 rounded-xl border border-border bg-background/60 px-4 py-2.5">
            <button onClick={() => setRunning(r => !r)} className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center hover:bg-accent/30">
                {running ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <div className={`text-lg font-bold tabular-nums ${over ? 'text-amber-300' : 'text-text-primary'}`}>{fmtTime(elapsed)}</div>
            <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${over ? 'bg-amber-300' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="text-xs text-text-secondary">target {fmtTime(target)}</div>
            <button onClick={() => { setRunning(false); setElapsed(0); }} className="text-text-secondary hover:text-text-primary" title="Reset">
                <TimerReset size={15} />
            </button>
        </div>
    );
};

// ── Numbers ───────────────────────────────────────────────────────────────────

const NumbersInput: FC<{
    problems: NumbersProblem[];
    previous: string[] | undefined;
    disabled: boolean;
    onCheck: (answers: string[]) => Promise<void>;
    onDraftChange: (draft: string) => void;
}> = ({ problems, previous, disabled, onCheck, onDraftChange }) => {
    const [answers, setAnswers] = useState<string[]>(previous ?? problems.map(() => ''));
    const checked = previous !== undefined;

    useEffect(() => {
        onDraftChange(answers.map((a, i) => `Problem ${i + 1}: ${a.trim() || '(blank)'}`).join('\n'));
    }, [answers, onDraftChange]);
    const correctCount = checked ? problems.filter((p, i) => isCorrect(p, previous[i] ?? '')).length : 0;

    return (
        <div className="flex flex-col gap-4">
            {checked && (
                <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                        {problems.map((p, i) => (
                            <div key={i} className={`w-8 h-2 rounded-full ${isCorrect(p, previous[i] ?? '') ? 'bg-emerald-400' : 'bg-rose-400/70'}`} />
                        ))}
                    </div>
                    <span className="text-sm font-bold text-text-primary">{correctCount} of {problems.length} correct</span>
                </div>
            )}
            {problems.map((p, i) => {
                const correct = checked && isCorrect(p, previous[i] ?? '');
                return (
                    <div key={i} className="rounded-2xl border border-border bg-surface-elevated/40 p-5 flex flex-col gap-4">
                        <div className="flex gap-3">
                            <div className="w-7 h-7 rounded-lg bg-emerald-400/15 text-emerald-300 text-sm font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                            <Markdown>{p.question}</Markdown>
                        </div>
                        <div className="flex items-center gap-3 pl-10">
                            <input
                                value={answers[i]}
                                onChange={e => setAnswers(a => a.map((v, j) => (j === i ? e.target.value : v)))}
                                disabled={checked || disabled}
                                inputMode="decimal"
                                placeholder="Your answer"
                                className="w-40 bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent disabled:opacity-80"
                            />
                            {p.unit && <span className="text-xs text-text-secondary">{p.unit}</span>}
                            {checked && (correct
                                ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400"><CheckCircle2 size={14} /> Correct</span>
                                : <span className="flex items-center gap-1 text-xs font-semibold text-rose-300"><XCircle size={14} /> Answer: {p.answer.toLocaleString('en-AU', { maximumFractionDigits: 2 })}{p.unit ? ` ${p.unit}` : ''}</span>)}
                        </div>
                        {checked && (
                            <div className="ml-10 border-t border-border pt-4 flex flex-col gap-4">
                                <Markdown>{p.solution}</Markdown>
                                {p.visual && <BlockView block={p.visual} />}
                            </div>
                        )}
                    </div>
                );
            })}
            {!checked && (
                <Button onClick={() => onCheck(answers)} disabled={disabled || answers.some(a => a.trim() === '')} className="self-start">
                    Check answers
                </Button>
            )}
        </div>
    );
};

// ── Written answers (one box, or several labelled fields) ─────────────────────

const fieldsToText = (fields: ResponseField[], values: Record<string, string>) =>
    fields.map(f => `${f.label}\n${values[f.id]?.trim() ?? ''}`).join('\n\n');

const WrittenAnswer: FC<{
    content: ModuleContent;
    done: boolean;
    latestAttempt: BgAttempt | undefined;
    saving: boolean;
    onSave: (response: Record<string, unknown>) => Promise<void>;
    onDraftChange?: (draft: string) => void;
    moduleId: string;
    graded: boolean;
}> = ({ content, done, latestAttempt, saving, onSave, onDraftChange, moduleId, graded }) => {
    const { attempts, grading, gradeErrors, gradeLatest } = useBrainGymStore();
    // The previous graded attempt's score, so a redo shows the change
    const moduleAttempts = attempts.filter(a => a.moduleId === moduleId);
    const previousGraded = moduleAttempts.slice(0, -1).reverse().find(a => a.feedback);
    const previousScore = previousGraded ? Number((previousGraded.feedback as unknown as Feedback).score) : undefined;
    const fields = useMemo(() => (content.responseType === 'fields' ? content.fields ?? [] : []), [content]);
    const previousFields = (latestAttempt?.response.fields as Record<string, string> | undefined) ?? undefined;
    const previousText = typeof latestAttempt?.response.text === 'string' ? latestAttempt.response.text : null;

    const [revising, setRevising] = useState(false);
    const [text, setText] = useState('');
    const [values, setValues] = useState<Record<string, string>>({});

    const showSaved = done && previousText !== null && !revising;

    // Keep the coach aware of what's written so far (or the saved answer, once done)
    useEffect(() => {
        if (!onDraftChange) return;
        if (showSaved) onDraftChange(previousText ?? '');
        else onDraftChange(fields.length ? fieldsToText(fields, values) : text);
    }, [onDraftChange, showSaved, previousText, fields, values, text]);
    const ready = fields.length ? fields.every(f => (values[f.id] ?? '').trim() !== '') : text.trim() !== '';

    const startRevising = () => {
        setText(previousText ?? '');
        setValues(previousFields ?? {});
        setRevising(true);
    };

    const save = async () => {
        if (fields.length) await onSave({ fields: values, text: fieldsToText(fields, values) });
        else await onSave({ text: text.trim() });
        setRevising(false);
    };

    if (showSaved) {
        return (
            <div className="flex flex-col gap-3">
                {fields.length && previousFields ? (
                    <div className="grid gap-3">
                        {fields.map(f => (
                            <div key={f.id} className="rounded-xl border border-border bg-background/60 p-3.5">
                                <div className="text-[11px] font-semibold text-text-secondary/80">{f.label}</div>
                                <div className="text-sm text-text-primary mt-1 whitespace-pre-wrap">{previousFields[f.id]}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="whitespace-pre-wrap text-sm text-text-secondary bg-background/60 border border-border rounded-xl p-4">{previousText}</div>
                )}
                <div className="flex items-center gap-3">
                    <button onClick={startRevising} className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover">
                        <RotateCcw size={12} /> Write a better version
                    </button>
                    {latestAttempt && gradeErrors[latestAttempt.id] && (
                        <button onClick={() => gradeLatest(latestAttempt.id)} className="text-xs text-text-secondary hover:text-text-primary underline">Try grading again</button>
                    )}
                </div>
                {graded && latestAttempt && (
                    <FeedbackView
                        feedback={(latestAttempt.feedback as unknown as Feedback | null) ?? null}
                        grading={!!grading[latestAttempt.id]}
                        previousScore={previousScore}
                        error={gradeErrors[latestAttempt.id] ?? null}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {fields.length ? (
                fields.map(f => (
                    <label key={f.id} className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-text-secondary">{f.label}</span>
                        <Textarea
                            value={values[f.id] ?? ''}
                            onChange={e => setValues(v => ({ ...v, [f.id]: e.target.value }))}
                            placeholder={f.placeholder}
                            rows={f.rows ?? 2}
                            className={`bg-background/60 border-border text-sm text-text-primary ${(f.rows ?? 2) <= 1 ? 'min-h-[44px]' : 'min-h-[72px]'}`}
                        />
                    </label>
                ))
            ) : (
                <Textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Type your answer…"
                    className="min-h-[180px] bg-background/60 border-border text-sm text-text-primary"
                />
            )}
            <div className="flex items-center gap-3">
                <Button onClick={save} disabled={saving || !ready}>{done ? 'Save new version' : 'Save and mark done'}</Button>
                {revising && <button onClick={() => setRevising(false)} className="text-xs text-text-secondary hover:text-text-primary">Cancel</button>}
                {!ready && fields.length > 0 && <span className="text-xs text-text-secondary/60">Fill every field to finish</span>}
            </div>
        </div>
    );
};

// ── Panel ─────────────────────────────────────────────────────────────────────

export const ModulePanel: FC<Props> = ({ day, module, timezone, latestAttempt, onSubmit, extra, helperOpen, onToggleHelper }) => {
    const content = module.content as unknown as ModuleContent;
    const meta = MODULE_META[module.moduleKey];
    const Icon = meta.icon;
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState('');

    const done = module.completedAt !== null;
    const late = done && !isDoneOnTime(module, day.date, timezone);
    const helper = HELPER_IDENTITY[helperModeFor(module.moduleKey, done)];
    const HelperIcon = helper.icon;

    const save = async (response: Record<string, unknown>, score: number | null) => {
        setSaving(true);
        try { await onSubmit(response, score); } finally { setSaving(false); }
    };

    const checkNumbers = async (answers: string[]) => {
        const problems = content.problems ?? [];
        const correct = problems.filter((p, i) => isCorrect(p, answers[i])).length;
        await save({ answers }, problems.length ? correct / problems.length : null);
    };

    return (
        <div className="flex flex-col">
            {/* Header band */}
            <div
                className="-mx-8 -mt-8 px-8 pt-7 pb-6 mb-7 rounded-t-3xl border-b border-border"
                style={{ background: `linear-gradient(135deg, ${hsl(meta.hue, 70, 55, 0.16)}, ${hsl(meta.hue, 70, 55, 0.03)} 60%, transparent)` }}
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: hsl(meta.hue, 70, 55, 0.2), color: hsl(meta.hue, 80, 72) }}>
                            <Icon size={24} />
                        </div>
                        <div>
                            <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: hsl(meta.hue, 80, 72) }}>{meta.label}</div>
                            <h2 className="text-2xl font-bold text-text-primary tracking-tight mt-0.5">{content.intro ?? module.title}</h2>
                            <div className="flex flex-wrap items-center gap-2 mt-2.5">
                                {module.minutes !== null && <span className="flex items-center gap-1 text-xs text-text-secondary"><Clock size={12} /> {module.minutes} min</span>}
                                {content.tags?.map(t => (
                                    <span key={t} className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-surface/60 text-text-secondary">{t}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                            onClick={onToggleHelper}
                            className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors"
                            style={helperOpen
                                ? { background: hsl(meta.hue, 70, 55, 0.25), borderColor: hsl(meta.hue, 70, 60, 0.5), color: hsl(meta.hue, 80, 80) }
                                : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.12)', color: hsl(meta.hue, 80, 75) }}
                        >
                            <HelperIcon size={13} /> {helperOpen ? `Hide ${helper.name.toLowerCase()}` : helper.button}
                        </button>
                        {done && (
                            <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${late ? 'text-amber-300 border-amber-300/30 bg-amber-300/10' : 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10'}`}>
                                <CheckCircle2 size={13} /> {late ? 'Done late' : 'Done'}
                            </span>
                        )}
                        {content.series && (
                            <div className="flex flex-col items-end gap-1.5">
                                <span className="text-[11px] text-text-secondary">{content.series.name} · {content.series.part} of {content.series.total}</span>
                                <div className="flex gap-1">
                                    {Array.from({ length: content.series.total }).map((_, i) => (
                                        <div key={i} className="w-4 h-1.5 rounded-full" style={{ background: i < content.series!.part ? hsl(meta.hue, 70, 60) : 'rgba(255,255,255,0.1)' }} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {content.sample && (
                    <div className="flex items-start gap-1.5 text-xs text-amber-300/90 mt-4">
                        <FlaskConical size={13} className="shrink-0 mt-0.5" />
                        <span>Sample content.{content.sampleNote ? ` ${content.sampleNote}` : ''}</span>
                    </div>
                )}
            </div>

            <div className={helperOpen ? 'grid grid-cols-[1fr_360px] gap-6 items-start' : ''}>
            <div className="flex flex-col gap-7 min-w-0">
                {extra}
                {content.blocks ? <BlockList blocks={content.blocks} /> : content.body ? <Markdown>{content.body}</Markdown> : null}

                {/* Output */}
                <div className="rounded-2xl border p-5 flex flex-col gap-4" style={{ borderColor: hsl(meta.hue, 70, 60, 0.3), background: hsl(meta.hue, 70, 55, 0.05) }}>
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold text-text-primary">{content.prompt}</p>
                    </div>
                    {content.timerSeconds && !done && <AnswerTimer target={content.timerSeconds} />}
                    {content.responseType === 'numeric' ? (
                        <NumbersInput
                            key={module.id}
                            problems={content.problems ?? []}
                            previous={latestAttempt?.response.answers as string[] | undefined}
                            disabled={saving}
                            onCheck={checkNumbers}
                            onDraftChange={setDraft}
                        />
                    ) : (
                        <WrittenAnswer
                            key={module.id}
                            content={content}
                            done={done}
                            latestAttempt={latestAttempt}
                            saving={saving}
                            onSave={response => save(response, null)}
                            onDraftChange={setDraft}
                            moduleId={module.id}
                            graded={GRADED_MODULES.has(module.moduleKey)}
                        />
                    )}
                </div>
            </div>
            {helperOpen && (
                <div className="sticky top-6">
                    <HelperPanel moduleId={module.id} moduleKey={module.moduleKey} completed={done} draft={draft} hue={meta.hue} onClose={onToggleHelper} />
                </div>
            )}
            </div>
        </div>
    );
};
