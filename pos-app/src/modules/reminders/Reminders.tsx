import { FC, useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchReminders, saveReminders } from '@/services/remindersService';
import { useRemindersStore } from '@/store/useRemindersStore';
import { Plus, Trash2, Check, Circle, Calendar, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Reminders: FC = () => {
    const { reminders, addReminder, toggleReminder, deleteReminder } = useRemindersStore();


    const [inputValue, setInputValue] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Helper: Generate next 15 days
    const next15Days = Array.from({ length: 15 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
    });

    // Helper: Time presets
    const timePresets = [
        { label: 'Morning', time: '09:00' },
        { label: 'Noon', time: '12:00' },
        { label: 'Afternoon', time: '15:00' },
        { label: 'Evening', time: '18:00' },
        { label: 'Night', time: '21:00' }
    ];

    // 1. Fetch user and load data
    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                const data = await fetchReminders(user.id);
                if (data) {
                    if (data.length > 0) {
                        useRemindersStore.setState({ reminders: data });
                    }
                }
                setIsLoaded(true);
            }
        };
        load();
    }, []);

    // 2. Auto-save
    useEffect(() => {
        if (!userId || !isLoaded) return;

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
            await saveReminders(userId, reminders);
        }, 2000);

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [reminders, userId, isLoaded]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            addReminder(inputValue.trim(), undefined, selectedDate ? selectedDate.getTime() : undefined);
            setInputValue('');
            setSelectedDate(null);
            setShowTimePicker(false);
        }
    };

    const handleDateSelect = (date: Date) => {
        // Set default time to 9:00 AM if no time set, or keep current time if updating date
        const newDate = new Date(date);
        newDate.setHours(9, 0, 0, 0);
        setSelectedDate(newDate);
        setShowTimePicker(true);
    };

    const handleTimeSelect = (timeStr: string) => {
        if (!selectedDate) return;
        const [hours, minutes] = timeStr.split(':').map(Number);
        const newDate = new Date(selectedDate);
        newDate.setHours(hours, minutes);
        setSelectedDate(newDate);
        setShowTimePicker(false); // Close picker after selection? Or keep open? Let's close for speed.
        // Focus input back?
    };

    const activeReminders = reminders.filter(r => !r.completed);
    const completedReminders = reminders.filter(r => r.completed);

    const formatDateChip = (date: Date) => {
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
        return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    };

    return (
        <div className="h-full w-full bg-background p-8 flex flex-col items-center">
            <div className="w-full max-w-2xl">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-text-primary">Reminders</h1>
                    <div className="text-xs text-text-secondary">
                        {userId ? 'Syncing...' : 'Local Mode'}
                    </div>
                </div>

                {/* Input Area */}
                <form onSubmit={handleSubmit} className="relative mb-8 group bg-surface border border-border rounded-xl shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center px-4 py-3">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="What needs to be done?"
                            className="flex-1 bg-transparent text-lg text-text-primary placeholder:text-text-secondary focus:outline-none"
                        />
                        {selectedDate && (
                            <div className="flex items-center gap-2 mr-3 bg-accent/10 px-2 py-1 rounded text-xs text-accent whitespace-nowrap">
                                <Calendar size={12} />
                                <span>{selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                <span className="opacity-50">|</span>
                                <Clock size={12} />
                                <span>{selectedDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                                <button
                                    type="button"
                                    onClick={() => { setSelectedDate(null); setShowTimePicker(false); }}
                                    className="ml-1 hover:text-red-400"
                                >
                                    &times;
                                </button>
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={!inputValue.trim()}
                            className="p-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    {/* Smart Pickers */}
                    <AnimatePresence>
                        {inputValue.trim().length > 0 && !selectedDate && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t border-border"
                            >
                                <div className="p-2 overflow-x-auto flex gap-2 custom-scrollbar pb-3">
                                    {next15Days.map(date => (
                                        <button
                                            key={date.toISOString()}
                                            type="button"
                                            onClick={() => handleDateSelect(date)}
                                            className="px-3 py-1.5 rounded-full bg-surface-hover/50 hover:bg-accent/20 border border-white/5 whitespace-nowrap text-xs text-text-secondary hover:text-accent transition-colors shrink-0"
                                        >
                                            {formatDateChip(date)}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                        {showTimePicker && selectedDate && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t border-border"
                            >
                                <div className="p-3">
                                    <div className="text-[10px] uppercase text-text-secondary font-bold mb-2">Select Time</div>
                                    <div className="flex gap-2 flex-wrap">
                                        {timePresets.map(p => (
                                            <button
                                                key={p.time}
                                                type="button"
                                                onClick={() => handleTimeSelect(p.time)}
                                                className="px-3 py-1.5 rounded bg-surface-hover/50 hover:bg-accent/20 border border-white/5 text-xs text-text-secondary hover:text-accent transition-colors"
                                            >
                                                {p.label} <span className="opacity-50">({p.time})</span>
                                            </button>
                                        ))}
                                        <input
                                            type="time"
                                            className="px-2 py-1 rounded bg-background border border-white/10 text-xs text-text-primary focus:outline-none focus:border-accent"
                                            onChange={(e) => handleTimeSelect(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </form>

                {/* Reminders List */}
                <div className="space-y-6">
                    {/* Active */}
                    <div className="space-y-2">
                        <AnimatePresence>
                            {activeReminders.map((reminder) => {
                                const isOverdue = reminder.dueDate && reminder.dueDate < Date.now();
                                return (
                                    <motion.div
                                        key={reminder.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                        className="group relative"
                                    >
                                        <div className="flex items-center gap-4 p-4 bg-surface rounded-lg border border-border hover:border-text-secondary transition-colors">
                                            <button
                                                onClick={() => toggleReminder(reminder.id)}
                                                className="text-text-secondary hover:text-accent transition-colors"
                                            >
                                                <Circle size={22} />
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-lg text-text-primary block truncate">{reminder.text}</span>
                                                {reminder.dueDate && (
                                                    <div className={`flex items-center gap-1 text-xs mt-1 ${isOverdue ? 'text-red-400' : 'text-text-secondary'}`}>
                                                        <Clock size={12} />
                                                        <span>{new Date(reminder.dueDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                        {isOverdue && <span className="font-bold uppercase text-[10px] ml-1">Overdue</span>}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => deleteReminder(reminder.id)}
                                                className="text-text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                        {activeReminders.length === 0 && completedReminders.length === 0 && (
                            <div className="text-center py-12 text-text-secondary">
                                <p>No reminders yet. Stay focused!</p>
                            </div>
                        )}
                    </div>

                    {/* Completed */}
                    {completedReminders.length > 0 && (
                        <div className="pt-6 border-t border-border">
                            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Completed</h3>
                            <div className="space-y-2 opacity-60">
                                {completedReminders.map((reminder) => (
                                    <div
                                        key={reminder.id}
                                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-hover/50 transition-colors"
                                    >
                                        <button
                                            onClick={() => toggleReminder(reminder.id)}
                                            className="text-green-500"
                                        >
                                            <Check size={20} />
                                        </button>
                                        <span className="flex-1 text-base text-text-secondary line-through">{reminder.text}</span>
                                        <button
                                            onClick={() => deleteReminder(reminder.id)}
                                            className="text-text-secondary hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reminders;
