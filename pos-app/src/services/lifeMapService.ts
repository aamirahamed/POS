
import { supabase } from '@/lib/supabase';
import { LifeMapNode } from '@/types/lifemap';
import { Edge } from '@xyflow/react';

export const saveLifeMap = async (userId: string, nodes: LifeMapNode[], edges: Edge[]) => {
    // Check if map exists
    const { data: existing } = await supabase
        .from('life_maps')
        .select('id')
        .eq('user_id', userId)
        .single();

    if (existing) {
        const { error } = await supabase
            .from('life_maps')
            .update({ nodes, edges, updated_at: new Date().toISOString() })
            .eq('id', existing.id);

        if (error) console.error('Error saving map:', error);
    } else {
        const { error } = await supabase
            .from('life_maps')
            .insert({ user_id: userId, nodes, edges });

        if (error) console.error('Error creating map:', error);
    }
};

export const fetchLifeMap = async (userId: string) => {
    const { data, error } = await supabase
        .from('life_maps')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error) {
        if (error.code !== 'PGRST116') { // PGRST116 is "Row not found"
            console.error('Error fetching map:', error);
        }
        return null;
    }
    return data;
};
