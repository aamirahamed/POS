-- Brain Gym: conversations with the Thinking Coach, one thread per module.
-- Kept so later agents (Coach, Weekly Reviewer) can see where Aamir needed help.

CREATE TABLE IF NOT EXISTS public.bg_coach_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id uuid NOT NULL REFERENCES public.bg_modules(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('user', 'coach')),
    text text NOT NULL,
    -- for coach replies: which kind of nudge, and how strong (1 = lightest)
    move text CHECK (move IN ('question', 'pointer', 'method', 'example', 'feedback', 'concept', 'decline')),
    level integer CHECK (level BETWEEN 1 AND 3),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bg_coach_messages_module ON public.bg_coach_messages(module_id, created_at);

ALTER TABLE public.bg_coach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own coach messages" ON public.bg_coach_messages
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
