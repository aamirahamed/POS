import { FC, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Brain, Flame, Snowflake, CheckCircle2, Circle, AlertCircle, CalendarDays, ListChecks, Loader2, PartyPopper, Briefcase, Target, Clock, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBrainGymStore, todayFor, DEFAULT_TIMEZONE } from '@/store/useBrainGymStore';
import { GRADED_MODULES } from '@/services/brainGymService';
import { computeQuest, isDoneOnTime, programEndDate, addDays } from './quest';
import { MODULE_META, hsl } from './moduleMeta';
import { doneBySkill, numbersAccuracy, seriesProgress, tallyByModule, weekDates } from './insights';
import { ModulePanel } from './components/ModulePanel';
import { QuestMap } from './components/QuestMap';
import { ModuleCompletion, Panel, ProgressRing, SeriesList, SkillMix, WeekStrip } from './components/ProgressViews';

// The goal the 60 days build toward (docs/specs/BRAIN_GYM.md, "Purpose")
const APPLICATIONS_OPEN = { date: '2026-11-30', label: 'PM applications open' };

const toLocal = (date: string) => new Date(`${date}T00:00:00`);
const nice = (date: string) => format(toLocal(date), 'EEE d MMM');
const daysBetween = (from: string, to: string) => Math.round((toLocal(to).getTime() - toLocal(from).getTime()) / 86_400_000);

const StartProgram: FC<{ onStart: (date: string) => Promise<void> }> = ({ onStart }) => {
    const [date, setDate] = useState(todayFor(null));
    const [busy, setBusy] = useState(false);
    const preview = ['ai_briefing', 'interview_rep', 'think', 'numbers', 'lesson', 'history', 'close'] as const;
    return (
        <div className="max-w-3xl mx-auto mt-14 bg-surface border border-border rounded-3xl overflow-hidden">
            <div className="p-8 bg-gradient-to-br from-accent/15 via-transparent to-emerald-400/5 border-b border-border flex gap-5 items-start">
                <div className="w-14 h-14 rounded-2xl bg-accent/20 text-accent flex items-center justify-center shrink-0"><Brain size={28} /></div>
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Start your 60 days</h1>
                    <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
                        A 40-minute morning routine to get interview-ready and think sharper. Saturdays are a mock interview, Sundays a weekly review and a product teardown. One freeze a week covers a day you can't make.
                    </p>
                </div>
            </div>
            <div className="p-8 flex flex-col gap-6">
                <div className="grid grid-cols-7 gap-2">
                    {preview.map(key => {
                        const meta = MODULE_META[key];
                        const Icon = meta.icon;
                        return (
                            <div key={key} className="rounded-xl border border-border bg-surface-elevated/50 p-3 flex flex-col items-center gap-2 text-center">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: hsl(meta.hue, 70, 55, 0.18), color: hsl(meta.hue, 80, 72) }}><Icon size={18} /></div>
                                <span className="text-[11px] text-text-secondary leading-tight">{meta.label}</span>
                            </div>
                        );
                    })}
                </div>
                <div className="flex items-end gap-4">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Day 1</span>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-48 bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary [color-scheme:dark]"
                        />
                    </label>
                    <Button disabled={busy || !date} onClick={async () => { setBusy(true); try { await onStart(date); } finally { setBusy(false); } }}>
                        Start the program
                    </Button>
                </div>
                <p className="text-xs text-amber-300/90">Sessions use sample content until the agents are built. You can restart before the real run.</p>
            </div>
        </div>
    );
};

const StatTile: FC<{ icon: FC<{ size?: number; className?: string }>; value: React.ReactNode; label: string; tone: string; children?: React.ReactNode }> = ({ icon: Icon, value, label, tone, children }) => (
    <div className="bg-surface border border-border rounded-2xl px-5 py-4 flex flex-col gap-1 min-w-[130px]">
        <div className="flex items-center gap-2 text-xs text-text-secondary"><Icon size={14} className={tone} /> {label}</div>
        <div className="text-3xl font-black text-text-primary leading-tight">{value}</div>
        {children}
    </div>
);

const BUILD_STEPS = ['Reading the overnight AI news', 'Writing your interview question', 'Setting a thinking exercise', 'Checking the maths', "Writing today's lesson", 'Writing the history episode'];

