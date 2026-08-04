
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
export const getProjectBrief = async (userId: string, nodeId: string) => {
    const { data, error } = await supabase
        .from('lifemap_project_briefs')
        .select('*')
        .eq('user_id', userId)
        .eq('node_id', nodeId)
        .maybeSingle();

    if (error) {
        console.error('Error fetching project brief:', error);
        return null;
    }
    return data;
};

export const updateBriefField = async (userId: string, nodeId: string, field: string, value: any) => {
    const { data: existing } = await supabase
        .from('lifemap_project_briefs')
        .select('id, field_metadata')
        .eq('user_id', userId)
        .eq('node_id', nodeId)
        .maybeSingle();

    if (!existing) {
        // Create skeleton brief
        const metadata = { [field]: { authored_by: 'me', edited_at: new Date().toISOString() } };
        await supabase.from('lifemap_project_briefs').insert([{
            user_id: userId,
            node_id: nodeId,
            [field]: value,
            field_metadata: metadata
        }]);
        return;
    }

    const metadata = existing.field_metadata || {};
    metadata[field] = { authored_by: 'me', edited_at: new Date().toISOString() };

    await supabase.from('lifemap_project_briefs')
        .update({
            [field]: value,
            field_metadata: metadata,
            updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
        
    // Log history
    await supabase.from('lifemap_brief_history').insert([{
        user_id: userId,
        node_id: nodeId,
        field,
        new_value: value,
        actor: 'me',
        reason: 'Manual edit'
    }]);
};

export const getBriefSuggestions = async (userId: string, nodeId: string) => {
    const { data } = await supabase
        .from('lifemap_brief_suggestions')
        .select('*')
        .eq('user_id', userId)
        .eq('node_id', nodeId)
        .eq('status', 'pending');
    return data || [];
};

export const resolveBriefSuggestion = async (suggestionId: string, accept: boolean) => {
    const { data: suggestion } = await supabase
        .from('lifemap_brief_suggestions')
        .select('*')
        .eq('id', suggestionId)
        .single();
        
    if (!suggestion) return;
    
    if (!accept) {
        await supabase.from('lifemap_brief_suggestions').update({ status: 'rejected' }).eq('id', suggestionId);
        return;
    }
    
    const { data: brief } = await supabase
        .from('lifemap_project_briefs')
        .select('id, field_metadata')
        .eq('node_id', suggestion.node_id)
        .single();
        
    if (brief) {
        const metadata = brief.field_metadata || {};
        metadata[suggestion.field] = { authored_by: 'me', edited_at: new Date().toISOString() };
        
        await supabase.from('lifemap_project_briefs')
            .update({ 
                [suggestion.field]: suggestion.suggested_value,
                field_metadata: metadata,
                updated_at: new Date().toISOString()
            })
            .eq('id', brief.id);
            
        await supabase.from('lifemap_brief_history').insert([{
            node_id: suggestion.node_id,
            user_id: suggestion.user_id,
            field: suggestion.field,
            new_value: suggestion.suggested_value,
            actor: 'me', // User accepted it
            reason: 'Accepted agent suggestion'
        }]);
    }
    
    await supabase.from('lifemap_brief_suggestions').update({ status: 'accepted' }).eq('id', suggestionId);
};
