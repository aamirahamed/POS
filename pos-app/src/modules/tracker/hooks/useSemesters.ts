import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Semester } from '../types/database';

export const useSemesters = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [currentSemester, setCurrentSemester] = useState<Semester | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSemesters = async () => {
    try {
      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .order('name');

      if (error) throw error;

      setSemesters(data || []);
      const current = data?.find(s => s.is_current) || null;
      setCurrentSemester(current);
    } catch (error) {
      console.error('Error fetching semesters:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSemesters();
  }, []);

  return {
    semesters,
    currentSemester,
    loading
  };
};