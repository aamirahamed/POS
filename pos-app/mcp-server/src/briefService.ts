import { supabase, MCP_USER_ID } from './supabase.js';
import { logActivity } from './lifemapService.js';

export const createProjectBrief = async (nodeId: string, fields: any) => {
    const { data: existing } = await supabase
        .from('lifemap_project_briefs')
        .select('id')
        .eq('node_id', nodeId)
        .eq('user_id', MCP_USER_ID)
        .maybeSingle();

    if (existing) {
        throw new Error(`A brief already exists for node ${nodeId}. Use update_project_brief instead.`);
    }

    const field_metadata: Record<string, any> = {};
    for (const key of Object.keys(fields)) {
        field_metadata[key] = { authored_by: 'claude', edited_at: new Date().toISOString() };
    }

    const { error } = await supabase
        .from('lifemap_project_briefs')
        .insert([{
            node_id: nodeId,
            user_id: MCP_USER_ID,
            ...fields,
            field_metadata
        }]);

    if (error) throw new Error(`Failed to create brief: ${error.message}`);
    
    // Log history for each field
    const historyEntries = Object.keys(fields).map(field => ({
        node_id: nodeId,
        user_id: MCP_USER_ID,
        field,
        new_value: fields[field],
        actor: 'claude',
        reason: 'Initial creation'
    }));
    
    if (historyEntries.length > 0) {
        await supabase.from('lifemap_brief_history').insert(historyEntries);
    }
    
    await logActivity(nodeId, null, 'claude', 'brief_created', `Created project brief`);
    return true;
};

export const updateProjectBrief = async (nodeId: string, fields: any, reason?: string) => {
    const { data: brief, error: fetchErr } = await supabase
        .from('lifemap_project_briefs')
        .select('*')
        .eq('node_id', nodeId)
        .eq('user_id', MCP_USER_ID)
        .maybeSingle();

    if (fetchErr) throw new Error(`Failed to fetch brief: ${fetchErr.message}`);
    if (!brief) throw new Error(`No brief found for node ${nodeId}. Use create_project_brief first.`);

    const metadata = brief.field_metadata || {};
    const appliedUpdates: any = {};
    const queuedSuggestions: string[] = [];
    const historyEntries: any[] = [];
    const suggestionEntries: any[] = [];

    for (const [key, value] of Object.entries(fields)) {
        const meta = metadata[key] || {};
        
        // Check stickiness rule
        if (meta.authored_by === 'me') {
            queuedSuggestions.push(key);
            suggestionEntries.push({
                node_id: nodeId,
                user_id: MCP_USER_ID,
                field: key,
                suggested_value: value,
                reason: reason || 'Agent suggestion'
            });
        } else {
            appliedUpdates[key] = value;
            metadata[key] = { authored_by: 'claude', edited_at: new Date().toISOString() };
            historyEntries.push({
                node_id: nodeId,
                user_id: MCP_USER_ID,
                field: key,
                old_value: brief[key],
                new_value: value,
                actor: 'claude',
                reason: reason || 'Agent update'
            });
        }
    }

    if (Object.keys(appliedUpdates).length > 0) {
        appliedUpdates.field_metadata = metadata;
        appliedUpdates.updated_at = new Date().toISOString();
        
        const { error: updErr } = await supabase
            .from('lifemap_project_briefs')
            .update(appliedUpdates)
            .eq('id', brief.id);
            
        if (updErr) throw new Error(`Failed to update brief: ${updErr.message}`);
        
        if (historyEntries.length > 0) {
            await supabase.from('lifemap_brief_history').insert(historyEntries);
        }
    }

    if (suggestionEntries.length > 0) {
        await supabase.from('lifemap_brief_suggestions').insert(suggestionEntries);
    }

    await logActivity(nodeId, null, 'claude', 'brief_updated', `Updated brief fields: ${Object.keys(appliedUpdates).join(', ')}`);
    
    return {
        applied: Object.keys(appliedUpdates).filter(k => k !== 'field_metadata' && k !== 'updated_at'),
        queued: queuedSuggestions
    };
};

export const appendToBriefList = async (nodeId: string, listName: string, item: any, externalKey?: string) => {
    const { data } = await supabase
        .from('lifemap_project_briefs')
        .select(`id, ${listName}`)
        .eq('node_id', nodeId)
        .eq('user_id', MCP_USER_ID)
        .maybeSingle();
        
    const brief = data as any;
        
    if (!brief) throw new Error(`No brief found for node ${nodeId}.`);
    
    const currentList = Array.isArray(brief[listName]) ? brief[listName] : [];
    
    if (externalKey) {
        const exists = currentList.some((i: any) => i.external_key === externalKey);
        if (exists) return { status: 'ignored', message: 'Item with external_key already exists' };
    }
    
    const newList = [...currentList, item];
    
    const { error } = await supabase
        .from('lifemap_project_briefs')
        .update({ [listName]: newList, updated_at: new Date().toISOString() })
        .eq('id', brief.id);
        
    if (error) throw new Error(`Failed to append to ${listName}: ${error.message}`);
    
    await supabase.from('lifemap_brief_history').insert([{
        node_id: nodeId,
        user_id: MCP_USER_ID,
        field: listName,
        old_value: currentList,
        new_value: newList,
        actor: 'claude',
        reason: 'Appended item to list'
    }]);
    
    return { status: 'appended', message: `Appended item to ${listName}` };
};

