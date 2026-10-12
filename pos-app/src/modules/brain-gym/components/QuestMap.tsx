import { FC } from 'react';
import { format } from 'date-fns';
import { Snowflake, Check } from 'lucide-react';
import { DayStatus, QuestCell } from '../quest';

const STATUS_STYLE: Record<DayStatus, string> = {
    full: 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200',
    partial: 'bg-amber-400/10 border-amber-300/40 text-amber-200',
    missed: 'bg-rose-500/10 border-rose-400/30 text-rose-200/80',
    frozen: 'bg-sky-400/10 border-sky-300/40 text-sky-200',
    today: 'bg-accent/15 border-accent text-text-primary ring-2 ring-accent/40',
    upcoming: 'bg-surface/40 border-border/60 text-text-secondary/50',
};

const STATUS_LABEL: Record<DayStatus, string> = {
    full: 'Full day',
    partial: 'Partly done',
    missed: 'Missed',
    frozen: 'Frozen (weekly freeze used)',
    today: 'Today',
    upcoming: 'Upcoming',
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const toLocal = (date: string) => new Date(`${date}T00:00:00`);

interface Props {
    cells: QuestCell[];
    onSelectDate: (date: string) => void;
}

export const QuestMap: FC<Props> = ({ cells, onSelectDate }) => {
    if (cells.length === 0) return null;
    const leadingBlanks = (toLocal(cells[0].date).getDay() + 6) % 7; // Monday-first calendar

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-7 gap-2">
                {WEEKDAYS.map(w => (
                    <div key={w} className="text-[10px] uppercase tracking-widest font-bold text-text-secondary/60 text-center">{w}</div>
                ))}
                {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`blank-${i}`} />)}
                {cells.map(c => {
                    const clickable = c.status !== 'upcoming' && c.total > 0;
                    return (
                        <button
                            key={c.date}
                            disabled={!clickable}
                            onClick={() => onSelectDate(c.date)}
                            title={`Day ${c.dayNumber} · ${format(toLocal(c.date), 'EEE d MMM')} · ${STATUS_LABEL[c.status]}${c.total ? ` · ${c.onTime}/${c.total} on time${c.late ? `, ${c.late} late` : ''}` : ''}`}
                            className={`relative h-16 rounded-xl border flex flex-col items-start justify-between p-2 text-left transition-transform ${STATUS_STYLE[c.status]} ${clickable ? 'hover:scale-[1.04] cursor-pointer' : 'cursor-default'}`}
                        >
                            <span className="text-[11px] font-bold">Day {c.dayNumber}</span>
                            <span className="text-[10px] opacity-70">{format(toLocal(c.date), 'd MMM')}</span>
                            {c.status === 'full' && <Check size={14} className="absolute top-2 right-2" />}
                            {c.status === 'frozen' && <Snowflake size={14} className="absolute top-2 right-2" />}
                        </button>
                    );
                })}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
                {(['full', 'partial', 'frozen', 'missed', 'today'] as DayStatus[]).map(s => (
                    <span key={s} className="flex items-center gap-1.5">
                        <span className={`w-3 h-3 rounded border ${STATUS_STYLE[s]}`} /> {STATUS_LABEL[s]}
                    </span>
                ))}
            </div>
        </div>
    );
};
