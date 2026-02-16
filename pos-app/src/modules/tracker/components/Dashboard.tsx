import React, { useMemo, useState } from 'react';
import { TrendingUp, Calendar, CheckCircle, Clock, AlertCircle, BookOpen, Users, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TimelineCard } from './TimelineCard';
import { AssignmentBucketsBar } from './AssignmentBucketsBar';
import { SortableCard } from './SortableCard';
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, DragOverlay, PointerSensor, closestCenter, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
interface DashboardStats {
  total: number;
  completed: number;
  pending: number;
  completedContribution: number;
  totalContribution: number;
  completionPercentage: number;
  nextAssignment: {
    id: string;
    subject: string;
    assignment_title: string;
    due_date: string;
    contribution_percentage: number;
    group_individual: string;
  } | null;
  subjectStats: {
    subject: string;
    completionPercentage: number;
    nextUpcoming: {
      id: string;
      subject: string;
      assignment_title: string;
      due_date: string;
      contribution_percentage: number;
      group_individual: string;
    } | null;
    allCompleted: boolean;
  }[];
  pendingAssignments: {
    id: string;
    subject: string;
    assignment_title: string;
    due_date: string;
    contribution_percentage: number;
    group_individual: string;
  }[];
}

interface DashboardProps {
  stats: DashboardStats;
  assignments: any[];
  loading?: boolean;
}

