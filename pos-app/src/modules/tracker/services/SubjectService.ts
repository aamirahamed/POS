
import { supabase } from '../../../lib/supabase';


export interface Subject {
    id: string;
    user_id: string;
    name: string;
    color?: string;
    created_at: string;
}

export const SubjectService = {
    async getSubjects() {
        const { data, error } = await supabase
            .from('subjects')
            .select('*')
            .order('name');

        if (error) throw error;
        return data as Subject[];
    },

    async addSubject(name: string, color?: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('subjects')
            .insert({
                user_id: user.id,
                name,
                color
            })
            .select()
            .single();

        if (error) throw error;
        return data as Subject;
    },

    async deleteSubject(id: string) {
        const { error } = await supabase
            .from('subjects')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
