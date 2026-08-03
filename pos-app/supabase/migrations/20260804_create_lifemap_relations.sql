-- Create lifemap_relations table for tracking dependencies and blocks
CREATE TABLE IF NOT EXISTS public.lifemap_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    relation_type TEXT NOT NULL CHECK (relation_type IN ('blocks', 'depends_on', 'related_to', 'duplicate_of')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, source_id, target_id, relation_type)
);

-- Enable RLS
ALTER TABLE public.lifemap_relations ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own relations
DROP POLICY IF EXISTS "Users can manage their own relations" ON public.lifemap_relations;
CREATE POLICY "Users can manage their own relations"
    ON public.lifemap_relations
    FOR ALL
    USING (auth.uid() = user_id);
