# Build prompt — Life Map: Project Briefs

---

## Your role

You are adding a new capability to **POS Life Map**: a **Project Brief** attached to each project — a living, structured description of what the project *is*, written and maintained by Claude Code as the project is built.

This is separate from, and complementary to, the map's task tracking. The map answers *"where is this and what's next."* The Brief answers *"what is this, who is it for, what does it do, and why does it matter."*

**It has three consumers, and the design must serve all three:**

1. **Other agents living in POS** — they need to understand a project without reading its codebase, and to answer questions across projects ("which of my builds handled payments?").
2. **My portfolio** — public-facing project pages get generated from it.
3. **My CV and interviews** — role, scale, impact, and the interesting decisions get pulled from it.

This is a **new, self-contained capability**. It adds to the system without changing how planning and task tracking currently work — reuse the existing conventions you find, change none of them.

---

## Step 0 — Discover before you build

**Do not assume the stack or the schema.** Before writing code:

1. Read the current node schema — Domains, Projects, Milestones, Tasks — including any status, activity-log or history mechanisms already present, and reuse them rather than inventing parallel ones.
2. Read every existing MCP tool definition and handler, and match their conventions.
3. Find how nodes are rendered in the UI and where a Brief would naturally live.
4. Check whether any project description field already exists that this should absorb rather than duplicate.
5. **Report what you found and your plan before writing code.** Wait for my go-ahead.

If something in this prompt conflicts with the real system, say so instead of forcing it.

---

## What a Project Brief is — and the one rule that governs it

A Brief is a **structured, living document** attached to a node. Not a freeform blob, not a README, not marketing copy.

**The depth rule: recruiter-readable, engineer-respectable.**

A smart non-engineer must be able to read the whole thing and understand what the project is and why it's interesting. An engineer reading it must not find it hollow. That means:

| Belongs | Does not belong |
|---|---|
| "Members upload photos; EXIF location data is stripped in the browser before upload so nobody's home address leaks." | "`createImageBitmap` with `imageOrientation: 'from-image'`, then canvas re-encode to WebP at q=0.82." |
| "Runs on Supabase and Vercel, deliberately on free tiers, which made bandwidth a real design constraint." | A dependency list or an architecture diagram. |
| "Committee turns over every year, so nothing important can require a developer to change." | "RLS policies use a `SECURITY DEFINER` helper with a pinned `search_path`." |

**Note this is a different altitude from the map's task text.** Map tasks are strictly non-technical. A Brief *may* name the stack and describe how something works — it just stops before implementation detail. Do not apply the map's altitude rule here; apply this one.

---

## 1. Where a Brief attaches

- Attachable to **Domains** and **Projects**. One Brief per node, optional.
- For software builds — which live as their own Domain — the Brief attaches at the **Domain**.
- Never on Milestones or Tasks.
- A node without a Brief is a normal, valid state. Never nag.

---

## 2. Structure

Store as **discrete fields, not one markdown blob** — agents need to read individual sections, and portfolio/CV generation needs structured access. Every field is individually optional and independently editable.

### Identity
- `name` — the project's name
- `one_liner` — a single sentence, the elevator line
- `tagline` — optional short phrase for portfolio cards
- `stage` — `idea | building | live | maintained | paused | archived`
- `started_at`, `shipped_at` (both nullable — CV needs dates)

### Substance
- `problem` — what was broken or missing, in plain language. 2–4 sentences.
- `audiences` — list of `{ who, what_they_get }`. Most projects have 2–4.
- `what_it_does` — 3–6 sentences of plain description.
- `features` — ordered list of `{ name, description, status }` where status is `live | building | planned | dropped`. **This is the field that gets appended to most often**, and the one portfolio pages lean on hardest.
- `how_it_works` — the mechanism at a level a smart non-engineer follows. 3–6 sentences.
- `constraints` — the real limits that shaped it (budget, scale, who maintains it). **The most interesting field for interviews** and the most commonly omitted.
- `non_goals` — what it deliberately does not do. Signals judgement; keeps the Brief honest.

