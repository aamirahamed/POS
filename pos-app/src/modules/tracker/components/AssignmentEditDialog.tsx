import { useEffect, useState } from 'react';
import { CalendarIcon, Percent, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Assignment, UpdateAssignmentData } from '../types/database';

import { useSubjects } from '../hooks/useSubjects';

const groupOptions = ['Group', 'Individual'];

interface AssignmentEditDialogProps {
  assignment: Assignment;
  onSave: (id: string, data: UpdateAssignmentData) => Promise<void> | void;
  children: React.ReactNode; // trigger
}

export const AssignmentEditDialog = ({ assignment, onSave, children }: AssignmentEditDialogProps) => {
  const [open, setOpen] = useState(false);
  const { subjects } = useSubjects();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<UpdateAssignmentData>({
    subject: assignment.subject,
    assignment_title: assignment.assignment_title,
    due_date: assignment.due_date,
    contribution_percentage: assignment.contribution_percentage,
    group_individual: assignment.group_individual,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        subject: assignment.subject,
        assignment_title: assignment.assignment_title,
        due_date: assignment.due_date,
        contribution_percentage: assignment.contribution_percentage,
        group_individual: assignment.group_individual,
      });
    }
  }, [open, assignment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(assignment.id, formData);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-surface border-border sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Pencil className="h-4 w-4 text-primary" /> Edit Assignment
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">Update the details and save your changes.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-foreground">Subject</Label>
            <Select
              value={formData.subject}
              onValueChange={(value) => setFormData((p) => ({ ...p, subject: value }))}
              required
            >
              <SelectTrigger className="bg-surface border-border backdrop-blur-sm text-foreground">
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border text-foreground">
                {subjects.map((s) => (
                  <SelectItem value={s.name} key={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground">Assignment Title</Label>
            <Input
              id="title"
              value={formData.assignment_title}
              onChange={(e) => setFormData((p) => ({ ...p, assignment_title: e.target.value }))}
              className="bg-surface border-border backdrop-blur-sm text-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date" className="flex items-center gap-2 text-foreground">
              <CalendarIcon className="h-4 w-4" /> Due Date
            </Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData((p) => ({ ...p, due_date: e.target.value }))}
              className="bg-surface border-border backdrop-blur-sm text-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contrib" className="flex items-center gap-2 text-foreground">
              <Percent className="h-4 w-4" /> % Contribution
            </Label>
            <Input
              id="contrib"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.contribution_percentage}
              onChange={(e) => setFormData((p) => ({ ...p, contribution_percentage: parseFloat(e.target.value || '0') }))}
              className="bg-surface border-border backdrop-blur-sm text-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-foreground">Group/Individual</Label>
            <Select
              value={formData.group_individual}
              onValueChange={(value) => setFormData((p) => ({ ...p, group_individual: value }))}
              required
            >
              <SelectTrigger className="bg-surface border-border backdrop-blur-sm text-foreground">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border text-foreground">
                {groupOptions.map((g) => (
                  <SelectItem value={g} key={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="bg-transparent border-border text-foreground hover:bg-surface-hover">
              Cancel
            </Button>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
