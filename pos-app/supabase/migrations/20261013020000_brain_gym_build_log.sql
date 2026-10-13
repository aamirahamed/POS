-- Brain Gym: what the Session Builder did for each agent-built day (modules built, failures, timing),
-- so a missing module can be explained in the app and debugged without server logs.
ALTER TABLE public.bg_days ADD COLUMN IF NOT EXISTS build_log jsonb;