### Craft
- `stack` — list of `{ name, why }`. The *why* is what makes this worth reading; a bare list is noise.
- `notable_decisions` — list of `{ decision, why, tradeoff }`. Interview gold. Append as decisions get made, don't backfill from memory later.
- `learnings` — list of short strings. What I'd do differently.

### Evidence
- `outcomes` — list of `{ metric, value, as_of }`. Users, volume, performance, cost. **CV needs numbers; make them first-class, not buried in prose.**
- `my_role` — what *I* actually did. Non-negotiable for CV, and the field an agent is most likely to write vaguely. Be specific.
- `links` — `{ type: live|repo|demo|writeup, url, label }`
- `media` — `{ type: screenshot|video|diagram, url, caption, order }`

### Meta
- `last_reviewed_at`, `created_at`, `updated_at`
- `completeness` — computed, not stored: which high-value fields are still empty

---

## 3. Authorship and trust — the part most likely to be got wrong

Claude writes most of this. I edit some of it. **An agent must never silently overwrite something I wrote.**

- Every field carries `authored_by: claude | me` and `edited_at`.
- **Human-authored fields are sticky.** An agent updating a field marked `authored_by: me` does **not** overwrite it — it writes a **suggestion** into a pending-changes queue, and the UI shows "Claude suggests an update to `one_liner`" with a diff, accept or reject.
- Agent-authored fields can be updated by agents freely, and the previous value goes to revision history.
- If I edit a field, its `authored_by` flips to `me` permanently. It never flips back.

### Revision history

Append-only, per field: `{ field, old_value, new_value, actor, reason, created_at }`.

Two reasons this matters: I can see how the project's *description* evolved alongside the project, and CV writing can pull an accurate "as of" state rather than only today's version. Never destructive — a Brief's history is the record of how thinking about the project changed.

---

## 4. When Claude writes to a Brief

Give the MCP tools descriptions that encode these triggers, so an agent reading only the tool schema behaves correctly.

**Create** — at project kickoff. A skeleton with `name`, `one_liner`, `problem`, `audiences`, `non_goals`, `constraints` filled from the kickoff conversation. Everything else empty. **An empty Brief created early is correct**; a Brief written retrospectively at the end is how projects get described inaccurately.

**Append** —
- A feature ships → add to `features` with `status: live`.
- A significant decision is made → add to `notable_decisions` with its tradeoff, at the moment it's decided.
- A phase completes → update `stage`, and `outcomes` if measurements were taken.
- Something is measured (users, cost, performance) → add to `outcomes` with `as_of`.
- Scope is deliberately cut → move the feature to `status: dropped` and add to `non_goals`.

**Never** — refactors, bug fixes, dependency bumps, or anything whose outcome is "the code now works as intended."

**Review prompt** — when N tasks have completed since `last_reviewed_at` (default 15, configurable), flag the Brief as stale and surface it. Do not auto-rewrite it; ask.

---

## 5. MCP tool surface

Follow existing naming and error conventions. Every tool description must state the depth rule from the top of this document, in one line.

**Write**
- `create_project_brief(node_id, fields)` — fails clearly if a Brief already exists.
- `update_project_brief(node_id, fields, reason?)` — partial update; respects the sticky-human-field rule and returns which fields were applied versus queued as suggestions.
- `append_to_brief_list(node_id, list_name, item)` — for `features`, `notable_decisions`, `outcomes`, `learnings`, `links`, `media`. Idempotent on an `external_key` so repeated calls don't duplicate.
- `resolve_brief_suggestion(suggestion_id, accept: bool)`

