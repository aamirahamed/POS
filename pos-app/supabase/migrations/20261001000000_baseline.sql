-- Baseline schema for POS, dumped from the live Supabase project on 2026-10-01.
-- Replaces the earlier partial migrations (see git history before this commit).
-- All later schema changes go in new migration files after this one.




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bank_accounts" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "connection_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "institution_name" "text" NOT NULL,
    "account_number" "text",
    "type" "text" DEFAULT 'transaction'::"text",
    "currency" "text" DEFAULT 'AUD'::"text",
    "balance" numeric(12,2) DEFAULT 0,
    "last_synced_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bank_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bank_transactions" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "account_id" "text" NOT NULL,
    "account_name" "text",
    "date" "date" NOT NULL,
    "datetime" timestamp with time zone,
    "amount" numeric(12,2) NOT NULL,
    "direction" "text" NOT NULL,
    "description" "text",
    "merchant_name" "text",
    "category" "text" DEFAULT 'Other'::"text",
    "raw_category" "text",
    "status" "text" DEFAULT 'posted'::"text",
    "is_income" boolean GENERATED ALWAYS AS (("direction" = 'credit'::"text")) STORED,
    "is_spending" boolean GENERATED ALWAYS AS (("direction" = 'debit'::"text")) STORED,
    "synced_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bank_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calendar_events" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "duration_hrs" numeric NOT NULL,
    "source" "text" DEFAULT 'Google Calendar'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."calendar_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calendar_sync_meta" (
    "user_id" "uuid" NOT NULL,
    "last_fetched" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."calendar_sync_meta" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."category_corrections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "merchant_key" "text" NOT NULL,
    "category" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."category_corrections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_activities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "content" "text",
    "activity_date" timestamp with time zone DEFAULT "now"(),
    "is_completed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "job_activities_type_check" CHECK (("type" = ANY (ARRAY['note'::"text", 'status_change'::"text", 'follow_up'::"text"])))
);


ALTER TABLE "public"."job_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_interviews" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "round_number" integer NOT NULL,
    "interview_date" timestamp with time zone,
    "notes" "text",
    "outcome" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "job_interviews_outcome_check" CHECK (("outcome" = ANY (ARRAY['pending'::"text", 'pass'::"text", 'fail'::"text"])))
);


ALTER TABLE "public"."job_interviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_offers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "salary" "text",
    "start_date" "date",
    "deadline" "date",
    "notes" "text",
    "status" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "job_offers_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text"])))
);


ALTER TABLE "public"."job_offers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "company" "text" NOT NULL,
    "role" "text" NOT NULL,
    "status" "text" NOT NULL,
    "location" "text",
    "work_mode" "text",
    "employment_type" "text",
    "source" "text",
    "salary_range" "text",
    "url" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "description" "text",
    "priority" boolean DEFAULT false,
    CONSTRAINT "jobs_employment_type_check" CHECK (("employment_type" = ANY (ARRAY['full-time'::"text", 'part-time'::"text", 'contract'::"text", 'intern'::"text", 'unknown'::"text"]))),
    CONSTRAINT "jobs_status_check" CHECK (("status" = ANY (ARRAY['wishlist'::"text", 'applied'::"text", 'interviewing'::"text", 'offer'::"text", 'rejected'::"text", 'archived'::"text"]))),
    CONSTRAINT "jobs_work_mode_check" CHECK (("work_mode" = ANY (ARRAY['remote'::"text", 'hybrid'::"text", 'onsite'::"text", 'unknown'::"text"])))
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_maps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nodes" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "edges" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."life_maps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lifemap_activity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "node_id" "text",
    "task_id" "text",
    "actor" "text" NOT NULL,
    "action" "text" NOT NULL,
    "detail" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "lifemap_activity_actor_check" CHECK (("actor" = ANY (ARRAY['me'::"text", 'claude'::"text"])))
);


ALTER TABLE "public"."lifemap_activity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lifemap_brief_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "node_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "field" "text" NOT NULL,
    "old_value" "jsonb",
    "new_value" "jsonb",
    "actor" "text" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "lifemap_brief_history_actor_check" CHECK (("actor" = ANY (ARRAY['me'::"text", 'claude'::"text"])))
);


