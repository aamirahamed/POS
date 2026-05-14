import { FC, useState, useEffect, useRef } from 'react';
import { useLifeMapStore } from '@/store/useLifeMapStore';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useRemindersStore } from '@/store/useRemindersStore';
import { X, Sparkles, ArrowRight, Bot, User, Loader2 } from 'lucide-react';
import { processUserCommand } from '@/services/geminiService';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    actionType?: 'shopping' | 'reminder' | 'lifemap' | 'inbox' | 'error';
}

const CommandCenter: FC = () => {
    const { isCommandCenterOpen, setCommandCenterOpen, nodes, addPillar, addThread, addInitiative, addSubnode, addTaskToNode, addInboxItem } = useLifeMapStore();
    const { addItem: addShoppingItem } = useShoppingStore();
    const { addReminder } = useRemindersStore();
    
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto focus and handle escape
    useEffect(() => {
        if (isCommandCenterOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isCommandCenterOpen]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history]);

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

    const handleProcessCommand = async (text: string) => {
        const lower = text.toLowerCase().trim();
        if (!lower) return;

        try {
            setIsTyping(true);
            const action = await processUserCommand(text, nodes);

            if (action.actionType === 'shopping' && action.shoppingItem) {
                await addShoppingItem(action.shoppingItem);
            } else if (action.actionType === 'reminder' && action.reminderText) {
                addReminder(action.reminderText);
            } else if (action.actionType === 'lifemap' && action.lifeMapAction) {
                const { typeToCreate, name, parentName } = action.lifeMapAction;
                
                if (typeToCreate === 'pillar') {
                    addPillar(name);
                } else if (parentName) {
                    const query = parentName.toLowerCase();
                    const match = nodes.find(n => n.data.label?.toString().toLowerCase() === query) 
                               || nodes.find(n => n.data.label?.toString().toLowerCase().includes(query));
                    
                    if (match) {
                        const normalizedType = typeToCreate.toLowerCase().trim();
                        if (normalizedType === 'thread') addThread(match.id, name);
                        else if (normalizedType === 'initiative') addInitiative(match.id, name);
                        else if (normalizedType === 'subnode' || normalizedType === 'execution node') addSubnode(match.id, name);
                        else if (normalizedType === 'task') addTaskToNode(match.id, name);
                        else {
                            // Fallback if AI invents a type
                            addInitiative(match.id, name);
                        }
                    } else {
                        // Parent not found, fallback to inbox
                        addInboxItem(`[Orphaned ${typeToCreate}] ${name} (Intended for ${parentName})`);
                        return { actionType: 'inbox', reply: `✓ Saved to Inbox (Couldn't find parent '${parentName}')` };
                    }
                }
            } else if (action.actionType === 'inbox') {
                addInboxItem(text);
            }

            return { actionType: action.actionType, reply: action.reply };

        } catch (error: any) {
            console.error('AI Processing Error:', error);
            const errorMessage = error?.message || 'Unknown error occurred';
            // Fallback
            addInboxItem(text);
            return { actionType: 'error', reply: `Something went wrong (${errorMessage}). Saved to Inbox instead.` };
        } finally {
            setIsTyping(false);
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const userText = input.trim();
        if (!userText) return;

        setInput('');
        
        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: userText };
        setHistory(prev => [...prev, userMsg]);

        // AI Processing
        const result = await handleProcessCommand(userText);
        if (result) {
            const assistantMsg: ChatMessage = { 
                id: (Date.now() + 1).toString(), 
                role: 'assistant', 
                text: result.reply,
                actionType: result.actionType as any
            };
            setHistory(prev => [...prev, assistantMsg]);
        }
    };

    if (!isCommandCenterOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex md:items-start md:pt-[10vh] items-end justify-center bg-black/60 backdrop-blur-md sm:p-4 pb-0">
            <div 
                className="w-full max-w-2xl bg-[#121214]/95 backdrop-blur-2xl sm:rounded-2xl rounded-t-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-300 h-[85vh] sm:h-[70vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-4 flex items-center justify-between border-b border-white/5 bg-white/[0.02] shrink-0">
                    <div className="flex items-center gap-2 text-sm font-bold text-text-primary tracking-wide">
                        <Sparkles size={16} className="text-accent" />
                        OS Assistant
                    </div>
                    <button onClick={() => setCommandCenterOpen(false)} className="p-1.5 rounded-full hover:bg-white/10 text-text-secondary transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Chat History */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                    {history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-60">
                            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30">
                                <Bot size={32} className="text-accent" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2">How can I help you?</h3>
                                <p className="text-sm text-text-secondary max-w-xs mx-auto">
                                    I can manage your Life Map, add to your Shopping List, or set Reminders.
                                </p>
                            </div>
                            <div className="flex flex-col gap-2 w-full max-w-sm">
                                <button onClick={() => setInput("Buy bananas")} className="bg-white/5 hover:bg-white/10 p-3 rounded-xl text-sm text-left transition-colors text-text-secondary hover:text-white">
                                    "Buy bananas"
                                </button>
                                <button onClick={() => setInput("Remind me to complete assignment")} className="bg-white/5 hover:bg-white/10 p-3 rounded-xl text-sm text-left transition-colors text-text-secondary hover:text-white">
                                    "Remind me to complete assignment"
                                </button>
                                <button onClick={() => setInput("Add an initiative to Career called Promotion")} className="bg-white/5 hover:bg-white/10 p-3 rounded-xl text-sm text-left transition-colors text-text-secondary hover:text-white">
                                    "Add an initiative to Career called Promotion"
                                </button>
                            </div>
                        </div>
                    ) : (
                        history.map(msg => (
                            <div key={msg.id} className={`flex items-start gap-3 max-w-[85%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-surface-hover' : 'bg-accent/20 border border-accent/30'}`}>
                                    {msg.role === 'user' ? <User size={14} className="text-text-secondary" /> : <Bot size={14} className="text-accent" />}
                                </div>
                                <div className={`p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-surface-hover text-text-primary rounded-tr-sm' : 'bg-transparent text-text-secondary border border-white/5 rounded-tl-sm'}`}>
                                    {msg.role === 'assistant' && msg.actionType === 'shopping' && <span className="inline-block mr-1.5">🛒</span>}
                                    {msg.role === 'assistant' && msg.actionType === 'reminder' && <span className="inline-block mr-1.5">⏰</span>}
                                    {msg.role === 'assistant' && msg.actionType === 'lifemap' && <span className="inline-block mr-1.5">🗺️</span>}
                                    {msg.role === 'assistant' && msg.actionType === 'inbox' && <span className="inline-block mr-1.5">📥</span>}
                                    {msg.text}
                                </div>
                            </div>
                        ))
                    )}
                    {isTyping && (
                        <div className="flex items-start gap-3 self-start max-w-[85%]">
                            <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
                                <Bot size={14} className="text-accent" />
                            </div>
                            <div className="p-3 rounded-2xl rounded-tl-sm bg-transparent text-text-secondary border border-white/5 flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin" /> Thinking...
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <form onSubmit={handleSubmit} className="shrink-0 p-4 bg-black/20 border-t border-white/5 relative">
                    <div className="relative flex items-center">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask or command anything..."
                            className="w-full bg-[#1e1e20] border border-white/10 rounded-2xl pl-5 pr-12 py-4 text-base sm:text-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all shadow-inner"
                            autoComplete="off"
                            spellCheck="false"
                        />
                        <button 
                            type="submit"
                            disabled={!input.trim()}
                            className="absolute right-3 w-8 h-8 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:hover:bg-accent text-white rounded-xl flex items-center justify-center transition-colors"
                        >
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CommandCenter;
