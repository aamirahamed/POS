import { Calendar, Users, User, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TimelineAssignment {
  id: string;
  assignment_title: string;
  subject: string;
  due_date: string;
  contribution_percentage: number;
  group_individual: string;
}

interface TimelineCardProps {
  assignments: TimelineAssignment[];
}

export const TimelineCard = ({ assignments }: TimelineCardProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntilDue = (dateString: string) => {
    const today = new Date();
    const dueDate = new Date(dateString);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDaysBetween = (date1: string, date2: string) => {
    const firstDate = new Date(date1);
    const secondDate = new Date(date2);
    const diffTime = secondDate.getTime() - firstDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyColor = (days: number) => {
    if (days < 0) return 'text-destructive bg-destructive/10';
    if (days <= 3) return 'text-destructive bg-destructive/10';
    if (days <= 7) return 'text-warning bg-warning/10';
    return 'text-success bg-success/10';
  };

  const getSubjectColor = (subject: string) => {
    // Simple hash function to generate a color index from the subject name
    const hash = subject.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    const colors = [
      'bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40',
      'bg-green-500/10 border-green-500/20 hover:border-green-500/40',
      'bg-purple-500/10 border-purple-500/20 hover:border-purple-500/40',
      'bg-orange-500/10 border-orange-500/20 hover:border-orange-500/40',
      'bg-pink-500/10 border-pink-500/20 hover:border-pink-500/40',
      'bg-cyan-500/10 border-cyan-500/20 hover:border-cyan-500/40',
      'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40',
      'bg-indigo-500/10 border-indigo-500/20 hover:border-indigo-500/40'
    ];

    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Sort assignments by due date
  const sortedAssignments = [...assignments].sort((a, b) =>
    new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );

  if (sortedAssignments.length === 0) {
    return (
      <Card className="backdrop-blur-xl bg-surface/50 border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Upcoming Assignments Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Clock className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">No pending assignments!</p>
          <p className="text-sm text-muted-foreground">Great job staying on top of things 🎉</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-xl bg-surface/50 border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Upcoming Assignments Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        <div className="relative">
          {sortedAssignments.map((assignment, index) => {
            const daysLeft = getDaysUntilDue(assignment.due_date);
            const isLast = index === sortedAssignments.length - 1;
            const nextAssignment = sortedAssignments[index + 1];
            const daysBetween = nextAssignment ? getDaysBetween(assignment.due_date, nextAssignment.due_date) : 0;

            return (
              <div key={assignment.id} className="relative">
                {/* Timeline dot and line */}
                <div className="absolute left-4 top-6 w-3 h-3 rounded-full bg-primary border-2 border-background shadow-sm z-10"></div>
                {!isLast && (
                  <div className="absolute left-5 top-9 w-0.5 h-20 bg-gradient-to-b from-primary/50 to-transparent"></div>
                )}

                {/* Assignment card */}
                <div className="ml-10 mb-6">
                  <div className={`p-4 rounded-lg border ${getSubjectColor(assignment.subject)} shadow-sm hover:shadow-md transition-shadow duration-200`}>
                    <div className="space-y-3">
                      {/* Header with title and urgency */}
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-lg leading-tight text-foreground">{assignment.assignment_title}</h3>
                        <Badge className={`ml-2 text-xs ${getUrgencyColor(daysLeft)}`}>
                          {(() => {
                            if (daysLeft < 0) return `${Math.abs(daysLeft)}d overdue`;
                            if (daysLeft === 0) return 'Due today';
                            if (daysLeft === 1) return 'Tomorrow';
                            return `${daysLeft}d left`;
                          })()}
                        </Badge>
                      </div>

                      {/* Subject and due date */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-primary">{assignment.subject}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(assignment.due_date)}</span>
                        </div>
                      </div>

                      {/* Tags and contribution */}
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="outline" className="text-xs bg-surface border-border text-muted-foreground">
                          {assignment.group_individual === 'Group' ? (
                            <Users className="h-2 w-2 mr-1" />
                          ) : (
                            <User className="h-2 w-2 mr-1" />
                          )}
                          {assignment.group_individual}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-surface border-border text-muted-foreground">
                          {assignment.contribution_percentage}% weight
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Days gap indicator */}
                {!isLast && daysBetween > 0 && (
                  <div className="ml-12 -mt-3 mb-3">
                    <div
                      className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 text-warning ring-1 ring-warning/30 px-2.5 py-1 text-[11px] font-semibold tracking-wide shadow-sm animate-enter"
                      aria-label={`${daysBetween} day${daysBetween > 1 ? 's' : ''} gap`}
                    >
                      <Clock className="h-3 w-3" />
                      <span>+{daysBetween} day{daysBetween > 1 ? 's' : ''} later</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};