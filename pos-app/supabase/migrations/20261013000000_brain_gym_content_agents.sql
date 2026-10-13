-- Brain Gym phase 2: state for the content agents.

-- Multi-day series for the Lesson and History modules. The Session Builder plans a syllabus once,
-- then writes the next part each day.
CREATE TABLE IF NOT EXISTS public.bg_series (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('lesson', 'history')),
    name text NOT NULL,
    status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'active', 'done')),
    position integer NOT NULL DEFAULT 0, -- order in the queue
    syllabus jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{ part, title, focus }]
    next_part integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, kind, name)
);

-- News items already used in a briefing, so the same story never appears twice
CREATE TABLE IF NOT EXISTS public.bg_news_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url text NOT NULL,
    title text NOT NULL,
    source text,
    published_at timestamptz,
    used_on date NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, url)
);

CREATE INDEX IF NOT EXISTS idx_bg_series_user ON public.bg_series(user_id, kind, status, position);
CREATE INDEX IF NOT EXISTS idx_bg_news_items_user ON public.bg_news_items(user_id, used_on);

ALTER TABLE public.bg_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bg_news_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own brain gym series" ON public.bg_series
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage their own brain gym news items" ON public.bg_news_items
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
