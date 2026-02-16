import { useState } from 'react';
import { CheckCircle2, Circle, Calendar, BookOpen, Percent, Filter, Users, User, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Assignment, FilterType, UpdateAssignmentData } from '../types/database';
import { AssignmentEditDialog } from './AssignmentEditDialog';

interface AssignmentListProps {
  assignments: Assignment[];
  onToggleComplete: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, data: UpdateAssignmentData) => Promise<void> | void;
  loading?: boolean;
}

export const AssignmentList = ({ assignments, onToggleComplete, onDelete, onEdit, loading }: AssignmentListProps) => {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredAssignments = () => {
    switch (filter) {
      case 'completed':
        return assignments.filter(a => a.is_completed);
      case 'pending':
        return assignments.filter(a => !a.is_completed);
      default:
        return assignments;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
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

  const getDateBadgeVariant = (dateString: string, isCompleted: boolean) => {
    if (isCompleted) return 'secondary';

    const daysUntil = getDaysUntilDue(dateString);
    if (daysUntil < 0) return 'destructive';
    if (daysUntil <= 3) return 'destructive';
    if (daysUntil <= 7) return 'default';
    return 'secondary';
  };

  const sortedAssignments = filteredAssignments().sort((a, b) => {
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  if (loading) {
    return (
      <Card className="backdrop-blur-xl bg-surface/50 border-border shadow-sm">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading assignments...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border-white/10 shadow-xl transition-all duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl text-foreground flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Your Assignments
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Manage and track your assignment progress
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filter} onValueChange={(value: FilterType) => setFilter(value)}>
              <SelectTrigger className="w-32 bg-surface/30 border-white/10 backdrop-blur-sm text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface/90 backdrop-blur-xl border-white/10 text-foreground">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedAssignments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {filter === 'all'
              ? 'No assignments yet. Create your first assignment above!'
              : `No ${filter} assignments found.`
            }
          </div>
        ) : (
          sortedAssignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center justify-between p-4 rounded-xl bg-surface/30 border border-white/5 hover:bg-surface/50 hover:border-white/10 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="flex items-center gap-4 flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleComplete(assignment.id, !assignment.is_completed)}
                  className="h-8 w-8 p-0 hover:bg-surface-hover text-muted-foreground hover:text-primary"
                >
                  {assignment.is_completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </Button>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex flex-col">
                      <h3 className={`font-semibold ${assignment.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {assignment.assignment_title}
                      </h3>
                      <p className={`text-sm ${assignment.is_completed ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}>
                        {assignment.subject}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-surface border-border text-muted-foreground">
                      <Percent className="h-3 w-3 mr-1" />
                      {assignment.contribution_percentage}%
                    </Badge>
                    <Badge variant="outline" className="bg-surface border-border text-muted-foreground">
                      {assignment.group_individual === 'Group' ? (
                        <Users className="h-3 w-3 mr-1" />
                      ) : (
                        <User className="h-3 w-3 mr-1" />
                      )}
                      {assignment.group_individual}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Due: {formatDate(assignment.due_date)}</span>
                    <Badge
                      variant={getDateBadgeVariant(assignment.due_date, assignment.is_completed)}
                      className="text-xs"
                    >
                      {assignment.is_completed ? (
                        'Completed'
                      ) : (
                        (() => {
                          const days = getDaysUntilDue(assignment.due_date);
                          if (days < 0) return `${Math.abs(days)} days overdue`;
                          if (days === 0) return 'Due today';
                          if (days === 1) return 'Due tomorrow';
                          return `${days} days left`;
                        })()
                      )}
                    </Badge>
                  </div>
                </div>

                <AssignmentEditDialog assignment={assignment} onSave={onEdit}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-surface-hover text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </AssignmentEditDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-red-500/10 hover:text-red-500 transition-colors text-muted-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-surface border-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-foreground">Delete Assignment</AlertDialogTitle>
                      <AlertDialogDescription className="text-muted-foreground">
                        Are you sure you want to delete "{assignment.assignment_title}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-transparent border-border text-foreground hover:bg-surface-hover">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(assignment.id)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};