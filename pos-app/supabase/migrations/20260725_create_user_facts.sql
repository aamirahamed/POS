-- Migration: Create user_facts table to store key-value constraints for the AI agent

CREATE TABLE IF NOT EXISTS public.user_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fact_key TEXT NOT NULL,
  fact_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, fact_key)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_facts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own profile facts"
  ON public.user_facts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_facts_user_id ON public.user_facts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_facts_key ON public.user_facts(fact_key);
