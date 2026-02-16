import { Clock, AlertTriangle, Calendar, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Assignment {
  id: string;
  subject: string;
  assignment_title: string;
  due_date: string;
  contribution_percentage: number;
  group_individual: string;
  completed: boolean;
}

interface AssignmentBucketsBarProps {
  assignments: Assignment[];
  onFilterByBucket?: (bucket: string) => void;
}

interface TimeBucket {
  name: string;
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  icon: React.ElementType;
  assignments: Assignment[];
}

export const AssignmentBucketsBar = ({ assignments, onFilterByBucket }: AssignmentBucketsBarProps) => {
  const getDaysUntilDue = (dateString: string) => {
    const today = new Date();
    const dueDate = new Date(dateString);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter out completed assignments and group by time buckets
  const pendingAssignments = assignments.filter(assignment => !assignment.completed);

  const buckets: TimeBucket[] = [
    {
      name: 'urgent',
      label: 'Urgent',
      color: 'hsl(0, 84%, 60%)', // Red
      bgColor: 'bg-red-500',
      textColor: 'text-white',
      icon: AlertTriangle,
      assignments: []
    },
    {
      name: 'upcoming',
      label: 'Upcoming',
      color: 'hsl(25, 95%, 53%)', // Orange
      bgColor: 'bg-orange-500',
      textColor: 'text-white',
      icon: Clock,
      assignments: []
    },
    {
      name: 'soon',
      label: 'Soon',
      color: 'hsl(45, 93%, 47%)', // Yellow
      bgColor: 'bg-yellow-500',
      textColor: 'text-white',
      icon: Clock,
      assignments: []
    },
    {
      name: 'later',
      label: 'Later',
      color: 'hsl(142, 71%, 45%)', // Green
      bgColor: 'bg-green-500',
      textColor: 'text-white',
      icon: Calendar,
      assignments: []
    }
  ];

  // Group assignments into buckets
  pendingAssignments.forEach(assignment => {
    const days = getDaysUntilDue(assignment.due_date);

    if (days <= 3) {
      buckets[0].assignments.push(assignment);
    } else if (days <= 7) {
      buckets[1].assignments.push(assignment);
    } else if (days <= 14) {
      buckets[2].assignments.push(assignment);
    } else {
      buckets[3].assignments.push(assignment);
    }
  });

  const totalAssignments = pendingAssignments.length;

  if (totalAssignments === 0) {
    return (
      <Card className="backdrop-blur-xl bg-surface/50 border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Assignment Status by Time Buckets
          </CardTitle>
          <CardDescription>
            Visual breakdown of assignments by urgency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-600" />
            <p>All assignments completed!</p>
            <p className="text-sm">Great job! 🎉</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-xl bg-surface/50 border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Assignment Status by Time Buckets
        </CardTitle>
        <CardDescription>
          Visual breakdown of {totalAssignments} pending assignments by urgency
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Segmented Bar */}
          <div className="relative">
            <div className="flex h-20 rounded-lg overflow-hidden border border-border/50 shadow-sm">
              <TooltipProvider>
                {buckets.map((bucket) => {
                  const percentage = totalAssignments > 0 ? (bucket.assignments.length / totalAssignments) * 100 : 0;
                  const Icon = bucket.icon;

                  if (percentage === 0) return null;

                  return (
                    <Tooltip key={bucket.name}>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex items-center justify-center transition-all duration-200 hover:opacity-90 cursor-pointer relative group`}
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: bucket.color,
                            minWidth: percentage > 0 ? '80px' : '0px'
                          }}
                          onClick={() => onFilterByBucket?.(bucket.name)}
                        >
                          <div className="flex flex-col items-center gap-1 px-2 py-2">
                            {Icon && <Icon className="h-4 w-4 text-white drop-shadow-sm" />}
                            <span className="text-xs font-medium text-white drop-shadow-sm text-center leading-tight">
                              {bucket.assignments.length} {bucket.assignments.length === 1 ? 'assignment' : 'assignments'}
                            </span>
                          </div>

                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-2">
                          <div className="font-semibold text-sm">
                            {bucket.label} ({bucket.assignments.length} assignments)
                          </div>
                          <div className="space-y-1">
                            {bucket.assignments.slice(0, 5).map((assignment) => (
                              <div key={assignment.id} className="text-xs">
                                <div className="font-medium">{assignment.assignment_title}</div>
                                <div className="text-muted-foreground">
                                  {assignment.subject} • Due {formatDate(assignment.due_date)}
                                </div>
                              </div>
                            ))}
                            {bucket.assignments.length > 5 && (
                              <div className="text-xs text-muted-foreground">
                                ...and {bucket.assignments.length - 5} more
                              </div>
                            )}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
            </div>

            {/* Labels under segments */}
            <div className="flex mt-3">
              {buckets.map((bucket) => {
                const percentage = totalAssignments > 0 ? (bucket.assignments.length / totalAssignments) * 100 : 0;

                if (percentage === 0) return null;

                return (
                  <div
                    key={bucket.name}
                    className="flex flex-col items-center justify-start text-center px-1"
                    style={{
                      width: `${percentage}%`,
                      minWidth: percentage > 0 ? '80px' : '0px'
                    }}
                  >
                    <span className="text-xs font-medium text-foreground leading-tight">
                      {bucket.label}
                    </span>
                    <span className="text-xs text-muted-foreground leading-tight">
                      ({bucket.name === 'urgent' ? '1-3' : bucket.name === 'upcoming' ? '4-7' : bucket.name === 'soon' ? '8-14' : '15+'} days)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Total pending: {totalAssignments}</span>
            <span>Most urgent: {buckets[0].assignments.length + buckets[1].assignments.length} due within 7 days</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};