ALTER TABLE "public"."lifemap_brief_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lifemap_brief_suggestions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "node_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "field" "text" NOT NULL,
    "suggested_value" "jsonb",
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "lifemap_brief_suggestions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."lifemap_brief_suggestions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lifemap_project_briefs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "node_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text",
    "one_liner" "text",
    "tagline" "text",
    "stage" "text",
    "started_at" timestamp with time zone,
    "shipped_at" timestamp with time zone,
    "problem" "text",
    "what_it_does" "text",
    "how_it_works" "text",
    "constraints" "text",
    "non_goals" "text",
    "my_role" "text",
    "audiences" "jsonb" DEFAULT '[]'::"jsonb",
    "features" "jsonb" DEFAULT '[]'::"jsonb",
    "stack" "jsonb" DEFAULT '[]'::"jsonb",
    "notable_decisions" "jsonb" DEFAULT '[]'::"jsonb",
    "learnings" "jsonb" DEFAULT '[]'::"jsonb",
    "outcomes" "jsonb" DEFAULT '[]'::"jsonb",
    "links" "jsonb" DEFAULT '[]'::"jsonb",
    "media" "jsonb" DEFAULT '[]'::"jsonb",
    "field_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "last_reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lifemap_project_briefs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lifemap_relations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "source_id" "text" NOT NULL,
    "target_id" "text" NOT NULL,
    "relation_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "lifemap_relations_relation_type_check" CHECK (("relation_type" = ANY (ARRAY['blocks'::"text", 'depends_on'::"text", 'related_to'::"text", 'duplicate_of'::"text"])))
);


ALTER TABLE "public"."lifemap_relations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mentor_chat_history" (
    "id" "text" NOT NULL,
    "user_id" "uuid",
    "role" "text" NOT NULL,
    "text" "text" NOT NULL,
    "status_log" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "mentor_chat_history_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text"])))
);


ALTER TABLE "public"."mentor_chat_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mentor_profile_memory" (
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."mentor_profile_memory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reminders" (
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "completed" boolean DEFAULT false,
    "created_at" bigint NOT NULL,
    "category" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "due_date" timestamp with time zone
);


ALTER TABLE "public"."reminders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shopping_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "text" "text" NOT NULL,
    "completed" boolean DEFAULT false,
    "recurring" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."shopping_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subjects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#3b82f6'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."subjects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."today_focus_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text",
    "is_manual" boolean DEFAULT false,
    "lifemap_node_id" "text",
    "added_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "notes" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "completed" boolean DEFAULT false
);


ALTER TABLE "public"."today_focus_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_facts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "fact_key" "text" NOT NULL,
    "fact_value" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_facts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_google_tokens" (
    "user_id" "uuid" NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text",
    "expires_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_google_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wishlist_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "link" "text",
    "price" numeric DEFAULT 0,
    "category" "text",
    "priority_bucket" "text" NOT NULL,
    "notes" "text",
    "status" "text" DEFAULT 'Considering'::"text",
    "score_impact" integer DEFAULT 0,
    "score_urgency" integer DEFAULT 0,
    "score_frequency" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."wishlist_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."yd_shifts" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "duration_hrs" numeric NOT NULL,
    "paid_hrs" numeric NOT NULL,
    "status" "text" NOT NULL,
    "previous_start_time" timestamp with time zone,
    "previous_end_time" timestamp with time zone,
    "previous_duration_hrs" numeric,
    "previous_paid_hrs" numeric,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "yd_shifts_status_check" CHECK (("status" = ANY (ARRAY['unchanged'::"text", 'added'::"text", 'removed'::"text", 'modified'::"text"])))
);


ALTER TABLE "public"."yd_shifts" OWNER TO "postgres";


ALTER TABLE ONLY "public"."bank_accounts"
    ADD CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bank_transactions"
    ADD CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id", "user_id");



ALTER TABLE ONLY "public"."calendar_sync_meta"
    ADD CONSTRAINT "calendar_sync_meta_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."category_corrections"
    ADD CONSTRAINT "category_corrections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."category_corrections"
    ADD CONSTRAINT "category_corrections_user_id_merchant_key_key" UNIQUE ("user_id", "merchant_key");



