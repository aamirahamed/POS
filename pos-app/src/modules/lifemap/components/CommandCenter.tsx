import { FC, useState, useEffect, useRef } from 'react';
import { useLifeMapStore } from '@/store/useLifeMapStore';
import { Command, Inbox, X, Sparkles, Plus, AlertCircle, ArrowRight, CornerDownLeft } from 'lucide-react';
import { LifeMapNode } from '@/types/lifemap';

type ParsedType = 'pillar' | 'thread' | 'initiative' | 'subnode' | 'task';

interface ParsedCommand {
    type?: ParsedType;
    parentName?: string;
    name: string;
}

const normalizeType = (t: string): ParsedType => {
    const l = t.toLowerCase();
    if (l.includes('pillar')) return 'pillar';
    if (l.includes('thread')) return 'thread';
    if (l.includes('initiative')) return 'initiative';
    if (l.includes('execution') || l.includes('subnode')) return 'subnode';
    return 'task';
};

const parseCommand = (input: string): ParsedCommand => {
    let parsed: ParsedCommand = { name: input.trim() };
    if (!input.trim()) return parsed;

    // 1. Add [type] under [parent] called [name]
    const r1 = /(?:create|add)\s+(?:a\s+|an\s+)?(pillar|thread|initiative|execution node|subnode|task)s?\s+(?:under|in|to|for)\s+(.+?)\s+(?:called|named|about)\s+(.+)$/i;
    const m1 = input.match(r1);
    if (m1) return { type: normalizeType(m1[1]), parentName: m1[2].trim(), name: m1[3].trim() };

    // 2. Add [type] called [name] under [parent]
    const r2 = /(?:create|add)\s+(?:a\s+|an\s+)?(pillar|thread|initiative|execution node|subnode|task)s?\s+(?:called|named|about)\s+(.+?)\s+(?:under|in|to|for)\s+(.+)$/i;
    const m2 = input.match(r2);
    if (m2) return { type: normalizeType(m2[1]), name: m2[2].trim(), parentName: m2[3].trim() };

    // 3. Add [type] called [name] (No parent)
    const r3 = /(?:create|add)\s+(?:a\s+|an\s+)?(pillar|thread|initiative|execution node|subnode|task)s?\s+(?:called|named|about)\s+(.+)$/i;
    const m3 = input.match(r3);
    if (m3) return { type: normalizeType(m3[1]), name: m3[2].trim() };

    // 4. Add [name] to [parent]
    const r4 = /(?:create|add)\s+(.+?)\s+(?:to|under|in|for)\s+(.+)$/i;
    const m4 = input.match(r4);
    if (m4) return { name: m4[1].trim(), parentName: m4[2].trim() };

    return parsed;
};

