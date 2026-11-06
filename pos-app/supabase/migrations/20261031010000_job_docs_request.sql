-- Application documents (tailored CV + brochure cover letter) requested from
-- the job page. POS queues the request; Claude Code picks it up through the
-- MCP server (list_doc_requests), builds the files locally in the portfolio
-- repo and writes the status and file paths back (update_doc_request).

ALTER TABLE "public"."jobs"
    ADD COLUMN IF NOT EXISTS "docs_status" "text",
    ADD COLUMN IF NOT EXISTS "docs_note" "text",
    ADD COLUMN IF NOT EXISTS "docs_review_first" boolean DEFAULT true NOT NULL,
    ADD COLUMN IF NOT EXISTS "docs_requested_at" timestamp with time zone,
    ADD COLUMN IF NOT EXISTS "docs_updated_at" timestamp with time zone,
    ADD COLUMN IF NOT EXISTS "docs_message" "text",
    ADD COLUMN IF NOT EXISTS "docs_files" "jsonb";

ALTER TABLE "public"."jobs"
    ADD CONSTRAINT "jobs_docs_status_check" CHECK (("docs_status" IS NULL) OR ("docs_status" = ANY (ARRAY['requested'::"text", 'in_progress'::"text", 'waiting_on_you'::"text", 'ready'::"text", 'failed'::"text"])));

CREATE INDEX IF NOT EXISTS "jobs_docs_status_idx" ON "public"."jobs" USING "btree" ("user_id", "docs_status") WHERE ("docs_status" IS NOT NULL);
