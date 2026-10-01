# POS Cleanup & Build Backlog

Created 2026-10-01. Order of work: P0 → P1 → P3 → P2 (P2 is parked for a later design discussion). Each item has an ID so we can refer to it, a size (S = under an hour, M = a session, L = several sessions), and a status.

Status: `[ ]` todo · `[~]` in progress · `[x]` done · `[?]` needs a decision from Aamir first

---

## P0 — Security and data safety

These come first because the live site exposes private data now, and because everything agent-driven depends on the Life Map not losing writes.

| ID | Item | Size | Status |
|---|---|---|---|
| S1 | **Lock down bank sync.** Done: `sync-redbark` now only runs for the `OWNER_USER_ID` secret (your user ID). Deployed 2026-10-01. | S | [x] |
| S2 | **Turn off public sign-up.** Done in code: the login screen no longer offers sign-up. **Your step:** Supabase → Authentication → Sign In / Providers → turn off "Allow new users to sign up". Google sign-in still creates accounts until you do. | S | [~] |
| S3 | **Remove the daily summary email function.** Done: code removed and the live function deleted 2026-10-01. **Your step:** check Supabase → Integrations → Cron for a job that called it, and delete it. | S | [~] |
| S4 | **Stop exposing the Gemini key.** **Your step:** create a new key, restrict it to the Vercel domain and localhost (HTTP referrers), delete the old one, then update `pos-app/.env` and the Vercel env var. The full fix (no LLM key in the browser) comes with A2. | S | [~] |
| S5 | **Make `MENTOR.md` private.** Done: the memo now lives in `user_facts` (key `strategy_memo`), the public file is deleted, and the Finance prompt no longer contains your account details. Goes live on the next deploy. | S | [x] |
| S6 | **Stop the web app overwriting Claude's changes.** Right now the app and the MCP server both save the whole map at once, so whichever saves last wins. **Decided: split the map into one database row per node and task**, with live updates in the app. | L | [ ] |
| S7 | **Capture the full database schema in the repo.** Done: `supabase/migrations/20261001000000_baseline.sql` (25 tables, 52 access rules) replaces the 7 partial migrations, tested on an empty database, and Supabase's migration history now matches. All 52 rules limit rows to their owner. | S | [x] |
| S8 | **Delete the `inspect-db` debug function.** It's deployed but not in the repo, and returns every user's full Life Map with no check on who's asking. Source saved. **Your step:** Claude Code's permission check blocked me, so delete it in Supabase → Edge Functions. | S | [~] |
| S9 | **Make the GitHub repo private.** `aamirahamed/POS` is public: your strategy memo, full profile, and finance rules (rent amounts) are readable, including in git history. No keys were ever committed. **Your step:** GitHub → Settings → Danger Zone → Change visibility. | S | [?] |

## P1 — Remove stale features

This is cheap, low-risk, and shrinks the code before the bigger redesigns. Code is removed only; database tables stay until R9.

| ID | Item | Size | Status |
|---|---|---|---|
| R1 | Remove **Assignment Tracker** (module, route, nav item, hooks) and detach the `SemesterTracker` submodule from this repo. | S | [ ] |
| R2 | Remove **Thought Incubator** (page, store, route, nav). | S | [ ] |
| R3 | Remove **Quick Capture** (page, route, nav). | S | [ ] |
| R4 | Remove **Briefs page** and its nav item. Brief data and the MCP brief tools stay; the brief moves into project context in A5. | S | [ ] |
| R5 | Remove dead code: `geminiService.ts`, 11 unused components (3 dashboard widgets, 5 finance components, ImportModal, 2 tracker components), and the local-only Life Map `inbox` list plus Sam's `add_inbox_item` tool. | S | [ ] |
| R6 | Remove the leftover pillar/thread/initiative/subnode migration code once the stored map is confirmed clean. | S | [ ] |
| R7 | **Clean the root folder.** Archive or delete the stale docs (`codebase_architecture.md`, `system_overview.md`, `context.md`, the duplicate `pos_detailed_features.md`, and the old build prompts), fix `.gitignore`, and add a `CLAUDE.md`. | S | [ ] |
| R8 | **Decided: keep** Job Tracker + extension, Shopping, Wishlist, Finance, Mentor page, YD roster/earnings for now. | — | [x] |
| R9 | Export and then drop the `subjects` table (the only Assignment Tracker table that exists; `assignments` and `semesters` were never created in the live database). Only after you confirm. | S | [?] |

## P3 — Product features

| ID | Item | Size | Status |
|---|---|---|---|
| D1 | **One to-do model.** Merge Today's Focus items, Reminders and "my" Life Map tasks into a single list with due dates. This also fixes reminders that only save while the Reminders page is open. | M | [?] |
| D2 | **Dashboard redesign: action-oriented.** Lead with what to do today: to-dos, what's waiting on you, decisions pending, and today's calendar. Move the clock, stats and roster detail lower or onto their own pages. | M | [ ] |
| D3 | **Brain Gym.** A daily morning routine: thinking exercises, a writing prompt, and briefings on your areas of interest and career goals. Brainstorm first, then build. Its AI-generated content needs a server-side model call, so it will either pull in a small slice of A2 or wait for it. | L | [?] |
| D4 | **Fix the extension's account sync** (broken since 5 May). | S | [ ] |

## P2 — Make POS agent-driven (PARKED)

Parked until after P3. A1 and A2 need a design conversation before any code is written.

| ID | Item | Size | Status |
|---|---|---|---|
| A1 | **Personal context layer ("what POS knows about me").** Replace the three overlapping stores (`MENTOR.md`, `mentor_profile_memory`, `user_facts`) with one structured store: goals, key decisions (with the reasoning and date), memories, preferences and constraints. Each entry records where it came from. Both agents read it on every turn and write to it when you tell them something new. | L | [?] |
| A2 | **One agent, one tool layer.** Today there are two separate AIs: Sam (Gemini, running in the browser) and Claude (through the MCP server). Move to one server-side agent backend with a shared set of tools that both the in-app chat and the MCP server use. This also removes the LLM key from the browser. | L | [?] |
| A3 | **One shared way to change data.** The app, the agent and the MCP server should all go through the same functions, so every change is validated and logged to the activity feed. Right now your own edits in the app are never logged. | M | [ ] |
| A4 | **Finish the Life Map model.** Use the existing (tested) status/progress calculation in the screens; convert old statuses (`backlog`, `active`, `completed`); stop counting dropped tasks in progress bars; rank "Needs You" properly; make `create_subtree` all-or-nothing; show relations in the app. | M | [ ] |
| A5 | **Make briefs contextual.** Show the brief inside the project (focus mode and a project panel). The agent keeps it current as the project moves. Save when you leave a field, not on every keystroke. | M | [ ] |
| A6 | **Agent-first capture.** Anything you tell the agent ("idea for X", "remind me", "decided to Y") lands in the right place: an idea on the relevant project, a to-do, a decision log entry, or a reminder. This replaces the removed Incubator and Quick Capture. | M | [ ] |

## P4 — Ongoing hygiene

| ID | Item | Size | Status |
|---|---|---|---|
| H1 | Add tests for the agent tools and the data-change layer (A3). | M | [ ] |
| H2 | Run lint and tests before every deploy. | S | [ ] |
