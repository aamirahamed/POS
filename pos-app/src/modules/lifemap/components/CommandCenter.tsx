import { FC, useState, useEffect, useRef } from 'react';
import { useLifeMapStore } from '@/store/useLifeMapStore';
import { useAgentStore } from '@/store/useAgentStore';
import { X, ArrowRight, Bot, User, Loader2, Trash2, Target } from 'lucide-react';
import { AgentMessage } from './AgentMessage';

const CommandCenter: FC = () => {
    const { isCommandCenterOpen, setCommandCenterOpen, nodes, focusedProjectId, setFocusedProject } = useLifeMapStore();
    
    const focusedProject = focusedProjectId ? nodes.find(n => n.id === focusedProjectId) : null;
    
    // We bind to our multi-agent store instead of local history now
    const {
        messages,
        isGenerating,
        currentStatus,
        sendMessage,
        clearMessages
    } = useAgentStore();
    
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto focus and handle escape
    useEffect(() => {
        if (isCommandCenterOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isCommandCenterOpen]);

    // Auto-scroll on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isGenerating, currentStatus]);

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

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const userText = input.trim();
        if (!userText || isGenerating) return;

        setInput('');
        await sendMessage(userText);
    };

    if (!isCommandCenterOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex md:items-start md:pt-[5vh] items-end justify-center bg-black/60 backdrop-blur-md sm:p-4 pb-0">
            <div 
                className="w-full max-w-3xl bg-[#121214]/95 backdrop-blur-3xl sm:rounded-2xl rounded-t-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-300 h-[92vh] sm:h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-4 flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-surface to-surface-elevated shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                            <Bot size={20} />
                        </div>
                        <div>
                            <h3 className="text-[15px] font-bold text-text-primary tracking-tight">Sam</h3>
                            <span className="text-[11px] text-text-secondary font-medium tracking-wide">Your POS Assistant</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={clearMessages} className="p-2 rounded-lg hover:bg-white/10 text-text-secondary hover:text-red-400 transition-colors" title="Clear Chat">
                            <Trash2 size={16} />
                        </button>
                        <button onClick={() => setCommandCenterOpen(false)} className="p-2 rounded-lg hover:bg-white/10 text-text-secondary hover:text-white transition-colors" title="Close (Esc)">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Chat History */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 custom-scrollbar">
                    {messages.map((msg, index) => {
                        const isUser = msg.role === 'user';
                        const isLatest = index === messages.length - 1;

                        if (!isUser) {
                            return (
                                <AgentMessage 
                                    key={msg.id} 
                                    msg={msg} 
                                    isLatest={isLatest} 
                                    onSendAnswers={async (answers) => {
                                        // Format answers into a single message
                                        const formatted = Object.entries(answers)
                                            .filter(([_, ans]) => ans.trim().length > 0)
                                            .map(([q, ans], i) => `**Q${i+1}:** ${q}\n**Answer:** ${ans}`)
                                            .join('\n\n');
                                        
                                        if (formatted) {
                                            await sendMessage(formatted);
                                        }
                                    }}
                                />
                            );
                        }

                        return (
                            <div key={msg.id} className="flex items-start gap-3 max-w-[88%] self-end flex-row-reverse">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 bg-indigo-500/20 text-indigo-300">
                                    <User size={14} />
                                </div>
                                <div className="p-4 rounded-2xl text-[15px] shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-tr-sm border border-indigo-400/30">
                                    <div className="leading-relaxed break-words whitespace-pre-wrap">
                                        {msg.text}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    
                    {/* Generating / Thinking State */}
                    {isGenerating && (
                        <div className="flex items-start gap-3 self-start max-w-[88%]">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-1">
                                <Bot size={14} />
                            </div>
                            <div className="p-4 rounded-2xl rounded-tl-sm bg-white/5 backdrop-blur-md text-text-secondary border border-white/10 flex flex-col gap-2 shadow-sm">
                                <div className="flex items-center gap-2 text-xs">
                                    <Loader2 size={14} className="animate-spin text-accent" />
                                    <span>{currentStatus || "Thinking..."}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="shrink-0 p-5 bg-surface/50 border-t border-white/5 relative flex flex-col gap-3">
                    {focusedProject && (
                        <div className="flex items-center self-start gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold shadow-sm animate-in slide-in-from-bottom-2">
                            <Target size={14} className="text-indigo-400" />
                            Sam is locked in on: {focusedProject.data.label || 'Project'}
                            <button 
                                onClick={() => setFocusedProject(null)}
                                className="ml-1 hover:text-white transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="relative w-full">
                    <div className="relative flex items-center">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isGenerating}
                            placeholder="Ask Sam to organize your life map, set reminders, or fetch links..."
                            className="w-full bg-[#1e1e20] border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-base sm:text-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all shadow-inner disabled:opacity-50"
                            autoComplete="off"
                            spellCheck="false"
                        />
                        <button 
                            type="submit"
                            disabled={!input.trim() || isGenerating}
                            className="absolute right-3 w-9 h-9 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:hover:bg-accent text-white rounded-xl flex items-center justify-center transition-colors shadow-sm"
                        >
                            <ArrowRight size={18} />
                        </button>
                    </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CommandCenter;