export const Dashboard = ({ stats, assignments, loading }: DashboardProps) => {
  const initialOrder: string[] = [
    'stat-total',
    'stat-completed',
    'stat-pending',
    'stat-progress',
    'timeline',
    'buckets',
    'next',
    'subject-completion',
    'subject-upcoming'
  ];

  const containerIds = ['col-1', 'col-2', 'col-3'] as const;

  const [columns, setColumns] = useState<Record<string, string[]>>(() => {
    const cols: Record<string, string[]> = { 'col-1': [], 'col-2': [], 'col-3': [] };
    initialOrder.forEach((id, idx) => {
      const colKey = containerIds[idx % containerIds.length];
      cols[colKey].push(id);
    });
    return cols;
  });

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const findContainer = (id: string) => {
    if ((containerIds as readonly string[]).includes(id)) return id;
    return (containerIds as readonly string[]).find((key) => columns[key].includes(id)) || null;
  };
  // Removed early loading return to keep hook order stable
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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

  const getUrgencyColor = (days: number) => {
    if (days < 0) return 'text-red-600';
    if (days <= 3) return 'text-red-500';
    if (days <= 7) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Define individual draggable cards
  const items: { id: string; element: React.ReactNode; span?: string }[] = [
    {
      id: 'stat-total',
      span: 'col-span-1',
      element: (
        <Card className="backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border-white/10 shadow-xl hover:from-white/15 hover:to-white/10 hover:scale-[1.02] hover:border-white/20 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Assignments
            </CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <p className="text-xs text-muted-foreground">across all subjects</p>
          </CardContent>
        </Card>
      )
    },
    {
      id: 'stat-completed',
      span: 'col-span-1',
      element: (
        <Card className="backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border-white/10 shadow-xl hover:from-white/15 hover:to-white/10 hover:scale-[1.02] hover:border-white/20 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">assignments finished</p>
          </CardContent>
        </Card>
      )
    },
    {
      id: 'stat-pending',
      span: 'col-span-1',
      element: (
        <Card className="backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border-white/10 shadow-xl hover:from-white/15 hover:to-white/10 hover:scale-[1.02] hover:border-white/20 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">need attention</p>
          </CardContent>
        </Card>
      )
    },
    {
      id: 'stat-progress',
      span: 'col-span-1',
      element: (
        <Card className="backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border-white/10 shadow-xl hover:from-white/15 hover:to-white/10 hover:scale-[1.02] hover:border-white/20 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.completionPercentage.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">by contribution weight</p>
          </CardContent>
        </Card>
      )
    },
    {
      id: 'timeline',
      span: 'md:col-span-2 lg:col-span-2',
      element: <TimelineCard assignments={stats.pendingAssignments} />
    },
    {
      id: 'buckets',
      span: 'md:col-span-2 lg:col-span-2',
      element: <AssignmentBucketsBar assignments={assignments} />
    },
    {
      id: 'next',
      span: 'md:col-span-2 lg:col-span-2',
      element: (
        <Card className="backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border-white/10 shadow-xl hover:from-white/15 hover:to-white/10 hover:border-white/20 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Next Due Assignment
            </CardTitle>
            <CardDescription>Your most urgent upcoming task</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.nextAssignment ? (
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg text-foreground">{stats.nextAssignment.assignment_title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {stats.nextAssignment.subject} • Worth {stats.nextAssignment.contribution_percentage}% of total marks
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{formatDate(stats.nextAssignment.due_date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-surface border-border text-muted-foreground">
                    {stats.nextAssignment.group_individual === 'Group' ? (
                      <Users className="h-3 w-3 mr-1" />
                    ) : (
                      <User className="h-3 w-3 mr-1" />
                    )}
                    {stats.nextAssignment.group_individual}
                  </Badge>
                  <Badge className={`${getUrgencyColor(getDaysUntilDue(stats.nextAssignment.due_date))} bg-surface border border-border/50`}>
                    {(() => {
                      const days = getDaysUntilDue(stats.nextAssignment.due_date);
                      if (days < 0) return `${Math.abs(days)} days overdue`;
                      if (days === 0) return 'Due today!';
                      if (days === 1) return 'Due tomorrow';
                      return `${days} days remaining`;
                    })()}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>All assignments completed!</p>
                <p className="text-sm">Great job! 🎉</p>
              </div>
            )}
          </CardContent>
        </Card>
      )
    },
    {
      id: 'subject-completion',
      span: 'md:col-span-2 lg:col-span-2',
      element: (
        <Card className="backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border-white/10 shadow-xl hover:from-white/15 hover:to-white/10 hover:border-white/20 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Subject-wise Completion
            </CardTitle>
            <CardDescription>Progress overview by subject</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.subjectStats.map((subject) => (
              <div key={subject.subject} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">{subject.subject}</span>
                  <span className="text-sm font-semibold text-primary">{subject.completionPercentage.toFixed(1)}%</span>
                </div>
                <Progress value={subject.completionPercentage} className="h-2 bg-surface border border-border/50" />
              </div>
            ))}
          </CardContent>
        </Card>
      )
    },
    {
      id: 'subject-upcoming',
      span: 'md:col-span-2 lg:col-span-2',
      element: (
        <Card className="backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border-white/10 shadow-xl hover:from-white/15 hover:to-white/10 hover:border-white/20 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Upcoming by Subject
            </CardTitle>
            <CardDescription>Next assignment per subject</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.subjectStats.map((subject) => (
              <div key={subject.subject} className="p-3 rounded-lg bg-surface/40 border border-border/50 hover:bg-surface-hover/40 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-sm text-foreground">{subject.subject}</h4>
                  {subject.allCompleted && (
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20">All done 🎉</Badge>
                  )}
                </div>
                {subject.nextUpcoming ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">{subject.nextUpcoming.assignment_title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(subject.nextUpcoming.due_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs bg-surface border-border text-muted-foreground">
                        {subject.nextUpcoming.group_individual === 'Group' ? (
                          <Users className="h-2 w-2 mr-1" />
                        ) : (
                          <User className="h-2 w-2 mr-1" />
                        )}
                        {subject.nextUpcoming.group_individual}
                      </Badge>
                      <Badge className={`text-xs ${getUrgencyColor(getDaysUntilDue(subject.nextUpcoming.due_date))} bg-surface border border-border/50`}>
                        {(() => {
                          const days = getDaysUntilDue(subject.nextUpcoming.due_date);
                          if (days < 0) return `${Math.abs(days)} days overdue`;
                          if (days === 0) return 'Due today';
                          if (days === 1) return 'Due tomorrow';
                          return `${days} days left`;
                        })()}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  !subject.allCompleted && <p className="text-xs text-muted-foreground">No upcoming assignments</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )
    }
  ];

  const itemMap = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const source = findContainer(activeId);
    const dest = findContainer(overId);

    if (!source || !dest || source === dest) return;

    setColumns((prev) => {
      const sourceItems = prev[source].filter((id) => id !== activeId);
      const destItems = prev[dest];
      const overIndex = destItems.indexOf(overId);
      const insertIndex = overIndex >= 0 ? overIndex : destItems.length;
      return {
        ...prev,
        [source]: sourceItems,
        [dest]: [...destItems.slice(0, insertIndex), activeId, ...destItems.slice(insertIndex)],
      };
    });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const source = findContainer(activeId);
    const dest = findContainer(overId);

    if (source && dest && source === dest) {
      const activeIndex = columns[source].indexOf(activeId);
      const overIndex = columns[dest].indexOf(overId);
      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        setColumns((prev) => ({
          ...prev,
          [source]: arrayMove(prev[source], activeIndex, overIndex),
        }));
      }
    }

    setActiveId(null);
  };

  const DroppableColumn: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
    const { setNodeRef } = useDroppable({ id });
    return (
      <div ref={setNodeRef} className="w-full md:w-1/2 lg:w-1/3 flex flex-col gap-6">
        {children}
      </div>
    );
  };

  return (
    loading ? (
      <Card className="backdrop-blur-xl bg-surface/50 border-border shadow-sm">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-muted-foreground animate-pulse">Loading dashboard...</div>
        </CardContent>
      </Card>
    ) : (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {Array.from(containerIds).map((col) => (
            <DroppableColumn key={col} id={col}>
              <SortableContext items={columns[col]} strategy={verticalListSortingStrategy}>
                {columns[col].map((id) => {
                  const item = itemMap[id];
                  if (!item) return null;
                  return (
                    <SortableCard key={id} id={id} className="">
                      {item.element}
                    </SortableCard>
                  );
                })}
              </SortableContext>
            </DroppableColumn>
          ))}
        </div>

        <DragOverlay>
          {activeId ? itemMap[activeId]?.element ?? null : null}
        </DragOverlay>
      </DndContext>
    )
  );
};