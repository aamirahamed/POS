-- Skill ledger: terms that job ads ask for and Aamir's CVs don't yet back up.
-- Claude Code records them while tailoring applications (MCP record_skill_gaps);
-- Aamir reviews them in the Job Tracker's Skills tab (done it / not done /
-- learning / don't claim) and approves CV wording that later builds reuse.

CREATE TABLE IF NOT EXISTS public.skill_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    term text NOT NULL,
    term_key text NOT NULL, -- normalised term for matching
    aliases text[] NOT NULL DEFAULT '{}',
    category text NOT NULL DEFAULT 'other' CHECK (category IN ('method', 'technique', 'tool', 'domain', 'credential', 'experience', 'other')),
    kind text NOT NULL DEFAULT 'buildable' CHECK (kind IN ('buildable', 'fixed')),
    status text NOT NULL DEFAULT 'unreviewed' CHECK (status IN (
        'unreviewed',        -- found in an ad, waiting for Aamir
        'confirmed',         -- Aamir has done it and gave evidence; Claude drafts wording next
        'wording_proposed',  -- Claude's draft wording waits for Aamir's approval
        'approved',          -- usable in every CV build
        'not_done',          -- a real gap
        'learning',          -- a real gap he is working on
        'dont_claim',        -- never put on a CV
        'resolved_wording'   -- already on the CV under another name (mapped_to)
    )),
    mapped_to text,          -- for resolved_wording: the CV term that covers it
    evidence_where text,
    evidence_what text,
    evidence_result text,
    proposed_wording text,
    approved_wording text,
    interview_line text,     -- how to handle it in an interview while it stays a gap
    bg_req_key text,         -- matching Brain Gym market requirement, if any
    first_seen_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, term_key)
);

-- One row per term per job: where the ask came from and how much it mattered.
CREATE TABLE IF NOT EXISTS public.skill_sightings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ledger_id uuid NOT NULL REFERENCES public.skill_ledger(id) ON DELETE CASCADE,
    job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
    company text,
    role text,
    quote text,
    importance text NOT NULL DEFAULT 'meaningful' CHECK (importance IN ('critical', 'high', 'meaningful', 'nice')),
    match text NOT NULL DEFAULT 'missing' CHECK (match IN ('missing', 'partial')),
    source text NOT NULL DEFAULT 'build' CHECK (source IN ('build', 'career-ops')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS skill_sightings_ledger_job_key ON public.skill_sightings(ledger_id, job_id) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_skill_ledger_user ON public.skill_ledger(user_id, status);
CREATE INDEX IF NOT EXISTS idx_skill_sightings_job ON public.skill_sightings(job_id);

ALTER TABLE public.skill_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_sightings ENABLE ROW LEVEL SECURITY;

-- The app reviews and edits entries; Claude inserts through the MCP server (service role).
CREATE POLICY "Users read their own skills" ON public.skill_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update their own skills" ON public.skill_ledger FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete their own skills" ON public.skill_ledger FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users read their own skill sightings" ON public.skill_sightings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users delete their own skill sightings" ON public.skill_sightings FOR DELETE USING (auth.uid() = user_id);
