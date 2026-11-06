import { FileText } from 'lucide-react';
import { DocsStatus } from '../types';

const STYLE: Record<DocsStatus, { tone: string; title: string }> = {
    requested: { tone: 'text-amber-300', title: 'CV and cover letter queued for Claude' },
    in_progress: { tone: 'text-blue-300 animate-pulse', title: 'Claude is building the CV and cover letter' },
    waiting_on_you: { tone: 'text-violet-300', title: 'Claude is waiting on you in Claude Code' },
    ready: { tone: 'text-emerald-300', title: 'CV and cover letter ready' },
    failed: { tone: 'text-red-300', title: 'CV and cover letter build failed' },
};

export const DocsBadge = ({ status }: { status?: DocsStatus | null }) => {
    if (!status) return null;
    const { tone, title } = STYLE[status];
    return <FileText className={`h-3.5 w-3.5 shrink-0 ${tone}`} aria-label={title}><title>{title}</title></FileText>;
};