const BuildingPanel: FC = () => {
    const [step, setStep] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setStep(s => Math.min(s + 1, BUILD_STEPS.length - 1)), 12_000);
        return () => clearInterval(t);
    }, []);
    return (
        <div className="bg-surface border border-border rounded-3xl p-10 flex flex-col items-center text-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-accent/15 text-accent flex items-center justify-center"><Sparkles size={26} className="animate-pulse" /></div>
            <div>
                <h2 className="text-xl font-bold text-text-primary">Building today's session</h2>
                <p className="text-sm text-text-secondary mt-1">The agents usually do this overnight. It takes a minute or two.</p>
            </div>
            <div className="flex flex-col gap-2 text-left">
                {BUILD_STEPS.map((label, i) => (
                    <div key={label} className={`flex items-center gap-2.5 text-sm ${i < step ? 'text-text-secondary' : i === step ? 'text-text-primary' : 'text-text-secondary/40'}`}>
                        {i < step ? <CheckCircle2 size={15} className="text-emerald-400" /> : i === step ? <Loader2 size={15} className="animate-spin text-accent" /> : <Circle size={15} />}
                        {label}
                    </div>
                ))}
            </div>
        </div>
    );
};

const BrainGymPage: FC = () => {
    const { program, days, attempts, loaded, loading, error, building, buildNotice, load, startProgram, restartProgram, rebuildToday, submitAnswer, completeModule } = useBrainGymStore();
    const [view, setView] = useState<'session' | 'progress'>('session');
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
    const [confirmRestart, setConfirmRestart] = useState(false);
    const [helperOpen, setHelperOpen] = useState(false);

    useEffect(() => { load(); }, [load]);

    const timezone = program?.timezone ?? DEFAULT_TIMEZONE;
    const today = todayFor(program);
    const quest = useMemo(() => (program ? computeQuest(program, days, today) : null), [program, days, today]);
    const week = useMemo(() => weekDates(today), [today]);

    const activeDate = selectedDate ?? today;
    const activeDay = days.find(d => d.date === activeDate);
    const activeCell = quest?.cells.find(c => c.date === activeDate);
    const firstOpen = activeDay?.modules.find(m => m.completedAt === null);
    const activeModule = activeDay?.modules.find(m => m.id === selectedModuleId) ?? firstOpen ?? activeDay?.modules[0];

    const latestAttemptFor = (moduleId: string) => {
        const forModule = attempts.filter(a => a.moduleId === moduleId);
        return forModule[forModule.length - 1];
    };

    const openModule = (date: string, moduleId: string | null) => {
        setSelectedDate(date === today ? null : date);
        setSelectedModuleId(moduleId);
        setView('session');
    };

    const handleSubmit = async (response: Record<string, unknown>, score: number | null) => {
        if (!activeModule || !activeDay) return;
        await submitAnswer(activeModule.id, response, score);
        await completeModule(activeModule.id);
        // Numbers shows its solutions after checking, so stay on it; otherwise move to the next open module
        // Stay to read the solutions (Numbers) or the Grader's feedback; otherwise move on
        if (activeModule.moduleKey === 'numbers' || GRADED_MODULES.has(activeModule.moduleKey)) {
            setSelectedModuleId(activeModule.id);
        } else {
            const next = activeDay.modules.find(m => m.completedAt === null && m.id !== activeModule.id);
            setSelectedModuleId(next?.id ?? activeModule.id);
        }
    };

    if (!loaded) {
        return <div className="h-full flex items-center justify-center text-text-secondary"><Loader2 className="animate-spin" /></div>;
    }
    if (error) {
        return (
            <div className="max-w-xl mx-auto mt-16 p-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 text-sm text-rose-200 flex flex-col gap-3">
                <span className="flex items-center gap-2 font-semibold"><AlertCircle size={16} /> {error}</span>
                <Button variant="outline" className="self-start" onClick={() => load()}>Try again</Button>
            </div>
        );
    }
    if (!program || !quest) {
        return <div className="px-8 pb-16"><StartProgram onStart={startProgram} /></div>;
    }

    const endDate = programEndDate(program);
    const beforeStart = today < program.startDate;
    const afterEnd = today > endDate;
    const doneCount = activeDay?.modules.filter(m => m.completedAt !== null).length ?? 0;
    const totalCount = activeDay?.modules.length ?? 0;
    const minutesTotal = activeDay?.modules.reduce((s, m) => s + (m.minutes ?? 0), 0) ?? 0;
    const minutesDone = activeDay?.modules.filter(m => m.completedAt).reduce((s, m) => s + (m.minutes ?? 0), 0) ?? 0;
    const viewingPast = activeDate < today;
    const daysToApplications = daysBetween(today, APPLICATIONS_OPEN.date);
    const runway = daysBetween(program.startDate, APPLICATIONS_OPEN.date);
    const runwayPct = runway > 0 ? Math.min(100, Math.max(0, ((runway - daysToApplications) / runway) * 100)) : 100;

    const todayDay = days.find(d => d.date === today);
    const nextUp = todayDay?.modules.find(m => m.completedAt === null);
    const todayRemaining = todayDay?.modules.filter(m => !m.completedAt).reduce((s, m) => s + (m.minutes ?? 0), 0) ?? 0;
    const accuracy = numbersAccuracy(days, attempts);
    const weekSkills = doneBySkill(days, week[0], week[6]);
    const reviewExtra = activeModule?.moduleKey === 'weekly_review' ? (
        <div className="grid grid-cols-2 gap-4">
            <Panel title="This week, day by day">
                <WeekStrip dates={week} cells={quest.cells} days={days} today={today} onSelect={d => openModule(d, null)} />
            </Panel>
            <Panel title="Modules finished this week, by skill">
                <SkillMix skills={weekSkills} />
            </Panel>
        </div>
    ) : undefined;

    return (
        <div className="min-h-full bg-background px-8 lg:px-12 py-10 pb-28">
            <div className="max-w-7xl mx-auto flex flex-col gap-7">

                {/* ── Hero ─────────────────────────────────────────────── */}
                <div className="grid grid-cols-[1fr_auto] gap-6 items-stretch">
                    <div className="bg-surface border border-border rounded-3xl p-6 flex items-center gap-6 bg-gradient-to-br from-accent/10 via-surface to-surface">
                        <ProgressRing
                            value={beforeStart ? 0 : afterEnd ? program.lengthDays : quest.todayNumber ?? 0}
                            total={program.lengthDays}
                            label={beforeStart ? '—' : afterEnd ? '60' : `${quest.todayNumber}`}
                            sub={`of ${program.lengthDays} days`}
                        />
                        <div className="flex flex-col gap-3 flex-1 min-w-0">
                            <div>
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent"><Brain size={14} /> Brain Gym</div>
                                <h1 className="text-3xl font-bold text-text-primary tracking-tight mt-1">
                                    {beforeStart ? `Starts ${nice(program.startDate)}` : afterEnd ? 'Program complete' : `Day ${quest.todayNumber}`}
                                </h1>
                                <p className="text-sm text-text-secondary">{format(new Date(), 'EEEE d MMMM')} · {nice(program.startDate)} → {nice(endDate)}</p>
                            </div>
                            {daysToApplications >= 0 && (
                                <div className="flex flex-col gap-1.5 max-w-md">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="flex items-center gap-1.5 text-text-primary font-semibold"><Briefcase size={13} className="text-emerald-300" /> {APPLICATIONS_OPEN.label}</span>
                                        <span className="text-text-secondary">{daysToApplications === 0 ? 'today' : `in ${daysToApplications} days`} · {nice(APPLICATIONS_OPEN.date)}</span>
                                    </div>
                                    <div className="h-1.5 bg-background rounded-full overflow-hidden">
                                        <div className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400" style={{ width: `${runwayPct}%` }} />
                                    </div>
                                </div>
                            )}
                        </div>
                        {todayDay && (
                            <div className="border-l border-border pl-6 flex flex-col gap-3 shrink-0 w-[330px]">
                                <div className="text-[11px] font-bold uppercase tracking-widest text-text-secondary/70">Today</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {todayDay.modules.map(m => {
                                        const meta = MODULE_META[m.moduleKey];
                                        const Icon = meta.icon;
                                        const done = m.completedAt !== null;
                                        return (
                                            <button
                                                key={m.id}
                                                title={`${meta.label} · ${done ? 'done' : `${m.minutes} min`}`}
                                                onClick={() => openModule(today, m.id)}
                                                className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-transform hover:scale-105"
                                                style={{ background: hsl(meta.hue, 70, 55, done ? 0.3 : 0.1), color: hsl(meta.hue, 80, done ? 78 : 60), outline: done ? `1px solid ${hsl(meta.hue, 70, 60, 0.6)}` : 'none' }}
                                            >
                                                <Icon size={16} />
                                                {done && <CheckCircle2 size={12} className="absolute -top-1 -right-1 text-emerald-400 bg-surface rounded-full" />}
                                            </button>
                                        );
                                    })}
                                </div>
                                {nextUp ? (
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-xs text-text-secondary">
                                            Next: <span className="text-text-primary font-semibold">{MODULE_META[nextUp.moduleKey].label}</span> · {nextUp.minutes} min
                                            <div className="text-[11px] text-text-secondary/70 mt-0.5">{todayRemaining} min left today</div>
                                        </div>
                                        <Button size="sm" onClick={() => openModule(today, nextUp.id)}>Continue</Button>
                                    </div>
                                ) : (
                                    <div className="text-xs text-emerald-300 flex items-center gap-1.5"><PartyPopper size={14} /> Session complete</div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <StatTile icon={Flame} value={quest.currentStreak} label="Streak" tone="text-orange-400">
                            <div className="text-[11px] text-text-secondary">best {quest.bestStreak}</div>
                        </StatTile>
                        <StatTile icon={CheckCircle2} value={<>{quest.fullDays}<span className="text-base text-text-secondary font-semibold">/{program.lengthDays}</span></>} label="Full days" tone="text-emerald-400">
                            <div className="h-1 bg-background rounded-full overflow-hidden mt-1"><div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(quest.fullDays / program.lengthDays) * 100}%` }} /></div>
                        </StatTile>
                        <StatTile icon={Snowflake} value={quest.freezesLeftThisWeek} label="Freeze left" tone="text-sky-300">
                            <div className="text-[11px] text-text-secondary">resets Monday</div>
                        </StatTile>
                        <StatTile icon={Target} value={accuracy ? `${Math.round(accuracy.correctRate * 100)}%` : '—'} label="Numbers" tone="text-emerald-300">
                            <div className="text-[11px] text-text-secondary">{accuracy ? `first tries, ${accuracy.sessions} session${accuracy.sessions === 1 ? '' : 's'}` : 'no sessions yet'}</div>
                        </StatTile>
                    </div>
                </div>

                {buildNotice && (
                    <div className="flex items-center gap-2 text-sm text-amber-200 bg-amber-300/10 border border-amber-300/30 rounded-2xl px-4 py-3">
                        <AlertCircle size={16} className="shrink-0" /> {buildNotice}
                    </div>
                )}

                {/* ── Week + view switch ───────────────────────────────── */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="text-[11px] font-bold uppercase tracking-widest text-text-secondary/70">This week</div>
                        <div className="bg-surface p-1 rounded-xl border border-border flex gap-1">
                            <button onClick={() => setView('session')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium ${view === 'session' ? 'bg-surface-hover text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
                                <ListChecks size={15} /> Session
                            </button>
                            <button onClick={() => setView('progress')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium ${view === 'progress' ? 'bg-surface-hover text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
                                <CalendarDays size={15} /> Progress
                            </button>
                        </div>
                    </div>
                    <WeekStrip dates={week} cells={quest.cells} days={days} today={today} onSelect={d => openModule(d, null)} />
                </div>

                {view === 'progress' ? (
                    <div className="grid grid-cols-[1fr_380px] gap-6 items-start">
                        <div className="flex flex-col gap-6 min-w-0">
                            <Panel title="The 60-day quest">
                                <QuestMap cells={quest.cells} onSelectDate={date => openModule(date, null)} />
                            </Panel>
                            <Panel title="Completion by module">
                                <ModuleCompletion tallies={tallyByModule(days, timezone, today)} />
                            </Panel>
                        </div>
                        <div className="flex flex-col gap-6">
                            <Panel title="Modules finished, by skill">
                                <SkillMix skills={doneBySkill(days)} />
                            </Panel>
                            <Panel title="Series">
                                <SeriesList series={seriesProgress(days)} />
                            </Panel>
                            <Panel title={`To catch up (${quest.missed.length})`}>
                            {quest.missed.length === 0 ? (
                                <div className="text-sm text-text-secondary">Nothing waiting. Every past module is done.</div>
                            ) : (
                                <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                                    {quest.missed.map(m => {
                                        const meta = MODULE_META[m.module.moduleKey];
                                        const Icon = meta.icon;
                                        return (
                                            <button key={m.module.id} onClick={() => openModule(m.day.date, m.module.id)} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-surface-hover text-left">
                                                <Icon size={14} style={{ color: hsl(meta.hue, 80, 70) }} />
                                                <span className="text-sm text-text-primary flex-1">{meta.label}</span>
                                                <span className="text-xs text-text-secondary">Day {m.dayNumber}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </Panel>
                        </div>
                    </div>
                ) : building && activeDate === today ? (
                    <BuildingPanel />
                ) : !activeDay ? (
                    <div className="bg-surface border border-border rounded-3xl p-12 text-center text-sm text-text-secondary">
                        {beforeStart ? `Your first session opens on ${nice(program.startDate)}.` : afterEnd ? 'All 60 days are behind you. The Progress tab has the full record.' : 'No session for this day.'}
                    </div>
                ) : (
                    <div className={`grid ${helperOpen ? 'grid-cols-[64px_1fr]' : 'grid-cols-[300px_1fr]'} gap-6 items-start`}>
                        {/* Session sidebar: icons only while the helper is open */}
                        {helperOpen ? (
                            <div className="bg-surface border border-border rounded-3xl p-2 flex flex-col gap-1.5 sticky top-6">
                                {activeDay.modules.map(m => {
                                    const meta = MODULE_META[m.moduleKey];
                                    const Icon = meta.icon;
                                    const done = m.completedAt !== null;
                                    const selected = m.id === activeModule?.id;
                                    return (
                                        <button
                                            key={m.id}
                                            onClick={() => setSelectedModuleId(m.id)}
                                            title={`${meta.label}${done ? ' · done' : ''}`}
                                            className={`relative w-12 h-12 rounded-xl flex items-center justify-center border ${selected ? 'border-border bg-surface-hover' : 'border-transparent hover:bg-surface-hover/60'}`}
                                        >
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: hsl(meta.hue, 70, 55, done ? 0.25 : 0.12), color: hsl(meta.hue, 80, 72) }}>
                                                <Icon size={16} />
                                            </div>
                                            {done && <CheckCircle2 size={12} className="absolute top-1 right-1 text-emerald-400 bg-surface rounded-full" />}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                        <div className="flex flex-col gap-4 sticky top-6">
                            <div className="bg-surface border border-border rounded-3xl p-4 flex flex-col gap-1.5">
                                <div className="px-2 pb-3 mb-1 border-b border-border">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-bold text-text-primary">Day {activeCell?.dayNumber} · {nice(activeDay.date)}</div>
                                        <div className="text-xs text-text-secondary flex items-center gap-1"><Clock size={11} /> {minutesDone}/{minutesTotal} min</div>
                                    </div>
                                    <div className="flex gap-1 mt-3">
                                        {activeDay.modules.map(m => (
                                            <div key={m.id} className="h-1.5 rounded-full" style={{ flex: m.minutes ?? 1, background: m.completedAt ? hsl(MODULE_META[m.moduleKey].hue, 70, 60) : 'rgba(255,255,255,0.08)' }} />
                                        ))}
                                    </div>
                                    {viewingPast && (
                                        <div className="mt-3 text-xs text-amber-300/90 leading-relaxed">
                                            A past day: anything you finish now counts as late.{' '}
                                            <button onClick={() => openModule(today, null)} className="underline hover:text-amber-200">Back to today</button>
                                        </div>
                                    )}
                                </div>
                                {activeDay.modules.map(m => {
                                    const meta = MODULE_META[m.moduleKey];
                                    const Icon = meta.icon;
                                    const done = m.completedAt !== null;
                                    const late = done && !isDoneOnTime(m, activeDay.date, timezone);
                                    const selected = m.id === activeModule?.id;
                                    return (
                                        <button
                                            key={m.id}
                                            onClick={() => setSelectedModuleId(m.id)}
                                            className={`flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-colors border ${selected ? 'bg-surface-hover border-border' : 'border-transparent hover:bg-surface-hover/60'}`}
                                        >
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: hsl(meta.hue, 70, 55, done ? 0.25 : 0.12), color: hsl(meta.hue, 80, 72) }}>
                                                <Icon size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`text-sm truncate ${done ? 'text-text-secondary' : 'text-text-primary font-medium'}`}>{meta.label}</div>
                                                <div className="text-[10px] text-text-secondary/70 truncate">{m.minutes} min{done ? (late ? ' · late' : ' · done') : ''}</div>
                                            </div>
                                            {done
                                                ? <CheckCircle2 size={16} className={late ? 'text-amber-300 shrink-0' : 'text-emerald-400 shrink-0'} />
                                                : <Circle size={16} className="text-text-secondary/40 shrink-0" />}
                                        </button>
                                    );
                                })}
                                {totalCount > 0 && doneCount === totalCount && (
                                    <div className="mt-2 rounded-xl border border-emerald-400/30 bg-gradient-to-br from-emerald-400/15 to-transparent p-3.5 text-xs text-emerald-200 flex items-center gap-2.5">
                                        <PartyPopper size={18} />
                                        <span>{activeCell?.status === 'full' ? <><b>Full day.</b> Streak: {quest.currentStreak}.</> : 'All caught up for this day.'}</span>
                                    </div>
                                )}
                            </div>

                            {quest.missed.length > 0 && (
                                <div className="bg-surface border border-amber-300/20 rounded-3xl p-4 flex flex-col gap-2">
                                    <div className="text-[11px] font-bold uppercase tracking-widest text-amber-300/90 px-1">To catch up · {quest.missed.length}</div>
                                    {quest.missed.slice(0, 5).map(m => {
                                        const meta = MODULE_META[m.module.moduleKey];
                                        const Icon = meta.icon;
                                        return (
                                            <button key={m.module.id} onClick={() => openModule(m.day.date, m.module.id)} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-hover text-left">
                                                <Icon size={14} style={{ color: hsl(meta.hue, 80, 70) }} />
                                                <span className="text-xs text-text-primary flex-1">{meta.label}</span>
                                                <span className="text-[11px] text-text-secondary">Day {m.dayNumber}</span>
                                            </button>
                                        );
                                    })}
                                    {quest.missed.length > 5 && (
                                        <button onClick={() => setView('progress')} className="text-xs text-text-secondary hover:text-text-primary px-2 text-left">+{quest.missed.length - 5} more</button>
                                    )}
                                </div>
                            )}
                        </div>

                        )}

                        {/* Active module */}
                        <div className="bg-surface border border-border rounded-3xl p-8 min-w-0">
                            {activeModule && (
                                <ModulePanel
                                    key={activeModule.id}
                                    day={activeDay}
                                    module={activeModule}
                                    timezone={timezone}
                                    latestAttempt={latestAttemptFor(activeModule.id)}
                                    onSubmit={handleSubmit}
                                    extra={reviewExtra}
                                    helperOpen={helperOpen}
                                    onToggleHelper={() => setHelperOpen(o => !o)}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Restart (for the test period before the real run) */}
                <div className="flex items-center gap-3 text-xs text-text-secondary/60">
                    {confirmRestart ? (
                        <>
                            <span className="text-rose-300">Delete every day, module and answer, and start over?</span>
                            <button onClick={async () => { await restartProgram(); setConfirmRestart(false); }} className="font-semibold text-rose-300 hover:text-rose-200">Yes, restart</button>
                            <button onClick={() => setConfirmRestart(false)} className="hover:text-text-primary">Cancel</button>
                        </>
                    ) : (
                        <button onClick={() => setConfirmRestart(true)} className="underline hover:text-text-primary">Restart program</button>
                    )}
                    {todayDay && !building && !todayDay.modules.some(m => m.completedAt) && (
                        <button onClick={() => rebuildToday()} className="flex items-center gap-1 underline hover:text-text-primary" title="Ask the agents to write today's session again (only before you start it)">
                            <RefreshCw size={11} /> Rebuild today's session
                        </button>
                    )}
                    {loading && <Loader2 size={12} className="animate-spin" />}
                    <span className="ml-auto">Ends {nice(addDays(program.startDate, program.lengthDays - 1))}</span>
                </div>
            </div>
        </div>
    );
};

export default BrainGymPage;
