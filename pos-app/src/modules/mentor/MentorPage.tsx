import { FC, useState, useEffect, useRef } from 'react';
import { useMentorStore } from '@/store/useMentorStore';
import { useRemindersStore } from '@/store/useRemindersStore';
import { useLifeMapStore } from '@/store/useLifeMapStore';
import { 
  Sparkles, 
  Send, 
  Trash2, 
  CheckCircle, 
  Plus, 
  Loader2, 
  AlertTriangle, 
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MentorPage: FC = () => {
  const {
    messages,
    activeCritique,
    balanceRatios,
    suggestions,
    isGenerating,
    isAuditing,
    currentStatus,
    sendMessage,
    clearMessages,
    runAudit,
    applySuggestion,
    loadHistoryFromDB
  } = useMentorStore();

  const { reminders, addReminder, toggleReminder, deleteReminder } = useRemindersStore();
  const { nodes } = useLifeMapStore();
  
  const [input, setInput] = useState('');
  const [newReminderText, setNewReminderText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Load chat history on mount
  useEffect(() => {
    loadHistoryFromDB();
  }, []);

  // Run audit on mount if empty
  useEffect(() => {
    if (balanceRatios.length === 0 && nodes.length > 0) {
      runAudit();
    }
  }, [nodes]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;
    setInput('');
    await sendMessage(trimmed);
  };

  const handleAddPriority = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newReminderText.trim();
    if (!trimmed) return;
    addReminder(trimmed, 'Mentor');
    setNewReminderText('');
  };

  // Filter reminders to only show Mentor ones
  const mentorReminders = reminders.filter(r => r.category === 'Mentor');

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-6 min-h-[calc(100vh-4rem)] max-w-[1600px] mx-auto overflow-hidden">
      {/* ──────────────────────────────────────────────────────────
          1. Large Strategy Chat Terminal (Left / Main Pane)
          ────────────────────────────────────────────────────────── */}
      <div className="flex-1 bg-surface-elevated/40 border border-border/60 rounded-2xl shadow-xl flex flex-col h-[650px] lg:h-[calc(100vh-8rem)] overflow-hidden">
        {/* Terminal Header */}
        <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between bg-surface/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
              <BrainCircuit size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">Strategy Terminal</h2>
              <p className="text-xs text-text-secondary">Consulting with Personal Lifemap Mentor (Gemini 2.5 Pro)</p>
            </div>
          </div>
          <button
            onClick={clearMessages}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 text-xs text-text-secondary hover:text-red-400 hover:bg-surface-hover hover:border-red-400/30 transition-colors"
            title="Clear Chat Logs"
          >
            <Trash2 size={13} />
            <span>Reset History</span>
          </button>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm flex flex-col shadow-sm ${
                    isUser
                      ? 'bg-accent text-white rounded-br-none'
                      : 'bg-surface/80 border border-border/50 text-text-primary rounded-bl-none'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  
                  {/* Status / Execution logs */}
                  {!isUser && msg.statusLog && msg.statusLog.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-border/30 flex flex-col gap-1 text-[11px] text-text-secondary/70 font-mono">
                      {msg.statusLog.map((log, index) => (
                        <div key={index} className="flex items-center gap-1">
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isGenerating && (
            <div className="flex justify-start">
              <div className="bg-surface/80 border border-border/50 rounded-2xl rounded-bl-none px-5 py-3 text-sm flex flex-col gap-1.5 shadow-sm min-w-[140px]">
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <Loader2 size={13} className="animate-spin text-accent" />
                  <span>{currentStatus || "Mentor analyzing..."}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-4 border-t border-border/60 bg-surface/30 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask mentor to review focus, add items, or give roadmaps..."
            className="flex-1 bg-surface-hover/80 border border-border/80 rounded-xl px-4 py-3 text-[16px] md:text-sm text-text-primary focus:outline-none focus:border-accent/60 placeholder:text-text-secondary/60 disabled:opacity-50"
            disabled={isGenerating}
          />
          <button
            type="submit"
            disabled={isGenerating || !input.trim()}
            className="p-3 bg-accent text-white rounded-xl hover:bg-accent-hover active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center"
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      {/* ──────────────────────────────────────────────────────────
          2. Strategic Dashboard Sidebar (Right Pane)
          ────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[400px] flex flex-col gap-6 overflow-y-auto lg:h-[calc(100vh-8rem)] pr-0 lg:pr-1 scrollbar-thin">
        {/* Main Audit Trigger */}
        <button
          onClick={runAudit}
          disabled={isAuditing}
          className="w-full bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25 active:scale-98 py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm transition-all shadow-sm"
        >
          {isAuditing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Analyzing Life Map...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Run Life Map Audit</span>
            </>
          )}
        </button>

        {/* Audit Critique Panel */}
        <div className="bg-surface/50 border border-border/60 rounded-2xl p-5 shadow-sm backdrop-blur-md flex flex-col gap-3">
          <div className="flex items-center gap-2 text-yellow-500">
            <AlertTriangle size={18} />
            <h3 className="text-xs font-bold tracking-wider uppercase">Active Mentor Critique</h3>
          </div>
          <p className="text-xs text-text-primary leading-relaxed bg-surface-hover/40 border border-border/30 rounded-xl p-3.5 whitespace-pre-line">
            {activeCritique}
          </p>
        </div>

        {/* Visual Balance Gauge */}
        <div className="bg-surface/50 border border-border/60 rounded-2xl p-5 shadow-sm backdrop-blur-md flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border/30 pb-2">
            <div className="flex items-center gap-2 text-accent">
              <TrendingUp size={16} />
              <h3 className="text-xs font-bold tracking-wider uppercase">Pillar Density</h3>
            </div>
            <span className="text-[10px] text-text-secondary font-medium">Career Focus Target: 50%</span>
          </div>

          <div className="space-y-3">
            {balanceRatios.length === 0 ? (
              <p className="text-xs text-text-secondary text-center py-4">No density metrics. Run Audit to count.</p>
            ) : (
              balanceRatios.map((item) => (
                <div key={item.label} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-text-secondary">{item.label}</span>
                    <span className="text-text-primary">{item.count} nodes ({item.percentage}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-hover border border-border/40 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.label.toLowerCase() === 'career' ? 'bg-accent' : 'bg-text-secondary/50'
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Autonomy Suggestions Feed */}
        <div className="bg-surface/50 border border-border/60 rounded-2xl p-5 shadow-sm backdrop-blur-md flex flex-col gap-4">
          <div className="flex items-center gap-2 text-accent border-b border-border/30 pb-2">
            <Sparkles size={16} />
            <h3 className="text-xs font-bold tracking-wider uppercase">Mentor Suggestions</h3>
          </div>

          <div className="space-y-3">
            {suggestions.length === 0 ? (
              <p className="text-xs text-text-secondary text-center py-4">No suggestions pending. Run Audit to fetch recommendations.</p>
            ) : (
              <AnimatePresence>
                {suggestions.map((sug) => (
                  <motion.div
                    key={sug.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-3 bg-surface-hover/50 border border-border/40 rounded-xl flex flex-col gap-2.5 shadow-sm"
                  >
                    <p className="text-xs text-text-primary font-medium leading-relaxed">
                      {sug.description}
                    </p>
                    <div className="flex items-center justify-between gap-2 border-t border-border/30 pt-2.5">
                      <span className="text-[10px] text-text-secondary font-mono tracking-tight bg-surface/85 px-1.5 py-0.5 rounded border border-border/40 uppercase">
                        {sug.actionType.replace('_', ' ')}
                      </span>
                      <button
                        onClick={() => applySuggestion(sug.id)}
                        className="px-2.5 py-1 text-[10px] font-semibold bg-accent text-white hover:bg-accent-hover active:scale-95 rounded-lg flex items-center gap-1 shadow-sm transition-all"
                      >
                        <span>Approve & Apply</span>
                        <ArrowRight size={10} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Weekly Focus Checklist (Syncs with Reminders) */}
        <div className="bg-surface/50 border border-border/60 rounded-2xl p-5 shadow-sm backdrop-blur-md flex flex-col gap-4">
          <div className="flex items-center gap-2 text-accent border-b border-border/30 pb-2">
            <CheckCircle size={16} />
            <h3 className="text-xs font-bold tracking-wider uppercase">Weekly Focus Checklist</h3>
          </div>

          <form onSubmit={handleAddPriority} className="flex gap-1.5">
            <input
              type="text"
              value={newReminderText}
              onChange={(e) => setNewReminderText(e.target.value)}
              placeholder="Add mentor agreed priority..."
              className="flex-1 bg-surface-hover/70 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent/60"
            />
            <button
              type="submit"
              disabled={!newReminderText.trim()}
              className="p-2 bg-accent text-white rounded-lg hover:bg-accent-hover active:scale-95 disabled:opacity-40 transition-colors flex items-center justify-center"
            >
              <Plus size={14} />
            </button>
          </form>

          <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-thin">
            {mentorReminders.length === 0 ? (
              <p className="text-xs text-text-secondary text-center py-2">No weekly focuses logged. Add a priority above.</p>
            ) : (
              mentorReminders.map((rem) => (
                <div 
                  key={rem.id} 
                  className="flex items-center justify-between p-2 rounded-lg bg-surface-hover/30 border border-border/30 group"
                >
                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={rem.completed}
                      onChange={() => toggleReminder(rem.id)}
                      className="rounded border-border/80 text-accent focus:ring-accent"
                    />
                    <span className={`text-xs text-text-primary truncate ${rem.completed ? 'line-through opacity-40' : ''}`}>
                      {rem.text}
                    </span>
                  </label>
                  <button
                    onClick={() => deleteReminder(rem.id)}
                    className="p-1 text-text-secondary hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorPage;
