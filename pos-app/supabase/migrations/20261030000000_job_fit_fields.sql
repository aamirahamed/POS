-- Fit assessment fields for roles found and scored by career-ops.
-- career-ops writes these through the MCP server (upsert_jobs); POS owns
-- status, priority and notes once a role exists.

ALTER TABLE "public"."jobs"
    ADD COLUMN IF NOT EXISTS "fit_score" numeric(2,1),
    ADD COLUMN IF NOT EXISTS "fit_verdict" "text",
    ADD COLUMN IF NOT EXISTS "archetype" "text",
    ADD COLUMN IF NOT EXISTS "fit_notes" "text",
    ADD COLUMN IF NOT EXISTS "cv_pick" "text",
    ADD COLUMN IF NOT EXISTS "report_path" "text",
    ADD COLUMN IF NOT EXISTS "posted_at" date,
    ADD COLUMN IF NOT EXISTS "fit_updated_at" timestamp with time zone;

ALTER TABLE "public"."jobs"
    ADD CONSTRAINT "jobs_fit_score_check" CHECK (("fit_score" IS NULL) OR (("fit_score" >= 0) AND ("fit_score" <= 5))),
    ADD CONSTRAINT "jobs_fit_verdict_check" CHECK (("fit_verdict" IS NULL) OR ("fit_verdict" = ANY (ARRAY['PASS'::"text", 'MARGINAL'::"text", 'FAIL'::"text", 'SKIP'::"text"])));

-- One row per posting URL per user, so repeated scans update instead of duplicating.
-- Fails (and rolls back this migration) if duplicate URLs already exist.
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_user_url_key" ON "public"."jobs" USING "btree" ("user_id", "url") WHERE ("url" IS NOT NULL);
