import { FC, useEffect, useRef, useState } from 'react';
import { ArrowUp, Loader2, AlertCircle, X } from 'lucide-react';
import { askCoach, CoachMessage, CoachMove, fetchCoachMessages } from '@/services/brainGymService';
import { ModuleKey } from '../quest';
import { HELPER_IDENTITY, helperModeFor, quickAsksFor } from '../helperModes';
import { Markdown } from './Blocks';

const MOVE_LABEL: Record<CoachMove, string> = {
    question: 'Question',
    pointer: 'Where to look',
    method: 'Method',
    example: 'Example',
    feedback: 'On your answer',
    concept: 'Concept',
    decline: 'Not the answer, but…',
    explain: 'Explanation',
    deeper: 'Going deeper',
    connect: 'Connection',
    further_reading: 'Further reading',
    check_understanding: 'Check yourself',
    mirror: 'In other words',
};

interface Props {
    moduleId: string;
    moduleKey: ModuleKey;
    completed: boolean;
    draft: string;
    hue: number;
    onClose: () => void;
}

export const HelperPanel: FC<Props> = ({ moduleId, moduleKey, completed, draft, hue, onClose }) => {
    const mode = helperModeFor(moduleKey, completed);
    const identity = HELPER_IDENTITY[mode];
    const Icon = identity.icon;
    const quickAsks = quickAsksFor(moduleKey, mode);

    const [messages, setMessages] = useState<CoachMessage[]>([]);
    const [input, setInput] = useState('');
    const [thinking, setThinking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchCoachMessages(moduleId).then(setMessages).catch(e => setError(e.message));
    }, [moduleId]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, thinking]);

    const send = async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || thinking) return;
        setError(null);
        setInput('');
        const pending: CoachMessage = { id: `pending-${Date.now()}`, role: 'user', text: trimmed, move: null, level: null, mode, createdAt: new Date().toISOString() };
        setMessages(m => [...m, pending]);
        setThinking(true);
        try {
            const res = await askCoach(moduleId, trimmed, draft);
            setMessages(m => [...m, { id: `helper-${Date.now()}`, role: 'coach', text: res.reply, move: res.move, level: res.level, mode: res.mode, createdAt: new Date().toISOString() }]);
        } catch (e) {
            setMessages(m => m.filter(x => x.id !== pending.id));
            setInput(trimmed);
            setError(e instanceof Error ? e.message : 'The helper could not reply');
        } finally {
            setThinking(false);
        }
    };

    const hintsUsed = messages.filter(m => m.role === 'coach' && m.mode === 'coach').length;
    const accent = (a = 1, l = 70) => `hsla(${hue}, 80%, ${l}%, ${a})`;

    return (
        <div className="rounded-2xl border border-border bg-surface-elevated/40 flex flex-col h-[calc(100vh-7rem)] max-h-[760px] min-h-[480px]">
            <div className="px-4 py-3.5 border-b border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: accent(0.18, 55), color: accent(1, 72) }}><Icon size={16} /></div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-text-primary">{identity.name}</div>
                    <div className="text-[11px] text-text-secondary truncate">{identity.tagline}</div>
                </div>
                {hintsUsed > 0 && <div className="text-[11px] text-text-secondary">{hintsUsed} hint{hintsUsed === 1 ? '' : 's'}</div>}
                <button onClick={onClose} className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-hover" title="Close">
                    <X size={15} />
                </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3">
                {messages.length === 0 && !thinking && (
                    <div className="text-xs text-text-secondary leading-relaxed bg-background/40 rounded-xl p-3.5">{identity.intro}</div>
                )}
                {messages.map(m => m.role === 'user' ? (
                    <div key={m.id} className="self-end max-w-[85%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm text-white" style={{ background: accent(0.35, 45) }}>
                        {m.text}
                    </div>
                ) : (
                    <div key={m.id} className="self-start max-w-[94%] flex flex-col gap-1.5">
                        {m.move && (
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: accent(0.9, 72) }}>
                                {MOVE_LABEL[m.move]}
                                {m.level && (
                                    <span className="flex gap-0.5" title={`Hint strength ${m.level} of 3`}>
                                        {[1, 2, 3].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i <= (m.level ?? 0) ? accent(0.9, 65) : 'rgba(255,255,255,0.15)' }} />)}
                                    </span>
                                )}
                            </div>
                        )}
                        <div className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 bg-background/70 border border-border">
                            <Markdown className="prose-p:my-1">{m.text}</Markdown>
                        </div>
                    </div>
                ))}
                {thinking && (
                    <div className="self-start flex items-center gap-2 text-xs text-text-secondary px-1">
                        <Loader2 size={13} className="animate-spin" /> Thinking…
                    </div>
                )}
            </div>

            {error && (
                <div className="mx-4 mb-2 flex items-start gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-400/20 rounded-lg px-3 py-2">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" /> {error}
                </div>
            )}

            <div className="border-t border-border p-3 flex flex-col gap-2.5">
                <div className="flex flex-wrap gap-1.5">
                    {quickAsks.map(q => {
                        const disabled = thinking || (q.needsDraft && !draft.trim());
                        return (
                            <button
                                key={q.label}
                                disabled={disabled}
                                onClick={() => send(q.text)}
                                title={q.needsDraft && !draft.trim() ? 'Write something first' : q.text}
                                className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-background/50 text-text-secondary hover:text-text-primary hover:border-text-secondary/40 disabled:opacity-40 disabled:hover:text-text-secondary"
                            >
                                {q.label}
                            </button>
                        );
                    })}
                </div>
                <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex items-end gap-2">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                        rows={2}
                        placeholder={`Ask the ${identity.name.toLowerCase()}…`}
                        className="flex-1 resize-none bg-background/60 border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent"
                    />
                    <button type="submit" disabled={thinking || !input.trim()} className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center disabled:opacity-40">
                        <ArrowUp size={16} />
                    </button>
                </form>
            </div>
        </div>
    );
};
