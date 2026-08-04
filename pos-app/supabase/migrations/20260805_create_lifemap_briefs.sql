-- Migration to create lifemap project briefs tables

CREATE TABLE IF NOT EXISTS public.lifemap_project_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Identity
    name TEXT,
    one_liner TEXT,
    tagline TEXT,
    stage TEXT,
    started_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    
    -- Substance
    problem TEXT,
    what_it_does TEXT,
    how_it_works TEXT,
    constraints TEXT,
    non_goals TEXT,
    my_role TEXT,
    
    -- Lists (JSONB)
    audiences JSONB DEFAULT '[]'::jsonb,
    features JSONB DEFAULT '[]'::jsonb,
    stack JSONB DEFAULT '[]'::jsonb,
    notable_decisions JSONB DEFAULT '[]'::jsonb,
    learnings JSONB DEFAULT '[]'::jsonb,
    outcomes JSONB DEFAULT '[]'::jsonb,
    links JSONB DEFAULT '[]'::jsonb,
    media JSONB DEFAULT '[]'::jsonb,
    
    -- Meta
    field_metadata JSONB DEFAULT '{}'::jsonb,
    last_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Revision History Table
CREATE TABLE IF NOT EXISTS public.lifemap_brief_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id TEXT NOT NULL REFERENCES public.lifemap_project_briefs(node_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    field TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    actor TEXT NOT NULL CHECK (actor IN ('me', 'claude')),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Pending Suggestions Table
CREATE TABLE IF NOT EXISTS public.lifemap_brief_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id TEXT NOT NULL REFERENCES public.lifemap_project_briefs(node_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    field TEXT NOT NULL,
    suggested_value JSONB,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_briefs_user ON public.lifemap_project_briefs(user_id);
CREATE INDEX IF NOT EXISTS idx_briefs_history_node ON public.lifemap_brief_history(node_id);
CREATE INDEX IF NOT EXISTS idx_briefs_suggestions_node ON public.lifemap_brief_suggestions(node_id);

-- Enable RLS
ALTER TABLE public.lifemap_project_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifemap_brief_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifemap_brief_suggestions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users manage their own briefs" ON public.lifemap_project_briefs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage their own brief history" ON public.lifemap_brief_history
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage their own brief suggestions" ON public.lifemap_brief_suggestions
    FOR ALL USING (auth.uid() = user_id);