**Read**
- `get_project_brief(node_id, { sections?, format? })` — `format`: `structured` (default) | `markdown`. `sections` limits the payload so an agent can ask for just `features` without pulling media.
- `list_project_briefs({ stage?, has_field?, limit? })` — the index across all projects.
- `search_briefs(query)` — full text across all Briefs. This is what lets an agent answer *"which of my projects dealt with image uploads?"* in one call.
- `get_brief_history(node_id, { field?, since? })`

**Derived views** — the payoff for consumers 2 and 3:
- `render_brief(node_id, variant)` where variant is:
  - `portfolio` — narrative markdown: one-liner, problem, what it does, features, how it works, decisions, outcomes, links, media.
  - `cv_entry` — name, role, dates, stack names, and 3 bullets built from `outcomes` and `notable_decisions`, each ≤ 2 lines.
  - `elevator` — 2–3 sentences.
  - `agent_context` — a compact factual digest for another agent to load as context; no prose flourish, no media.

**Rendering is deterministic assembly from stored fields — not model generation.** The tool composes what's there; it must never invent content to fill a gap. If a variant needs a field that's empty, it omits the section and reports which fields were missing. An agent can then go and fill them.

**One exception:** allow an optional stored `portfolio_override` per field, so I can hand-tune public copy without that edit propagating back into the source of truth.

---

## 6. UI

- A **Brief tab** on Domain and Project detail pages. Read view first, edit inline.
- **Completeness indicator** showing which high-value fields are empty (`my_role`, `outcomes`, `one_liner`, `problem` weighted highest) — informational, never a nag or a percentage-shaming bar.
- **Pending suggestions** surface clearly, with a diff and accept/reject.
- **Stale flag** when the project has moved substantially since the Brief was last reviewed.
- A **cross-project index** — all Briefs as cards with one-liner, stage, and stack. This doubles as the portfolio source view.
- Field-level history viewable on demand, collapsed by default.

---

## 7. Acceptance criteria

- Creating a Brief at kickoff with only `one_liner`, `problem` and `audiences` filled is valid, renders cleanly, and reports the rest as incomplete.
- An agent calling `update_project_brief` on a field I edited produces a **suggestion**, not an overwrite. Verify with a test.
- `append_to_brief_list` called twice with the same `external_key` produces one item.
- `render_brief(node, "cv_entry")` on a Brief with no `outcomes` omits the metrics bullets and reports `outcomes` as missing — it does not invent numbers.
- `search_briefs("photo upload")` finds a project whose only mention is inside a feature description.
- Every field write appears in history with actor and reason.
- A node with no Brief renders normally with a quiet "Add a brief" affordance and no warning state.

---

## 8. Explicit non-goals

- **No auto-generating Brief content from commits, code, or READMEs.** It produces confident, wrong, technically-pitched text and it will poison the portfolio source. Claude writes Briefs from the conversation about the work, not from the diff.
- **No marketing voice.** Plain, specific, honest. No "revolutionary", no "seamless", no "leveraging".
- **No architecture diagrams, dependency lists, API docs, or schema.** That is what the repo is for. If a reader needs it, the Brief has failed at its job, not succeeded at a new one.
- **No required fields and no completion pressure.** A sparse Brief on an early project is correct.
- **No blog posts or long-form writeups** stored here. Link to them.
- **No auto-publishing anywhere.** The Brief is the source; publishing is a separate, deliberate action.
- **Never delete history.**

---

## How to deliver

1. **Step 0 discovery, then stop and report the plan.** Wait for approval.
2. Ship in three passes, each independently useful:
   - **Pass A** — schema, authorship/stickiness, revision history, write + read tools.
   - **Pass B** — UI: Brief tab, completeness, suggestions, stale flag.
   - **Pass C** — derived views (`render_brief`), cross-project index, `search_briefs`.
3. Test the **sticky-field** and **deterministic-render** rules specifically. Those two carry the most logic and are the easiest to get subtly wrong.
4. After each pass, tell me what changed in one plain-language paragraph.

If a requirement here turns out to be wrong once you can see the real code, **say so and propose the alternative** rather than building something you think is a mistake.
