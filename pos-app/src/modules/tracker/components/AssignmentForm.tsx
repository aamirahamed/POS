import { useState } from 'react';
import { CalendarIcon, BookOpenIcon, PercentIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateAssignmentData } from '../types/database';

import { useSubjects } from '../hooks/useSubjects';

const groupOptions = ['Group', 'Individual'];

interface AssignmentFormProps {
  onSubmit: (data: CreateAssignmentData) => Promise<void>;
  currentSemesterId: string | null;
  loading?: boolean;
}

export const AssignmentForm = ({ onSubmit, currentSemesterId, loading }: AssignmentFormProps) => {
  const { subjects } = useSubjects();
  const [formData, setFormData] = useState({
    subject: '',
    assignment_title: '',
    due_date: '',
    contribution_percentage: '',
    group_individual: 'Individual'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSemesterId) return;

    setSubmitting(true);
    try {
      await onSubmit({
        semester_id: currentSemesterId,
        subject: formData.subject,
        assignment_title: formData.assignment_title,
        due_date: formData.due_date,
        contribution_percentage: parseFloat(formData.contribution_percentage),
        group_individual: formData.group_individual
      });

      // Reset form
      setFormData({
        subject: '',
        assignment_title: '',
        due_date: '',
        contribution_percentage: '',
        group_individual: 'Individual'
      });
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Card className="backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border-white/10 shadow-xl hover:from-white/15 hover:to-white/10 hover:border-white/20 transition-all duration-300">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-foreground flex items-center justify-center gap-2">
          <BookOpenIcon className="h-6 w-6 text-primary" />
          Create New Assignment
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Add a new assignment for Semester 2
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-medium text-foreground">
              Subject
            </Label>
            <Select
              value={formData.subject}
              onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
              required
            >
              <SelectTrigger className="bg-surface border-border backdrop-blur-sm text-foreground">
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border text-foreground">
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.name}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignment_title" className="text-sm font-medium text-foreground">
              Assignment Title
            </Label>
            <Input
              id="assignment_title"
              type="text"
              value={formData.assignment_title}
              onChange={(e) => setFormData(prev => ({ ...prev, assignment_title: e.target.value }))}
              className="bg-surface border-border backdrop-blur-sm text-foreground placeholder:text-muted-foreground"
              placeholder="Enter assignment title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date" className="text-sm font-medium text-foreground flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Due Date
            </Label>
            <Input
              id="due_date"
              type="date"
              min={today}
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              className="bg-surface border-border backdrop-blur-sm text-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contribution" className="text-sm font-medium text-foreground flex items-center gap-2">
              <PercentIcon className="h-4 w-4" />
              % Contribution to Total Marks
            </Label>
            <Input
              id="contribution"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.contribution_percentage}
              onChange={(e) => setFormData(prev => ({ ...prev, contribution_percentage: e.target.value }))}
              className="bg-surface border-border backdrop-blur-sm text-foreground placeholder:text-muted-foreground"
              placeholder="e.g., 25.5"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group_individual" className="text-sm font-medium text-foreground">
              Group/Individual
            </Label>
            <Select
              value={formData.group_individual}
              onValueChange={(value) => setFormData(prev => ({ ...prev, group_individual: value }))}
              required
            >
              <SelectTrigger className="bg-surface border-border backdrop-blur-sm text-foreground">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border text-foreground">
                {groupOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
            disabled={submitting || loading || !currentSemesterId}
          >
            {submitting ? 'Creating...' : 'Create Assignment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};