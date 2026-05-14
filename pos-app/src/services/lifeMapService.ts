
import { supabase } from '@/lib/supabase';
import { LifeMapNode } from '@/types/lifemap';
import { Edge } from '@xyflow/react';

// ─── File Upload ────────────────────────────────────────────────────────────────
export const uploadResourceFile = async (userId: string, nodeId: string, file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `${userId}/${nodeId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
        .from('life-map-resources')
        .upload(path, file, { upsert: false });
    if (error) { console.error('Upload error:', error); return null; }
    const { data } = supabase.storage.from('life-map-resources').getPublicUrl(path);
    return data.publicUrl;
};

export const deleteResourceFile = async (publicUrl: string): Promise<void> => {
    // Extract path from public URL
    const url = new URL(publicUrl);
    const pathParts = url.pathname.split('/life-map-resources/');
    if (pathParts.length < 2) return;
    const path = pathParts[1];
    const { error } = await supabase.storage.from('life-map-resources').remove([path]);
    if (error) console.error('Delete error:', error);
};

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