const CommandCenter: FC = () => {
    const { isCommandCenterOpen, setCommandCenterOpen, nodes, addPillar, addThread, addInitiative, addSubnode, addTaskToNode, inbox, addInboxItem, removeInboxItem } = useLifeMapStore();
    const [input, setInput] = useState('');
    const [parsed, setParsed] = useState<ParsedCommand | null>(null);
    const [matchedParent, setMatchedParent] = useState<LifeMapNode | null>(null);
    const [statusMessage, setStatusMessage] = useState<{text: string, type: 'success'|'error'} | null>(null);
    
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto focus and handle escape
    useEffect(() => {
        if (isCommandCenterOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setInput('');
            setStatusMessage(null);
        }
    }, [isCommandCenterOpen]);

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setCommandCenterOpen(!isCommandCenterOpen);
            }
            if (e.key === 'Escape' && isCommandCenterOpen) {
                setCommandCenterOpen(false);
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isCommandCenterOpen, setCommandCenterOpen]);

    // Parse input continually
    useEffect(() => {
        if (!input.trim()) {
            setParsed(null);
            setMatchedParent(null);
            return;
        }

        const p = parseCommand(input);
        setParsed(p);

        if (p.parentName) {
            // Find parent using case-insensitive partial match
            const query = p.parentName.toLowerCase();
            const match = nodes.find(n => n.data.label?.toString().toLowerCase() === query) 
                       || nodes.find(n => n.data.label?.toString().toLowerCase().includes(query));
            setMatchedParent(match || null);
        } else {
            setMatchedParent(null);
        }
    }, [input, nodes]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim()) return;

        if (parsed?.type === 'pillar') {
            addPillar(parsed.name);
            showSuccess(`Added Pillar: ${parsed.name}`);
            return;
        }

        if (matchedParent) {
            // Determine inferred type if not specified
            let typeToCreate = parsed?.type;
            if (!typeToCreate) {
                if (matchedParent.type === 'center') typeToCreate = 'pillar';
                else if (matchedParent.type === 'pillar') typeToCreate = 'thread';
                else if (matchedParent.type === 'thread') typeToCreate = 'initiative';
                else if (matchedParent.type === 'initiative') typeToCreate = 'subnode';
                else if (matchedParent.type === 'subnode') typeToCreate = 'task';
            }

            // Create based on actual or inferred type
            if (typeToCreate === 'thread') addThread(matchedParent.id, parsed!.name);
            else if (typeToCreate === 'initiative') addInitiative(matchedParent.id, parsed!.name);
            else if (typeToCreate === 'subnode') addSubnode(matchedParent.id, parsed!.name);
            else if (typeToCreate === 'task') addTaskToNode(matchedParent.id, parsed!.name);
            else if (typeToCreate === 'pillar') addPillar(parsed!.name);
            
            showSuccess(`Added to Life Map: ${parsed!.name}`);
        } else {
            // Unsorted Inbox
            addInboxItem(input.trim());
            showSuccess(`Captured to Inbox`);
        }
    };

    const showSuccess = (msg: string) => {
        setStatusMessage({ text: msg, type: 'success' });
        setInput('');
        setTimeout(() => {
            setStatusMessage(null);
            // Optionally auto-close after success to maintain speed:
            setCommandCenterOpen(false);
        }, 1200);
    };

    if (!isCommandCenterOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex md:items-start md:pt-[15vh] items-end justify-center bg-black/60 backdrop-blur-sm sm:p-4 pb-0">
            <div 
                className="w-full max-w-2xl bg-[#121214] sm:rounded-2xl rounded-t-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-4 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-2 text-sm font-bold text-text-primary tracking-wide">
                        <Command size={16} className="text-accent" />
                        Command Center
                    </div>
                    <button onClick={() => setCommandCenterOpen(false)} className="p-1.5 rounded-full hover:bg-white/10 text-text-secondary transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Input Area */}
                <form onSubmit={handleSubmit} className="relative">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="What's on your mind?"
                        className="w-full bg-transparent px-6 py-6 text-xl sm:text-2xl text-text-primary placeholder:text-text-secondary/40 focus:outline-none"
                        autoComplete="off"
                        spellCheck="false"
                    />
                    
                    {/* Real-time parsing feedback overlay */}
                    {input.trim() && !statusMessage && (
                        <div className="absolute bottom-1 left-6 right-6 flex items-center justify-between text-xs pb-3 border-b border-white/5">
                            <div className="flex items-center gap-1.5 text-text-secondary">
                                {parsed?.type && <span className="bg-white/10 px-1.5 py-0.5 rounded text-white capitalize">{parsed.type}</span>}
                                <span className="text-white">"{parsed?.name}"</span>
                                {parsed?.parentName && (
                                    <>
                                        <ArrowRight size={12} className="mx-1" />
                                        {matchedParent ? (
                                            <span className="text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded flex items-center gap-1"><Sparkles size={10} /> {matchedParent.data.label as string}</span>
                                        ) : (
                                            <span className="text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded flex items-center gap-1"><AlertCircle size={10} /> Inbox (Parent not found)</span>
                                        )}
                                    </>
                                )}
                                {!parsed?.parentName && parsed?.type !== 'pillar' && (
                                    <span className="text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded ml-2 flex items-center gap-1"><Inbox size={10} /> Save to Inbox</span>
                                )}
                            </div>
                            <div className="flex items-center gap-1 text-white/40 hidden sm:flex">
                                <span className="bg-white/10 px-1.5 py-0.5 rounded">↵</span> to capture
                            </div>
                        </div>
                    )}
                </form>

                {/* Status Feedback */}
                {statusMessage && (
                    <div className="px-6 py-4 bg-green-500/10 border-t border-green-500/20 text-green-400 flex items-center gap-2 text-sm font-bold animate-in fade-in">
                        <CheckCircle size={16} /> {statusMessage.text}
                    </div>
                )}

                {/* Content Area: Examples & Inbox */}
                {!input.trim() && !statusMessage && (
                    <div className="bg-black/30 p-6 flex flex-col gap-6 max-h-[50vh] overflow-y-auto">
                        
                        <div className="flex flex-col gap-3">
                            <div className="text-xs font-bold text-text-secondary uppercase tracking-widest">Natural Language Examples</div>
                            <div className="flex flex-col gap-1.5">
                                <div className="text-sm text-text-secondary bg-white/5 p-2 rounded-lg cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setInput("Add initiative under Career called AI Upskill")}>
                                    "Add <span className="text-white font-medium">initiative</span> under <span className="text-accent font-medium">Career</span> called <span className="text-white font-medium">AI Upskill</span>"
                                </div>
                                <div className="text-sm text-text-secondary bg-white/5 p-2 rounded-lg cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setInput("Add task under AI Upskill to learn Python basics")}>
                                    "Add <span className="text-white font-medium">task</span> under <span className="text-accent font-medium">AI Upskill</span> to <span className="text-white font-medium">learn Python basics</span>"
                                </div>
                                <div className="text-sm text-text-secondary bg-white/5 p-2 rounded-lg cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setInput("Need to buy groceries")}>
                                    "Need to buy groceries" <span className="text-[10px] ml-2 text-orange-400 opacity-80">(Saves to Inbox)</span>
                                </div>
                            </div>
                        </div>

                        {inbox.length > 0 && (
                            <div className="flex flex-col gap-3 mt-4">
                                <div className="text-xs font-bold text-text-secondary uppercase tracking-widest flex items-center justify-between">
                                    <span className="flex items-center gap-1.5"><Inbox size={12} /> Inbox Queue</span>
                                    <span className="bg-orange-500/20 text-orange-400 px-1.5 rounded">{inbox.length}</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {inbox.map(item => (
                                        <div key={item.id} className="group flex items-start gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/10 hover:border-orange-500/30 transition-colors">
                                            <div className="flex-1 text-sm text-text-primary leading-snug">{item.text}</div>
                                            <button onClick={() => removeInboxItem(item.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-white/10 text-text-secondary transition-all">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>
            {/* Mobile keyboard padding spacer could go here if needed */}
        </div>
    );
};

// CheckCircle is missing from imports, need to add it or fix. Wait, let's fix it later if needed. I'll just use Sparkles or something. Ah, let's import it.
import { CheckCircle } from 'lucide-react';

export default CommandCenter;