export const resolveBriefSuggestion = async (suggestionId: string, accept: boolean) => {
    const { data: suggestion, error } = await supabase
        .from('lifemap_brief_suggestions')
        .select('*')
        .eq('id', suggestionId)
        .eq('user_id', MCP_USER_ID)
        .single();
        
    if (error || !suggestion) throw new Error(`Suggestion not found`);
    if (suggestion.status !== 'pending') throw new Error(`Suggestion already ${suggestion.status}`);
    
    if (!accept) {
        await supabase.from('lifemap_brief_suggestions').update({ status: 'rejected' }).eq('id', suggestionId);
        return { status: 'rejected' };
    }
    
    // Accept logic - we apply it directly to the brief as 'me' since the user accepted it.
    const { data: brief } = await supabase
        .from('lifemap_project_briefs')
        .select('*')
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
            user_id: MCP_USER_ID,
            field: suggestion.field,
            old_value: brief[suggestion.field],
            new_value: suggestion.suggested_value,
            actor: 'me', // User accepted it
            reason: 'Accepted agent suggestion'
        }]);
    }
    
    await supabase.from('lifemap_brief_suggestions').update({ status: 'accepted' }).eq('id', suggestionId);
    return { status: 'accepted' };
};

// READ API
export const getProjectBrief = async (nodeId: string, sections?: string[]) => {
    let query = supabase.from('lifemap_project_briefs').select('*').eq('node_id', nodeId).eq('user_id', MCP_USER_ID).maybeSingle();
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data) return null;
    
    if (sections && sections.length > 0) {
        const filtered: any = {};
        for (const sec of sections) {
            if (data[sec] !== undefined) filtered[sec] = data[sec];
        }
        return filtered;
    }
    return data;
};

export const searchBriefs = async (queryStr: string) => {
    // In a real production app with pg_trgm this would use textSearch.
    // For now we'll do a basic ilike over a few key fields.
    const { data, error } = await supabase
        .from('lifemap_project_briefs')
        .select('node_id, name, one_liner, problem, what_it_does, stage')
        .eq('user_id', MCP_USER_ID)
        .or(`name.ilike.%${queryStr}%,one_liner.ilike.%${queryStr}%,problem.ilike.%${queryStr}%,what_it_does.ilike.%${queryStr}%`);
        
    if (error) throw new Error(error.message);
    return data;
};

export const getBriefHistory = async (nodeId: string, field?: string) => {
    let query = supabase.from('lifemap_brief_history').select('*').eq('node_id', nodeId).eq('user_id', MCP_USER_ID).order('created_at', { ascending: false });
    if (field) query = query.eq('field', field);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
};

export const listProjectBriefs = async () => {
    const { data, error } = await supabase
        .from('lifemap_project_briefs')
        .select('node_id, name, one_liner, stage, stack')
        .eq('user_id', MCP_USER_ID);
        
    if (error) throw new Error(error.message);
    return data;
};

export const renderBrief = async (nodeId: string, variant: string) => {
    const brief = await getProjectBrief(nodeId);
    if (!brief) throw new Error(`Brief not found for node ${nodeId}`);
    
    // Fallback overrides
    const getField = (field: string) => {
        if (brief.field_metadata?.[field]?.portfolio_override) {
            return brief.field_metadata[field].portfolio_override;
        }
        return brief[field];
    };
    
    if (variant === 'elevator') {
        return `${getField('name')}: ${getField('one_liner')}\n\n${getField('what_it_does') || ''}`;
    }
    
    if (variant === 'cv_entry') {
        const name = getField('name') || 'Unnamed Project';
        const role = getField('my_role') || 'Role not specified';
        const started = getField('started_at') ? new Date(getField('started_at')).getFullYear() : '';
        const shipped = getField('shipped_at') ? new Date(getField('shipped_at')).getFullYear() : 'Present';
        const dates = started ? `${started} - ${shipped}` : shipped;
        const stackList = (getField('stack') || []).map((s: any) => s.name).join(', ');
        
        const outcomes = (getField('outcomes') || []).map((o: any) => `- ${o.metric}: ${o.value} (as of ${o.as_of})`);
        const decisions = (getField('notable_decisions') || []).map((d: any) => `- ${d.decision}: ${d.why}`);
        
        let md = `### ${name} | ${role} | ${dates}\n*Stack: ${stackList}*\n\n`;
        if (outcomes.length) md += `**Key Outcomes:**\n${outcomes.slice(0, 2).join('\n')}\n\n`;
        if (decisions.length) md += `**Key Decisions:**\n${decisions.slice(0, 2).join('\n')}\n`;
        
        return md;
    }
    
    if (variant === 'agent_context') {
        return JSON.stringify({
            name: brief.name,
            one_liner: brief.one_liner,
            stage: brief.stage,
            problem: brief.problem,
            features: (brief.features || []).map((f: any) => `${f.name} (${f.status})`),
            decisions: (brief.notable_decisions || []).map((d: any) => d.decision)
        });
    }
    
    if (variant === 'portfolio') {
        let md = `# ${getField('name')}\n> ${getField('one_liner')}\n\n`;
        md += `**Stage:** ${getField('stage') || 'Unknown'}\n\n`;
        
        if (getField('problem')) md += `## The Problem\n${getField('problem')}\n\n`;
        if (getField('what_it_does')) md += `## What It Does\n${getField('what_it_does')}\n\n`;
        if (getField('how_it_works')) md += `## How It Works\n${getField('how_it_works')}\n\n`;
        
        const features = getField('features') || [];
        if (features.length) {
            md += `## Features\n`;
            features.forEach((f: any) => {
                md += `- **${f.name}** (${f.status}): ${f.description}\n`;
            });
            md += '\n';
        }
        
        const links = getField('links') || [];
        if (links.length) {
            md += `## Links\n`;
            links.forEach((l: any) => {
                md += `- [${l.label}](${l.url}) (${l.type})\n`;
            });
        }
        return md;
    }
    
    throw new Error(`Unknown variant: ${variant}`);
};
