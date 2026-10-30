-- Full career-ops evaluation for a job: the report markdown and a parsed
-- summary (decision, legitimacy, strengths, gaps, hard stops). Written by the
-- MCP server, which reads the report file from the local career-ops data folder.

ALTER TABLE "public"."jobs"
    ADD COLUMN IF NOT EXISTS "report_md" "text",
    ADD COLUMN IF NOT EXISTS "evaluation" "jsonb";