ALTER TABLE ONLY "public"."job_activities"
    ADD CONSTRAINT "job_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_interviews"
    ADD CONSTRAINT "job_interviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_offers"
    ADD CONSTRAINT "job_offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_maps"
    ADD CONSTRAINT "life_maps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_maps"
    ADD CONSTRAINT "life_maps_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."lifemap_activity"
    ADD CONSTRAINT "lifemap_activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lifemap_brief_history"
    ADD CONSTRAINT "lifemap_brief_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lifemap_brief_suggestions"
    ADD CONSTRAINT "lifemap_brief_suggestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lifemap_project_briefs"
    ADD CONSTRAINT "lifemap_project_briefs_node_id_key" UNIQUE ("node_id");



ALTER TABLE ONLY "public"."lifemap_project_briefs"
    ADD CONSTRAINT "lifemap_project_briefs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lifemap_relations"
    ADD CONSTRAINT "lifemap_relations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lifemap_relations"
    ADD CONSTRAINT "lifemap_relations_user_id_source_id_target_id_relation_type_key" UNIQUE ("user_id", "source_id", "target_id", "relation_type");



ALTER TABLE ONLY "public"."mentor_chat_history"
    ADD CONSTRAINT "mentor_chat_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mentor_profile_memory"
    ADD CONSTRAINT "mentor_profile_memory_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shopping_items"
    ADD CONSTRAINT "shopping_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_user_id_name_key" UNIQUE ("user_id", "name");



ALTER TABLE ONLY "public"."today_focus_items"
    ADD CONSTRAINT "today_focus_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_facts"
    ADD CONSTRAINT "user_facts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_facts"
    ADD CONSTRAINT "user_facts_user_id_fact_key_key" UNIQUE ("user_id", "fact_key");



ALTER TABLE ONLY "public"."user_google_tokens"
    ADD CONSTRAINT "user_google_tokens_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."wishlist_items"
    ADD CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."yd_shifts"
    ADD CONSTRAINT "yd_shifts_pkey" PRIMARY KEY ("id", "user_id");



CREATE INDEX "idx_bank_transactions_account_id" ON "public"."bank_transactions" USING "btree" ("account_id");



CREATE INDEX "idx_bank_transactions_category" ON "public"."bank_transactions" USING "btree" ("category");



CREATE INDEX "idx_bank_transactions_date" ON "public"."bank_transactions" USING "btree" ("date" DESC);



CREATE INDEX "idx_bank_transactions_user_id" ON "public"."bank_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_briefs_history_node" ON "public"."lifemap_brief_history" USING "btree" ("node_id");



CREATE INDEX "idx_briefs_suggestions_node" ON "public"."lifemap_brief_suggestions" USING "btree" ("node_id");



CREATE INDEX "idx_briefs_user" ON "public"."lifemap_project_briefs" USING "btree" ("user_id");



CREATE INDEX "idx_lifemap_activity_created_at" ON "public"."lifemap_activity" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_lifemap_activity_node_id" ON "public"."lifemap_activity" USING "btree" ("node_id");



CREATE INDEX "idx_lifemap_activity_user_id" ON "public"."lifemap_activity" USING "btree" ("user_id");



CREATE INDEX "idx_user_facts_key" ON "public"."user_facts" USING "btree" ("fact_key");



CREATE INDEX "idx_user_facts_user_id" ON "public"."user_facts" USING "btree" ("user_id");



