import { FC, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Flame, ArrowRight } from 'lucide-react';
import { useBrainGymStore, todayFor } from '@/store/useBrainGymStore';
import { computeQuest } from '@/modules/brain-gym/quest';

export const BrainGymCard: FC = () => {
    const navigate = useNavigate();
    const { program, days, loaded, load } = useBrainGymStore();

    useEffect(() => { if (!loaded) load(); }, [loaded, load]);

    const today = todayFor(program);
    const quest = useMemo(() => (program ? computeQuest(program, days, today) : null), [program, days, today]);
    const todayDay = days.find(d => d.date === today);
    const done = todayDay?.modules.filter(m => m.completedAt !== null).length ?? 0;
    const total = todayDay?.modules.length ?? 0;

    let line = 'Set up your 60-day program';
    if (program && quest) {
        if (quest.todayNumber === null) line = today < program.startDate ? 'Your program has not started yet' : 'Program complete';
        else if (total > 0 && done === total) line = `Day ${quest.todayNumber} done`;
        else line = `Day ${quest.todayNumber}: ${done} of ${total} modules done`;
    }

    return (
        <button
            onClick={() => navigate('/brain-gym')}
            className="w-full flex items-center gap-4 bg-surface border border-border rounded-2xl px-5 py-4 hover:bg-surface-hover transition-colors text-left group"
        >
            <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0"><Brain size={20} /></div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-text-primary">Brain Gym</div>
                <div className="text-xs text-text-secondary mt-0.5">{line}</div>
                {total > 0 && (
                    <div className="h-1 bg-background rounded-full overflow-hidden mt-2 max-w-xs">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${(done / total) * 100}%` }} />
                    </div>
                )}
            </div>
            {quest && (
                <div className="flex items-center gap-1.5 text-sm font-bold text-text-primary">
                    <Flame size={16} className="text-orange-400" /> {quest.currentStreak}
                </div>
            )}
            <ArrowRight size={16} className="text-text-secondary group-hover:text-text-primary transition-colors" />
        </button>
    );
};
