import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Job, JobActivity, JobInterview, JobOffer, JobStatus } from '../modules/job-tracker/types';

interface JobTrackerState {
    jobs: Job[];
    loading: boolean;
    error: string | null;

    // Actions
    fetchJobs: () => Promise<void>;
    addJob: (job: Omit<Job, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
    updateJob: (id: string, updates: Partial<Job>) => Promise<void>;
    deleteJob: (id: string) => Promise<void>;
    updateJobStatus: (id: string, status: JobStatus) => Promise<void>; // Simplified status update
    togglePriority: (id: string) => Promise<void>;

    // Activity Actions
    addActivity: (activity: Omit<JobActivity, 'id' | 'user_id' | 'created_at'>) => Promise<void>;

    // Interview Actions
    addInterview: (interview: Omit<JobInterview, 'id' | 'user_id' | 'created_at'>) => Promise<void>;

    // Offer Actions
    addOffer: (offer: Omit<JobOffer, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
}

export const useJobTrackerStore = create<JobTrackerState>((set, get) => ({
    jobs: [],
    loading: false,
    error: null,

    fetchJobs: async () => {
        set({ loading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('jobs')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            set({ jobs: data as Job[] });
        } catch (error: any) {
            set({ error: error.message });
        } finally {
            set({ loading: false });
        }
    },

    addJob: async (jobData) => {
        set({ loading: true, error: null });
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { data, error } = await supabase
                .from('jobs')
                .insert([{ ...jobData, user_id: user.id }])
                .select()
                .single();

            if (error) throw error;
            set((state) => ({ jobs: [data as Job, ...state.jobs] }));
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    updateJob: async (id, updates) => {
        set({ loading: true, error: null });
        try {
            const { error } = await supabase
                .from('jobs')
                .update(updates)
                .eq('id', id);

            if (error) throw error;

            set((state) => ({
                jobs: state.jobs.map((job) =>
                    job.id === id ? { ...job, ...updates } : job
                ),
            }));
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    deleteJob: async (id) => {
        set({ loading: true, error: null });
        try {
            const { error } = await supabase
                .from('jobs')
                .delete()
                .eq('id', id);

            if (error) throw error;

            set((state) => ({
                jobs: state.jobs.filter((job) => job.id !== id),
            }));
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    updateJobStatus: async (id, status) => {
        // Optimistic update
        const previousJobs = get().jobs;
        set((state) => ({
            jobs: state.jobs.map((job) =>
                job.id === id ? { ...job, status } : job
            ),
        }));

        try {
            const { error } = await supabase
                .from('jobs')
                .update({ status })
                .eq('id', id);

            if (error) throw error;

            // Also log this as an activity
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('job_activities').insert({
                    job_id: id,
                    user_id: user.id,
                    type: 'status_change',
                    content: `Moved to ${status}`,
                    activity_date: new Date().toISOString()
                });
            }

        } catch (error: any) {
            // Revert on error
            set({ jobs: previousJobs, error: error.message });
        }
    },

    togglePriority: async (id) => {
        const jobs = get().jobs;
        const job = jobs.find((j) => j.id === id);
        if (!job) return;

        const newPriority = !job.priority;

        // Optimistic update
        set((state) => ({
            jobs: state.jobs.map((j) =>
                j.id === id ? { ...j, priority: newPriority } : j
            ),
        }));

        try {
            const { error } = await supabase
                .from('jobs')
                .update({ priority: newPriority })
                .eq('id', id);

            if (error) throw error;
        } catch (error: any) {
            // Revert on error
            set({ jobs, error: error.message });
        }
    },

    addActivity: async (activity) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { error } = await supabase
                .from('job_activities')
                .insert([{ ...activity, user_id: user.id }]);

            if (error) throw error;
        } catch (error: any) {
            console.error("Failed to add activity", error);
        }
    },

    addInterview: async (interview) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { error } = await supabase
                .from('job_interviews')
                .insert([{ ...interview, user_id: user.id }]);

            if (error) throw error;
        } catch (error: any) {
            console.error("Failed to add interview", error);
            throw error;
        }
    },

    addOffer: async (offer) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { error } = await supabase
                .from('job_offers')
                .insert([{ ...offer, user_id: user.id }]);

            if (error) throw error;
        } catch (error: any) {
            console.error("Failed to add offer", error);
            throw error;
        }
    }
}));
