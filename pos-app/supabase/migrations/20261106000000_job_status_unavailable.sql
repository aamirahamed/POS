-- Adds an 'unavailable' job status for postings that have closed or been pulled,
-- so they drop out of the board and list without being deleted.
ALTER TABLE "public"."jobs" DROP CONSTRAINT IF EXISTS "jobs_status_check";
ALTER TABLE "public"."jobs"
    ADD CONSTRAINT "jobs_status_check" CHECK (("status" = ANY (ARRAY['wishlist'::"text", 'applied'::"text", 'interviewing'::"text", 'offer'::"text", 'rejected'::"text", 'archived'::"text", 'unavailable'::"text"])));
