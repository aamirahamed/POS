import { FC, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, Trash2, Loader2 } from 'lucide-react';
import { useAgentStore } from '@/store/useAgentStore';

export const POSAgentChat: FC = () => {
  const {
    messages,
    isOpen,
    isGenerating,
    currentStatus,
    setIsOpen,
    sendMessage,
    clearMessages
  } = useAgentStore();

  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isGenerating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;

    setInput('');
    await sendMessage(trimmed);
  };

  return (
    <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 flex flex-col items-end">
      {/* ── Chat Window ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-[360px] md:w-[400px] h-[520px] bg-surface/90 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-surface border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center text-accent">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">POS Assistant</h3>
                  <span className="text-[10px] text-accent/80 font-medium">Multi-Agent System</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={clearMessages}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-red-400 hover:bg-surface-hover transition-colors"
                  title="Clear conversation history"
                >
                  <Trash2 size={15} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm flex flex-col shadow-sm ${
                        isUser
                          ? 'bg-accent text-white rounded-br-none'
                          : 'bg-surface-elevated text-text-primary border border-border/40 rounded-bl-none'
                      }`}
                    >
                      {/* Message Text */}
                      <span className="leading-relaxed whitespace-pre-wrap">{msg.text}</span>

                      {/* Status / Execution Logs */}
                      {!isUser && msg.statusLog && msg.statusLog.length > 0 && (
                        <div className="mt-2 pt-1.5 border-t border-border/30 flex flex-col gap-1 text-[11px] text-text-secondary/70">
                          {msg.statusLog.map((log, index) => (
                            <div key={index} className="flex items-center gap-1">
                              <span className="opacity-60 font-mono">{log}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Generating / Thinking State */}
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="bg-surface-elevated text-text-primary border border-border/40 rounded-2xl rounded-bl-none px-4 py-2.5 text-sm flex flex-col gap-1.5 shadow-sm min-w-[120px]">
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <Loader2 size={13} className="animate-spin text-accent" />
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

              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <form
              onSubmit={handleSubmit}
              className="p-3 bg-surface border-t border-border/60 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me to do something..."
                disabled={isGenerating}
                className="flex-1 bg-surface-hover border border-border/80 rounded-xl px-3 py-2 text-sm text-text-primary placeholder-text-secondary/60 focus:outline-none focus:border-accent/60 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isGenerating}
                className="p-2 rounded-xl bg-accent hover:bg-accent-hover text-white flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toggle Bubble ── */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 rounded-full bg-accent hover:bg-accent-hover text-white shadow-[0_8px_32px_rgba(99,102,241,0.4)] border border-white/10 flex items-center justify-center focus:outline-none cursor-pointer"
        title="Open POS Assistant"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X size={20} />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageSquare size={20} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};
