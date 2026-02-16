import { useAssignments } from '@/modules/tracker/hooks/useAssignments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, ArrowRight, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, format, parseISO, addDays, isBefore } from 'date-fns';

export const TrackerWidget = () => {
    const { getDashboardStats, loading } = useAssignments();
    const navigate = useNavigate();

    if (loading) return <div className="animate-pulse h-full bg-surface/50 rounded-xl min-h-[200px]" />;

    const stats = getDashboardStats();
    const { nextAssignment, pendingAssignments } = stats;

    const today = new Date();
    const nextWeek = addDays(today, 7);

    const dueThisWeek = pendingAssignments.filter(a =>
        isBefore(parseISO(a.due_date), nextWeek)
    ).length;

    const getUrgencyColor = (dateString: string) => {
        const days = differenceInDays(parseISO(dateString), today);
        if (days <= 2) return 'text-red-400';
        if (days <= 5) return 'text-orange-400';
        return 'text-blue-400';
    };

    const getDaysDisplay = (dateString: string) => {
        const days = differenceInDays(parseISO(dateString), today);
        if (days < 0) return 'Overdue';
        if (days === 0) return 'Today';
        if (days === 1) return 'Tomorrow';
        return `${days} Days`;
    };

    return (
        <Card className="h-full bg-surface/40 backdrop-blur-sm border-white/5 hover:border-white/10 transition-all group overflow-hidden relative flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 shrink-0">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Academic Radar
                </CardTitle>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 -mr-2"
                    onClick={() => navigate('/tracker')}
                >
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col justify-between pt-0 pb-4">
                {nextAssignment ? (
                    <div className="space-y-4">
                        {/* Focus Item */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                                    Up Next
                                </span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-surface border border-white/5 ${getUrgencyColor(nextAssignment.due_date)}`}>
                                    {format(parseISO(nextAssignment.due_date), 'MMM d')}
                                </span>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold leading-tight truncate" title={nextAssignment.assignment_title}>
                                    {nextAssignment.assignment_title}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {nextAssignment.subject}
                                </p>
                            </div>

                            <div className="flex items-baseline gap-2 pt-1">
                                <span className={`text-3xl font-bold ${getUrgencyColor(nextAssignment.due_date)}`}>
                                    {getDaysDisplay(nextAssignment.due_date)}
                                </span>
                                <span className="text-sm text-muted-foreground">left</span>
                            </div>
                        </div>

                        {/* Secondary Items */}
                        {pendingAssignments.length > 1 && (
                            <div className="pt-3 border-t border-white/5 space-y-2">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                    On Deck
                                </p>
                                <div className="space-y-2">
                                    {pendingAssignments.slice(1, 3).map(a => (
                                        <div key={a.id} className="flex items-center justify-between text-xs group/item cursor-pointer hover:bg-white/5 p-1 rounded -mx-1 transition-colors">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary/30" />
                                                <span className="truncate text-foreground/80">{a.assignment_title}</span>
                                            </div>
                                            <span className="text-muted-foreground whitespace-nowrap ml-2">
                                                {format(parseISO(a.due_date), 'MMM d')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                        <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                            <CheckCircle2 className="h-6 w-6 text-green-400" />
                        </div>
                        <h3 className="font-semibold text-foreground">All Caught Up!</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            No pending assignments. Time to relax or get ahead.
                        </p>
                    </div>
                )}

                {/* Insight Footer */}
                {pendingAssignments.length > 0 && (
                    <div className="mt-auto pt-3 flex items-center gap-2">
                        {dueThisWeek > 2 ? (
                            <div className="flex items-center gap-1.5 text-xs text-orange-400 bg-orange-400/5 px-2 py-1 rounded-md border border-orange-400/10 w-full justify-center">
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span className="font-medium">Heavy Week: {dueThisWeek} due</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-400/5 px-2 py-1 rounded-md border border-blue-400/10 w-full justify-center">
                                <Calendar className="h-3.5 w-3.5" />
                                <span className="font-medium">{dueThisWeek} assignments this week</span>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
