
import { useState, useEffect, useCallback } from 'react';
import { Subject, SubjectService } from '../services/SubjectService';
import { useToast } from '@/hooks/use-toast';

export const useSubjects = () => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchSubjects = useCallback(async () => {
        setLoading(true);
        try {
            const data = await SubjectService.getSubjects();
            setSubjects(data);
        } catch (error) {
            console.error('Error fetching subjects:', error);
            toast({
                title: "Error",
                description: "Failed to load subjects.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchSubjects();
    }, [fetchSubjects]);

    const addSubject = async (name: string) => {
        try {
            // Optimistic update
            const tempId = Date.now().toString();
            const newSubject: Subject = {
                id: tempId,
                user_id: 'current-user', // Placeholder
                name,
                created_at: new Date().toISOString()
            };
            setSubjects(prev => [...prev, newSubject].sort((a, b) => a.name.localeCompare(b.name)));

            const created = await SubjectService.addSubject(name);

            // Replace optimistic with real
            setSubjects(prev => prev.map(s => s.id === tempId ? created : s).sort((a, b) => a.name.localeCompare(b.name)));

            toast({
                title: "Success",
                description: "Subject added successfully.",
            });
            return created;
        } catch (error) {
            console.error('Error adding subject:', error);
            // Revert optimistic update
            fetchSubjects();
            toast({
                title: "Error",
                description: "Failed to add subject.",
                variant: "destructive"
            });
            throw error;
        }
    };

    const deleteSubject = async (id: string) => {
        try {
            // Optimistic update
            setSubjects(prev => prev.filter(s => s.id !== id));

            await SubjectService.deleteSubject(id);

            toast({
                title: "Success",
                description: "Subject deleted successfully.",
            });
        } catch (error) {
            console.error('Error deleting subject:', error);
            // Revert optimistic update
            fetchSubjects();
            toast({
                title: "Error",
                description: "Failed to delete subject.",
                variant: "destructive"
            });
            throw error;
        }
    };

    return {
        subjects,
        loading,
        addSubject,
        deleteSubject,
        refreshSubjects: fetchSubjects
    };
};
