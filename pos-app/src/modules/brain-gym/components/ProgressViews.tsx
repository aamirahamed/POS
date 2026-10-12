import { FC } from 'react';
import { format } from 'date-fns';
import { Check, Snowflake } from 'lucide-react';
import { BgDay, DayStatus, QuestCell } from '../quest';
import { MODULE_META, hsl } from '../moduleMeta';
import { ModuleTally, SeriesProgress } from '../insights';

const toLocal = (date: string) => new Date(`${date}T00:00:00`);

const STATUS_COLOUR: Record<DayStatus, string> = {
    full: '#34d399',
    partial: '#fcd34d',
    missed: '#fb7185',
    frozen: '#7dd3fc',
    today: '#818cf8',
    upcoming: 'rgba(255,255,255,0.12)',
};

// ── Progress ring ─────────────────────────────────────────────────────────────

export const ProgressRing: FC<{ value: number; total: number; size?: number; label: string; sub: string }> = ({ value, total, size = 112, label, sub }) => {
    const stroke = 9;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const pct = total > 0 ? Math.min(1, value / total) : 0;
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
                <circle
                    cx={size / 2} cy={size / 2} r={r}
                    stroke="url(#bg-ring)" strokeWidth={stroke} fill="none" strokeLinecap="round"
                    strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
                />
                <defs>
                    <linearGradient id="bg-ring" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-black text-text-primary leading-none">{label}</div>
                <div className="text-[10px] text-text-secondary mt-1">{sub}</div>
            </div>
        </div>
    );
};

// ── Week strip ────────────────────────────────────────────────────────────────

export const WeekStrip: FC<{
    dates: string[];
    cells: QuestCell[];
    days: BgDay[];
    today: string;
    onSelect: (date: string) => void;
}> = ({ dates, cells, days, today, onSelect }) => (
    <div className="grid grid-cols-7 gap-2">
        {dates.map(date => {
            const cell = cells.find(c => c.date === date);
            const day = days.find(d => d.date === date);
            const done = day?.modules.filter(m => m.completedAt).length ?? 0;
            const total = day?.modules.length ?? 0;
            const status: DayStatus = cell?.status ?? 'upcoming';
            const inProgram = !!cell;
            return (
                <button
                    key={date}
                    disabled={!day}
                    onClick={() => onSelect(date)}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${date === today ? 'border-accent/60 bg-accent/10' : 'border-border bg-surface hover:bg-surface-hover'} ${!inProgram ? 'opacity-40' : ''} disabled:cursor-default`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">{format(toLocal(date), 'EEE')}</span>
                        {status === 'full' && <Check size={13} className="text-emerald-400" />}
                        {status === 'frozen' && <Snowflake size={13} className="text-sky-300" />}
                    </div>
                    <div className="text-sm font-bold text-text-primary mt-0.5">{format(toLocal(date), 'd MMM')}</div>
                    <div className="h-1 bg-background rounded-full overflow-hidden mt-2">
                        <div className="h-full rounded-full" style={{ width: total ? `${(done / total) * 100}%` : '0%', background: STATUS_COLOUR[status === 'today' ? 'today' : status] }} />
                    </div>
                    <div className="text-[10px] text-text-secondary mt-1">{inProgram ? (total ? `${done}/${total}` : status === 'upcoming' ? 'upcoming' : 'no session') : 'outside program'}</div>
                </button>
            );
        })}
    </div>
);

// ── Panels for the Progress tab ───────────────────────────────────────────────

export const Panel: FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`bg-surface border border-border rounded-3xl p-6 flex flex-col gap-4 ${className}`}>
        <div className="text-[11px] font-bold uppercase tracking-widest text-text-secondary/70">{title}</div>
        {children}
    </div>
);

export const ModuleCompletion: FC<{ tallies: ModuleTally[] }> = ({ tallies }) => (
    <div className="flex flex-col gap-3">
        {tallies.length === 0 && <div className="text-sm text-text-secondary">Nothing yet. Finish a module and it shows up here.</div>}
        {tallies.map(t => {
            const meta = MODULE_META[t.key];
            const Icon = meta.icon;
            return (
                <div key={t.key} className="grid grid-cols-[150px_1fr_60px] items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-text-primary">
                        <Icon size={14} style={{ color: hsl(meta.hue, 80, 70) }} /> {meta.label}
                    </div>
                    <div className="h-2.5 bg-background rounded-full overflow-hidden flex">
                        <div style={{ width: `${(t.onTime / t.total) * 100}%`, background: hsl(meta.hue, 70, 60) }} />
                        <div style={{ width: `${(t.late / t.total) * 100}%`, background: hsl(meta.hue, 70, 60, 0.35) }} />
                    </div>
                    <div className="text-xs text-text-secondary text-right">{t.onTime + t.late}/{t.total}</div>
                </div>
            );
        })}
        {tallies.some(t => t.late > 0) && <div className="text-[11px] text-text-secondary/70">Faded segment = caught up late.</div>}
    </div>
);

export const SkillMix: FC<{ skills: { skill: string; done: number }[] }> = ({ skills }) => {
    const max = Math.max(1, ...skills.map(s => s.done));
    const hues: Record<string, number> = { Product: 265, AI: 200, Reasoning: 40, Numbers: 150, Knowledge: 235, Reflection: 320 };
    return (
        <div className="flex items-end gap-4 h-36">
            {skills.length === 0 && <div className="text-sm text-text-secondary self-center">No modules finished yet.</div>}
            {skills.map(s => (
                <div key={s.skill} className="flex-1 min-w-0 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="text-xs font-bold text-text-primary">{s.done}</div>
                    <div className="w-full max-w-[48px] rounded-t-lg" style={{ height: `${(s.done / max) * 100}%`, minHeight: 6, background: `linear-gradient(to top, ${hsl(hues[s.skill] ?? 235, 70, 45)}, ${hsl(hues[s.skill] ?? 235, 70, 65)})` }} />
                    <div className="text-[10px] text-text-secondary">{s.skill}</div>
                </div>
            ))}
        </div>
    );
};

export const SeriesList: FC<{ series: SeriesProgress[] }> = ({ series }) => (
    <div className="flex flex-col gap-4">
        {series.length === 0 && <div className="text-sm text-text-secondary">No series started yet.</div>}
        {series.map(s => {
            const meta = MODULE_META[s.kind];
            const completed = s.part - (s.done ? 0 : 1);
            return (
                <div key={s.name} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-text-primary">{s.name}</span>
                        <span className="text-xs text-text-secondary">{completed} of {s.total} done</span>
                    </div>
                    <div className="flex gap-1.5">
                        {Array.from({ length: s.total }).map((_, i) => (
                            <div key={i} className="flex-1 h-2 rounded-full" style={{ background: i < completed ? hsl(meta.hue, 70, 60) : i === completed ? hsl(meta.hue, 70, 60, 0.35) : 'rgba(255,255,255,0.08)' }} />
                        ))}
                    </div>
                </div>
            );
        })}
    </div>
);
