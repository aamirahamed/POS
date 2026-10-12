-- Brain Gym, phase 1: the 60-day program, its days, modules and attempts.
-- Streaks, freezes and missed days are derived in app code from these rows, never stored.

CREATE TABLE IF NOT EXISTS public.bg_programs (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    start_date date NOT NULL,
    length_days integer NOT NULL DEFAULT 60 CHECK (length_days > 0),
    timezone text NOT NULL DEFAULT 'Australia/Melbourne',
    freezes_per_week integer NOT NULL DEFAULT 1 CHECK (freezes_per_week >= 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bg_days (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day_date date NOT NULL,
    day_kind text NOT NULL CHECK (day_kind IN ('weekday', 'saturday', 'sunday')),
    -- 'sample' = placeholder content (phase 1); 'agent' = built by the Session Builder (phase 2+)
    source text NOT NULL DEFAULT 'sample' CHECK (source IN ('sample', 'agent')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, day_date)
);

CREATE TABLE IF NOT EXISTS public.bg_modules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    day_id uuid NOT NULL REFERENCES public.bg_days(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module_key text NOT NULL CHECK (module_key IN (
        'recall', 'ai_briefing', 'interview_rep', 'think', 'numbers', 'lesson', 'history', 'close',
        'mock_interview', 'weekly_review', 'teardown'
    )),
    position integer NOT NULL,
    title text NOT NULL,
    minutes integer,
    content jsonb NOT NULL DEFAULT '{}'::jsonb,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (day_id, module_key)
);

CREATE TABLE IF NOT EXISTS public.bg_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id uuid NOT NULL REFERENCES public.bg_modules(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    response jsonb NOT NULL,
    score numeric,
    feedback jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bg_days_user_date ON public.bg_days(user_id, day_date);
CREATE INDEX IF NOT EXISTS idx_bg_modules_day ON public.bg_modules(day_id);
CREATE INDEX IF NOT EXISTS idx_bg_modules_user ON public.bg_modules(user_id);
CREATE INDEX IF NOT EXISTS idx_bg_attempts_module ON public.bg_attempts(module_id);

ALTER TABLE public.bg_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bg_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bg_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bg_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own brain gym program" ON public.bg_programs
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage their own brain gym days" ON public.bg_days
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage their own brain gym modules" ON public.bg_modules
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage their own brain gym attempts" ON public.bg_attempts
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