ALTER TABLE ONLY "public"."bank_accounts"
    ADD CONSTRAINT "bank_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bank_transactions"
    ADD CONSTRAINT "bank_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bank_transactions"
    ADD CONSTRAINT "bank_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_sync_meta"
    ADD CONSTRAINT "calendar_sync_meta_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."category_corrections"
    ADD CONSTRAINT "category_corrections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_activities"
    ADD CONSTRAINT "job_activities_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_activities"
    ADD CONSTRAINT "job_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_interviews"
    ADD CONSTRAINT "job_interviews_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_interviews"
    ADD CONSTRAINT "job_interviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_offers"
    ADD CONSTRAINT "job_offers_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_offers"
    ADD CONSTRAINT "job_offers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_maps"
    ADD CONSTRAINT "life_maps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."lifemap_activity"
    ADD CONSTRAINT "lifemap_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lifemap_brief_history"
    ADD CONSTRAINT "lifemap_brief_history_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "public"."lifemap_project_briefs"("node_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lifemap_brief_history"
    ADD CONSTRAINT "lifemap_brief_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lifemap_brief_suggestions"
    ADD CONSTRAINT "lifemap_brief_suggestions_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "public"."lifemap_project_briefs"("node_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lifemap_brief_suggestions"
    ADD CONSTRAINT "lifemap_brief_suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lifemap_project_briefs"
    ADD CONSTRAINT "lifemap_project_briefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lifemap_relations"
    ADD CONSTRAINT "lifemap_relations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mentor_chat_history"
    ADD CONSTRAINT "mentor_chat_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mentor_profile_memory"
    ADD CONSTRAINT "mentor_profile_memory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."shopping_items"
    ADD CONSTRAINT "shopping_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."today_focus_items"
    ADD CONSTRAINT "today_focus_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_facts"
    ADD CONSTRAINT "user_facts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_google_tokens"
    ADD CONSTRAINT "user_google_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlist_items"
    ADD CONSTRAINT "wishlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."yd_shifts"
    ADD CONSTRAINT "yd_shifts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "System can insert transactions" ON "public"."bank_transactions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete activities for their jobs" ON "public"."job_activities" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete interviews for their jobs" ON "public"."job_interviews" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete offers for their jobs" ON "public"."job_offers" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own jobs" ON "public"."jobs" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own reminders" ON "public"."reminders" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own subjects" ON "public"."subjects" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own wishlist items" ON "public"."wishlist_items" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert activities for their jobs" ON "public"."job_activities" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert interviews for their jobs" ON "public"."job_interviews" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert offers for their jobs" ON "public"."job_offers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own google token" ON "public"."user_google_tokens" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own jobs" ON "public"."jobs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own life map" ON "public"."life_maps" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own reminders" ON "public"."reminders" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own subjects" ON "public"."subjects" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own wishlist items" ON "public"."wishlist_items" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own YD shifts" ON "public"."yd_shifts" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own bank accounts" ON "public"."bank_accounts" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own calendar events" ON "public"."calendar_events" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own category corrections" ON "public"."category_corrections" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own focus items" ON "public"."today_focus_items" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own lifemap activity" ON "public"."lifemap_activity" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own mentor chat history" ON "public"."mentor_chat_history" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own profile facts" ON "public"."user_facts" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own profile memory" ON "public"."mentor_profile_memory" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own relations" ON "public"."lifemap_relations" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own shopping items" ON "public"."shopping_items" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own sync meta" ON "public"."calendar_sync_meta" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own transactions" ON "public"."bank_transactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update activities for their jobs" ON "public"."job_activities" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update interviews for their jobs" ON "public"."job_interviews" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update offers for their jobs" ON "public"."job_offers" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own google token" ON "public"."user_google_tokens" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own jobs" ON "public"."jobs" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own life map" ON "public"."life_maps" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own reminders" ON "public"."reminders" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own subjects" ON "public"."subjects" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own transaction categories" ON "public"."bank_transactions" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own wishlist items" ON "public"."wishlist_items" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view activities for their jobs" ON "public"."job_activities" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view interviews for their jobs" ON "public"."job_interviews" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view offers for their jobs" ON "public"."job_offers" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own google token" ON "public"."user_google_tokens" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own jobs" ON "public"."jobs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own life map" ON "public"."life_maps" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own reminders" ON "public"."reminders" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own subjects" ON "public"."subjects" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own wishlist items" ON "public"."wishlist_items" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage their own brief history" ON "public"."lifemap_brief_history" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage their own brief suggestions" ON "public"."lifemap_brief_suggestions" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage their own briefs" ON "public"."lifemap_project_briefs" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."bank_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bank_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_sync_meta" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."category_corrections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_interviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_offers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."life_maps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lifemap_activity" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lifemap_brief_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lifemap_brief_suggestions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lifemap_project_briefs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lifemap_relations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mentor_chat_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mentor_profile_memory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reminders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shopping_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subjects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."today_focus_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_facts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_google_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wishlist_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."yd_shifts" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON TABLE "public"."bank_accounts" TO "anon";
GRANT ALL ON TABLE "public"."bank_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."bank_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."bank_transactions" TO "anon";
GRANT ALL ON TABLE "public"."bank_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."bank_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_events" TO "anon";
GRANT ALL ON TABLE "public"."calendar_events" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_events" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_sync_meta" TO "anon";
GRANT ALL ON TABLE "public"."calendar_sync_meta" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_sync_meta" TO "service_role";



