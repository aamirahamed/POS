import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Assignment, CreateAssignmentData, FilterType, UpdateAssignmentData } from '../types/database';
import { useToast } from '@/hooks/use-toast';

export const useAssignments = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch assignments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async (assignmentData: CreateAssignmentData) => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .insert([assignmentData])
        .select()
        .single();

      if (error) throw error;

      setAssignments(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Assignment created successfully"
      });
      return data;
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        title: "Error",
        description: "Failed to create assignment",
        variant: "destructive"
      });
      throw error;
    }
  };

  const toggleAssignment = async (id: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('assignments')
        .update({ is_completed: completed })
        .eq('id', id);

      if (error) throw error;

      setAssignments(prev =>
        prev.map(assignment =>
          assignment.id === id
            ? { ...assignment, is_completed: completed }
            : assignment
        )
      );

      toast({
        title: "Success",
        description: `Assignment marked as ${completed ? 'completed' : 'pending'}`
      });
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast({
        title: "Error",
        description: "Failed to update assignment",
        variant: "destructive"
      });
    }
  };

  const updateAssignment = async (id: string, data: UpdateAssignmentData) => {
    try {
      const { data: updated, error } = await supabase
        .from('assignments')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setAssignments(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a));

      toast({
        title: "Success",
        description: "Assignment updated successfully"
      });
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast({
        title: "Error",
        description: "Failed to update assignment",
        variant: "destructive"
      });
      throw error;
    }
  };
  const deleteAssignment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAssignments(prev => prev.filter(assignment => assignment.id !== id));

      toast({
        title: "Success",
        description: "Assignment deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast({
        title: "Error",
        description: "Failed to delete assignment",
        variant: "destructive"
      });
    }
  };
  const getFilteredAssignments = (filter: FilterType) => {
    switch (filter) {
      case 'completed':
        return assignments.filter(a => a.is_completed);
      case 'pending':
        return assignments.filter(a => !a.is_completed);
      default:
        return assignments;
    }
  };

  const getDashboardStats = () => {
    const total = assignments.length;
    const completed = assignments.filter(a => a.is_completed).length;
    const pending = total - completed;

    const completedContribution = assignments
      .filter(a => a.is_completed)
      .reduce((sum, a) => sum + a.contribution_percentage, 0);

    const totalContribution = assignments
      .reduce((sum, a) => sum + a.contribution_percentage, 0);

    const pendingAssignments = assignments
      .filter(a => !a.is_completed)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    const nextAssignment = pendingAssignments[0] || null;

    // Subject-wise statistics
    const uniqueSubjects = Array.from(new Set(assignments.map(a => a.subject)));

    // Sort subjects alphabetically for consistent display
    uniqueSubjects.sort();

    const subjectStats = uniqueSubjects.map(subject => {
      const subjectAssignments = assignments.filter(a => a.subject === subject);
      const completedSubjectAssignments = subjectAssignments.filter(a => a.is_completed);
      const subjectTotalContribution = subjectAssignments.reduce((sum, a) => sum + a.contribution_percentage, 0);
      const subjectCompletedContribution = completedSubjectAssignments.reduce((sum, a) => sum + a.contribution_percentage, 0);

      const nextUpcoming = subjectAssignments
        .filter(a => !a.is_completed)
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0] || null;

      return {
        subject,
        completionPercentage: subjectTotalContribution > 0 ? (subjectCompletedContribution / subjectTotalContribution) * 100 : 0,
        nextUpcoming,
        allCompleted: subjectAssignments.length > 0 && subjectAssignments.every(a => a.is_completed)
      };
    });

    return {
      total,
      completed,
      pending,
      completedContribution,
      totalContribution,
      completionPercentage: totalContribution > 0 ? (completedContribution / totalContribution) * 100 : 0,
      nextAssignment,
      subjectStats,
      pendingAssignments
    };
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  return {
    assignments,
    loading,
    createAssignment,
    toggleAssignment,
    updateAssignment,
    deleteAssignment,
    getFilteredAssignments,
    getDashboardStats,
    refetch: fetchAssignments
  };
};