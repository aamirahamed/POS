import { useState } from 'react';
import { useRemindersStore } from '@/store/useRemindersStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Bell, ArrowRight, Plus, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, isPast, isToday } from 'date-fns';

export const RemindersWidget = () => {
    const { reminders, addReminder, toggleReminder } = useRemindersStore();
    const [newReminder, setNewReminder] = useState('');
    const navigate = useNavigate();

    const pendingReminders = reminders
        .filter(r => !r.completed)
        .sort((a, b) => {
            // Sort by due date (earliest first), put those without due date at the end
            if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return b.createdAt - a.createdAt; // Newest created first for non-dated
        })
        .slice(0, 3);

    const completedCount = reminders.filter(r => r.completed).length;

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newReminder.trim()) {
            addReminder(newReminder.trim());
            setNewReminder('');
        }
    };

    const getDueDateBadge = (timestamp?: number) => {
        if (!timestamp) return null;
        const date = new Date(timestamp);

        if (isToday(date)) {
            return <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">Today</span>;
        }
        if (isPast(date)) {
            return <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">Overdue</span>;
        }
        return <span className="text-[10px] text-muted-foreground">{format(date, 'MMM d')}</span>;
    };

    return (
        <Card className="h-full bg-surface/40 backdrop-blur-sm border-white/5 hover:border-white/10 transition-all group overflow-hidden relative flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 shrink-0">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-purple-400 transition-colors flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Quick Focus
                </CardTitle>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 -mr-2"
                    onClick={() => navigate('/reminders')}
                >
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col pt-0 pb-4 gap-4">
                {/* Input Area */}
                <form onSubmit={handleAdd} className="relative">
                    <Input
                        value={newReminder}
                        onChange={(e) => setNewReminder(e.target.value)}
                        placeholder="Capture a task..."
                        className="h-9 text-sm bg-surface/50 border-white/10 focus:border-purple-500/50 pr-8"
                    />
                    <div className="absolute right-1 top-1">
                        <Button
                            type="submit"
                            size="icon"
                            className="h-7 w-7 text-purple-400 hover:bg-purple-500/10"
                            variant="ghost"
                            disabled={!newReminder.trim()}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </form>

                {/* Task List */}
                <div className="flex-1 space-y-2">
                    {pendingReminders.length > 0 ? (
                        <div className="space-y-2">
                            {pendingReminders.map(reminder => (
                                <div key={reminder.id} className="flex items-start gap-3 group/item p-2 rounded hover:bg-white/5 transition-colors -mx-2">
                                    <Checkbox
                                        checked={reminder.completed}
                                        onCheckedChange={() => toggleReminder(reminder.id)}
                                        className="mt-0.5 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500 border-white/20"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm text-foreground/90 font-medium truncate leading-tight">
                                                {reminder.text}
                                            </span>
                                            {getDueDateBadge(reminder.dueDate)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60 min-h-[100px]">
                            <div className="p-3 bg-purple-500/10 rounded-full mb-2">
                                <CheckCircle2 className="h-5 w-5 text-purple-400" />
                            </div>
                            <p className="text-xs text-muted-foreground">Focus clear.</p>
                        </div>
                    )}
                </div>

                {/* Footer Stats */}
                <div className="mt-auto pt-2 border-t border-white/5 flex justify-between items-center text-[10px] text-muted-foreground uppercase tracking-wider">
                    <span>{reminders.filter(r => !r.completed).length} Pending</span>
                    <span>{completedCount} Done</span>
                </div>
            </CardContent>
        </Card>
    );
};
