import { FC, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, CircleDashed, Loader2, MinusCircle, Sparkles, XCircle } from 'lucide-react';
import { Markdown } from './Blocks';

export interface Feedback {
    score: number;
    verdict: string;
    strengths: string[];
    gaps: string[];
    better_version: string;
    rubric?: { item: string; met: 'yes' | 'partly' | 'no' }[];
}

const scoreTone = (s: number) => (s >= 8 ? 'text-emerald-300 border-emerald-400/40 bg-emerald-400/10' : s >= 5 ? 'text-amber-200 border-amber-300/40 bg-amber-300/10' : 'text-rose-200 border-rose-400/40 bg-rose-400/10');

export const FeedbackView: FC<{ feedback: Feedback | null; grading: boolean; previousScore?: number; error?: string | null }> = ({ feedback, grading, previousScore, error }) => {
    const [showBetter, setShowBetter] = useState(false);

    if (grading) {
        return (
            <div className="flex items-center gap-2 text-sm text-text-secondary rounded-xl border border-border bg-background/40 px-4 py-3">
                <Loader2 size={15} className="animate-spin text-accent" /> Grading your answer…
            </div>
        );
    }
    if (error) return <div className="text-xs text-rose-300">Couldn't grade this answer: {error}</div>;
    if (!feedback) return null;

    const delta = previousScore !== undefined ? feedback.score - previousScore : null;
    return (
        <div className="rounded-2xl border border-border bg-background/40 p-5 flex flex-col gap-4">
            <div className="flex items-start gap-4">
                <div className={`shrink-0 w-16 h-16 rounded-2xl border flex flex-col items-center justify-center ${scoreTone(feedback.score)}`}>
                    <span className="text-2xl font-black leading-none">{feedback.score}</span>
                    <span className="text-[10px] opacity-80">/ 10</span>
                </div>
                <div className="flex flex-col gap-1.5 pt-0.5">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-text-secondary/70">Feedback</span>
                        {delta !== null && delta !== 0 && (
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${delta > 0 ? 'text-emerald-300 bg-emerald-400/10' : 'text-rose-300 bg-rose-400/10'}`}>
                                {delta > 0 ? '+' : ''}{delta} vs last attempt
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-text-primary leading-relaxed">{feedback.verdict}</p>
                </div>
            </div>

            {feedback.rubric && feedback.rubric.length > 0 && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                    {feedback.rubric.map(r => (
                        <div key={r.item} className="flex gap-2 text-xs text-text-secondary leading-relaxed">
                            {r.met === 'yes' ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                                : r.met === 'partly' ? <CircleDashed size={14} className="text-amber-300 shrink-0 mt-0.5" />
                                    : <MinusCircle size={14} className="text-rose-300 shrink-0 mt-0.5" />}
                            {r.item}
                        </div>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-300/80">What worked</div>
                    {feedback.strengths.map(s => (
                        <div key={s} className="flex gap-2 text-xs text-text-secondary leading-relaxed"><CheckCircle2 size={13} className="text-emerald-400/80 shrink-0 mt-0.5" />{s}</div>
                    ))}
                </div>
                <div className="flex flex-col gap-2">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-rose-300/80">What was missing</div>
                    {feedback.gaps.map(g => (
                        <div key={g} className="flex gap-2 text-xs text-text-secondary leading-relaxed"><XCircle size={13} className="text-rose-300/80 shrink-0 mt-0.5" />{g}</div>
                    ))}
                </div>
            </div>

            <div className="border-t border-border pt-3">
                <button onClick={() => setShowBetter(b => !b)} className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-hover">
                    {showBetter ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    <Sparkles size={13} /> Your answer, rewritten better
                </button>
                {showBetter && <div className="mt-3 rounded-xl border border-accent/20 bg-accent/5 p-4"><Markdown>{feedback.better_version}</Markdown></div>}
            </div>
        </div>
    );
};