GRANT ALL ON TABLE "public"."category_corrections" TO "anon";
GRANT ALL ON TABLE "public"."category_corrections" TO "authenticated";
GRANT ALL ON TABLE "public"."category_corrections" TO "service_role";



GRANT ALL ON TABLE "public"."job_activities" TO "anon";
GRANT ALL ON TABLE "public"."job_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."job_activities" TO "service_role";



GRANT ALL ON TABLE "public"."job_interviews" TO "anon";
GRANT ALL ON TABLE "public"."job_interviews" TO "authenticated";
GRANT ALL ON TABLE "public"."job_interviews" TO "service_role";



GRANT ALL ON TABLE "public"."job_offers" TO "anon";
GRANT ALL ON TABLE "public"."job_offers" TO "authenticated";
GRANT ALL ON TABLE "public"."job_offers" TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."life_maps" TO "anon";
GRANT ALL ON TABLE "public"."life_maps" TO "authenticated";
GRANT ALL ON TABLE "public"."life_maps" TO "service_role";



GRANT ALL ON TABLE "public"."lifemap_activity" TO "anon";
GRANT ALL ON TABLE "public"."lifemap_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."lifemap_activity" TO "service_role";



GRANT ALL ON TABLE "public"."lifemap_brief_history" TO "anon";
GRANT ALL ON TABLE "public"."lifemap_brief_history" TO "authenticated";
GRANT ALL ON TABLE "public"."lifemap_brief_history" TO "service_role";



GRANT ALL ON TABLE "public"."lifemap_brief_suggestions" TO "anon";
GRANT ALL ON TABLE "public"."lifemap_brief_suggestions" TO "authenticated";
GRANT ALL ON TABLE "public"."lifemap_brief_suggestions" TO "service_role";



GRANT ALL ON TABLE "public"."lifemap_project_briefs" TO "anon";
GRANT ALL ON TABLE "public"."lifemap_project_briefs" TO "authenticated";
GRANT ALL ON TABLE "public"."lifemap_project_briefs" TO "service_role";



GRANT ALL ON TABLE "public"."lifemap_relations" TO "anon";
GRANT ALL ON TABLE "public"."lifemap_relations" TO "authenticated";
GRANT ALL ON TABLE "public"."lifemap_relations" TO "service_role";



GRANT ALL ON TABLE "public"."mentor_chat_history" TO "anon";
GRANT ALL ON TABLE "public"."mentor_chat_history" TO "authenticated";
GRANT ALL ON TABLE "public"."mentor_chat_history" TO "service_role";



GRANT ALL ON TABLE "public"."mentor_profile_memory" TO "anon";
GRANT ALL ON TABLE "public"."mentor_profile_memory" TO "authenticated";
GRANT ALL ON TABLE "public"."mentor_profile_memory" TO "service_role";



GRANT ALL ON TABLE "public"."reminders" TO "anon";
GRANT ALL ON TABLE "public"."reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."reminders" TO "service_role";



GRANT ALL ON TABLE "public"."shopping_items" TO "anon";
GRANT ALL ON TABLE "public"."shopping_items" TO "authenticated";
GRANT ALL ON TABLE "public"."shopping_items" TO "service_role";



GRANT ALL ON TABLE "public"."subjects" TO "anon";
GRANT ALL ON TABLE "public"."subjects" TO "authenticated";
GRANT ALL ON TABLE "public"."subjects" TO "service_role";



GRANT ALL ON TABLE "public"."today_focus_items" TO "anon";
GRANT ALL ON TABLE "public"."today_focus_items" TO "authenticated";
GRANT ALL ON TABLE "public"."today_focus_items" TO "service_role";



GRANT ALL ON TABLE "public"."user_facts" TO "anon";
GRANT ALL ON TABLE "public"."user_facts" TO "authenticated";
GRANT ALL ON TABLE "public"."user_facts" TO "service_role";



GRANT ALL ON TABLE "public"."user_google_tokens" TO "anon";
GRANT ALL ON TABLE "public"."user_google_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."user_google_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."wishlist_items" TO "anon";
GRANT ALL ON TABLE "public"."wishlist_items" TO "authenticated";
GRANT ALL ON TABLE "public"."wishlist_items" TO "service_role";



GRANT ALL ON TABLE "public"."yd_shifts" TO "anon";
GRANT ALL ON TABLE "public"."yd_shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."yd_shifts" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







