import { FitVerdict } from '../types';

const VERDICT_STYLE: Record<FitVerdict, string> = {
    PASS: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/30',
    MARGINAL: 'bg-amber-900/30 text-amber-300 border-amber-700/30',
    FAIL: 'bg-red-900/30 text-red-300 border-red-700/30',
    SKIP: 'bg-[#1A1F2B] text-slate-400 border-slate-700/30',
};

const VERDICT_LABEL: Record<FitVerdict, string> = {
    PASS: 'Pass',
    MARGINAL: 'Borderline',
    FAIL: 'Fail',
    SKIP: 'Skip',
};

interface FitBadgeProps {
    score?: number | null;
    verdict?: FitVerdict | null;
    showLabel?: boolean;
}

export const FitBadge = ({ score, verdict, showLabel = false }: FitBadgeProps) => {
    if (score === null || score === undefined) return null;
    const style = verdict ? VERDICT_STYLE[verdict] : VERDICT_STYLE.SKIP;
    return (
        <span
            title={verdict ? `career-ops fit: ${VERDICT_LABEL[verdict]}` : 'career-ops fit'}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-bold tabular-nums ${style}`}
        >
            {Number(score).toFixed(1)}
            {showLabel && verdict && <span className="font-medium">{VERDICT_LABEL[verdict]}</span>}
        </span>
    );
};
