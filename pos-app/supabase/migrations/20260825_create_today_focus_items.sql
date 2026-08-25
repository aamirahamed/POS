CREATE TABLE IF NOT EXISTS today_focus_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    is_manual BOOLEAN DEFAULT false,
    lifemap_node_id TEXT,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    notes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS policies
ALTER TABLE today_focus_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own focus items"
    ON today_focus_items
    FOR ALL
    USING (auth.uid() = user_id);
