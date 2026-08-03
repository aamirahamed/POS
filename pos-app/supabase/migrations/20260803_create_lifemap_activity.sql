-- Migration to create lifemap_activity table
CREATE TABLE public.lifemap_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    node_id TEXT,
    task_id TEXT,
    actor TEXT NOT NULL CHECK (actor IN ('me', 'claude')),
    action TEXT NOT NULL,
    detail TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast querying
CREATE INDEX idx_lifemap_activity_user_id ON public.lifemap_activity(user_id);
CREATE INDEX idx_lifemap_activity_node_id ON public.lifemap_activity(node_id);
CREATE INDEX idx_lifemap_activity_created_at ON public.lifemap_activity(created_at DESC);

-- Enable RLS
ALTER TABLE public.lifemap_activity ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage their own activity logs
CREATE POLICY "Users can manage their own lifemap activity" 
    ON public.lifemap_activity 
    FOR ALL USING (auth.uid() = user_id);
