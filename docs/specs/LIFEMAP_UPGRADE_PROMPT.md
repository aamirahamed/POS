# Build prompt — Life Map: from task list to project planner



---

## Your role

You are extending **POS Life Map**, a personal planning system with an MCP server that Claude Code writes to while I build software. The map is my planning instrument — I read it to understand where my projects are and what needs my attention.

Today it is a **task list**. I want it to be a **planner**: something that tells me what it needs from me, shows me where each build actually is, and evolves as projects evolve.

Do not rewrite the system. This is an **additive upgrade** across four tiers, delivered in order, each shippable on its own.

---

## Step 0 — Discover before you build

**Do not assume the stack or the schema.** Before writing code:

1. Locate the data store and read the current schema for Domains, Projects, Milestones, Tasks.
2. Locate the MCP server and read every existing tool definition and handler.
3. Locate the UI and identify how the tree is currently rendered.
4. Read any existing tests, migrations, and type definitions.
5. **Report back what you found and the plan** — the concrete schema changes, files you'll touch, and migration approach — **before writing any code.** Wait for my go-ahead.

If anything in this prompt conflicts with how the system actually works, say so instead of forcing it.

---

## The current model, and why it's the ceiling

The hierarchy is **Domain → Project → Milestone → Task**. A task is `{ id, text, completed }`.

That boolean is the core problem. `completed: false` cannot distinguish *not started* from *in progress* from *blocked on me* from *deliberately parked* from *dropped on purpose*. Everything I want from this tool is blocked on replacing it.

**Useful existing property:** node IDs encode creation time in epoch milliseconds (`task-1785478885620`, `m-1785477965024`). Use this to backfill `created_at` for every existing node — no data is lost. IDs without a parseable timestamp (`p1`, `p2`, `pillar-inbox`, `m-career-cv`) fall back to `null`, and the UI must handle null gracefully.

---

## Non-negotiable principles

1. **Backward compatibility is mandatory.** Claude Code sessions call the existing MCP tools today. Every current tool name and signature must keep working. New parameters are optional. `completed: true/false` must continue to work as an alias for the new status field, in both directions.

2. **The altitude rule.** The map records *what is happening and how far along it is*, never *how it is built*. It must be readable by someone who has never seen the codebase. "Marketplace filters" belongs; "compound index on listings(status, created_at)" does not. **This constrains the UI: technical provenance is never surface text — it lives behind an expand.**

3. **Derive, don't store.** Milestone and project status is computed from children, not written independently. Same for progress. The one exception is an explicit manual override (below).

4. **Sparse by default.** This map has stale branches and empty milestones and that is *fine* — an empty milestone is a legitimate intent marker meaning "planned, not started". Never force a node to have children. Never show empty-state nags.

5. **No destructive migrations.** Everything is additive with sensible defaults. Existing data must render correctly on first load with zero manual cleanup.

---

# TIER 1 — The data model

Small, and it unlocks the other three. Ship this first.

## 1.1 Status enum

Add `status` to **tasks, milestones, projects, and domains**:

```
not_started | in_progress | blocked | parked | done | dropped
```

Semantics — get these right, they carry the whole design:

| Status | Means |
|---|---|
| `not_started` | Planned, untouched. The default. |
| `in_progress` | Actively being worked. |
| `blocked` | Cannot proceed — usually waiting on a decision or an external party. |
| `parked` | Deliberately deferred. Real, not now, will come back. |
| `done` | Complete. |
| `dropped` | **Decided against.** Kept as a record, not deleted. |

`dropped` matters more than it looks: it is how the *evolution* of a plan stays visible instead of being silently erased. Dropped items are hidden from default views but never removed, and remain searchable.

**Migration:** `completed: true → done`, `completed: false → not_started`.

## 1.2 Status derivation

Milestone / Project / Domain status is **computed** from children:

```
if manual_status_override is set        -> use it
else if no children                     -> not_started
else if every child is done/dropped     -> done
else if any child is in_progress        -> in_progress
else if any child is blocked
        and none in_progress            -> blocked
else if every child is parked/dropped   -> parked
else                                    -> not_started
```

- `parked` and `dropped` children are **excluded from progress denominators**.
- `progress = done / (total − parked − dropped)`; when the denominator is 0, progress is undefined, not 0% — render it as "—", not an empty bar.
- Store `manual_status_override` as a nullable field so I can pin a milestone to `blocked` or `parked` regardless of its children. The UI must indicate when a status is overridden.

## 1.3 Task types

Add `type` to tasks:

```
task | decision | idea | bug
```

Default `task`. **`decision` is the important one** — it means *the map is asking me for something*, and it drives the Needs You view in Tier 3. Render each type distinctly (a decision should be visually unmistakable from a task).

## 1.4 Owner

Add `owner` to tasks: `me | claude`. Default `me`.

Exactly two values — resist adding more. This answers the one question I have every morning: what is waiting on me, versus what is in flight with the agent.

## 1.5 Ordering

Add an integer `position` to tasks and milestones, and to projects within a domain. Default to current insertion order on migration. Expose reordering in the API and, where cheap, drag-reorder in the UI. Phase pipelines (Tier 3) are meaningless without explicit order.

## 1.6 Timestamps

Add to every node: `created_at`, `updated_at`, `completed_at` (nullable).

**Backfill `created_at` by parsing the epoch-ms suffix from existing IDs.** Set `updated_at = created_at` for existing rows. `completed_at` is null for everything already complete — do not fabricate it.

## Tier 1 acceptance

- Every existing node renders correctly with no manual cleanup.
- `update_task(..., completed: true)` still works and results in `status = done`.
- `update_task(..., status: "done")` results in `completed: true` when read by an old client.
- A milestone with 3 tasks — one `done`, one `dropped`, one `not_started` — reports status `not_started` and progress **50%** (1 of 2; the dropped task is excluded from the denominator). Verify this exact case with a test.
- A milestone with zero tasks reports `not_started` and progress `—`.

---

# TIER 2 — The agent-facing API

This is the "works hand in hand with Claude Code" half. The agent writes to this map mid-session; the API has to make that cheap and safe.

## 2.1 Activity log

Add an append-only `activity` record: `{ id, node_id, task_id?, actor: me|claude, action, detail, created_at }`.

**Write one entry on every mutation** — create, status change, text edit, move, delete. `action` is a short machine-readable verb (`task_added`, `status_changed`, `node_created`, `task_dropped`); `detail` is one human-readable line (*"Marketplace filters → done"*).

This is what gives the map a memory. Right now it is a snapshot with no history, which is why I cannot tell what happened in a week of work.

Append-only: no UPDATE, no DELETE. If a node is deleted, its activity survives with a tombstone reference.

## 2.2 Scoped reads

`get_lifemap_state` currently returns the entire tree, which is already a large payload and gets worse as it grows. Add:

- **`get_project(project_id)`** — one project, full depth, with computed status and progress.
- **`get_activity({ since?, project_id?, actor?, limit? })`** — what changed, newest first. Lets the agent open a session with *"what moved since last time"* in one cheap call.
- **`search_map({ query, types?, statuses?, project_id? })`** — full-text over labels and task text. This is what makes duplicate-avoidance cheap.
- **`get_needs_you()`** — see Tier 3.1; expose the computed list as a tool, not only as a UI view, so the agent can open a session by reading it.

Extend `get_lifemap_state` with optional `{ depth?, include_done?, include_dropped? }`, all defaulting to today's behaviour.

## 2.3 Bulk subtree creation

Architecting a new project today takes ~20 sequential calls. Add:

**`create_subtree(parent_id, nodes)`** — accepts a nested structure (projects → milestones → tasks), creates it in **one transaction**, returns the created tree with real IDs.

All-or-nothing: a partial failure leaves the map untouched.

## 2.4 Idempotent writes

Add optional `external_key` (string) to task and node creation. A create with an `external_key` that already exists under the same parent is a **no-op that returns the existing node**, not a duplicate.

This replaces the current workaround, which is "always read the whole map first so you don't create duplicates".

## 2.5 Templates

**`apply_template(template_name, label, parent_id?)`** — creates a named skeleton in one call, built on `create_subtree`.

Ship one built-in template, `software_build`, which creates a Domain with these projects and milestones:

```
<label>                       Domain
├── Definition                Project
│   ├── Shape & Audience      Milestone
│   └── Scope Boundaries      Milestone
├── Build                     Project   (kind: build_spine)
│   ├── Foundation            Milestone
│   ├── Identity              Milestone
│   └── Hardening & Launch    Milestone
├── Design                    Project
├── Adoption & Launch         Project
│   ├── How people find out   Milestone
│   └── First-time experience Milestone
└── Resources                 Project
    └── Credentials & Links   Milestone
```

Templates are **data, not code** — stored so I can add or edit one without a deploy.

## 2.6 Full tool surface after Tier 2

Existing, unchanged in behaviour, extended with optional params:
`get_lifemap_state` · `create_domain` · `create_project` · `create_milestone` · `add_task_to_node` · `update_task` · `update_node` · `delete_node` · `delete_task`

New in Tier 2:
`get_project` · `get_activity` · `search_map` · `get_needs_you` · `create_subtree` · `apply_template`

Arriving with their tiers (listed here so the surface is designed as a whole):
`set_focus` (Tier 3.2) · `link_nodes` (Tier 4.1, 4.4)

Extended parameters:
- `add_task_to_node(node_id, task_text, type?, owner?, position?, external_key?)`
- `update_task(node_id, task_id, text?, status?, type?, owner?, position?, completed?)`
- `update_node(node_id, label?, manual_status_override?, kind?, repo_url?, position?)`

**Every tool description must state the altitude rule**, so an agent reading only the tool schema still writes at the right level.

## Tier 2 acceptance

- Creating the `software_build` template is **one** tool call and one transaction.
- Calling `add_task_to_node` twice with the same `external_key` produces one task.
- `get_activity({ since: <yesterday> })` returns a readable, ordered list of what changed.
- A failed `create_subtree` leaves the map byte-identical to before.

---

# TIER 3 — The views

**All of these are filters and computations over Tier 1 data. No new storage.**

## 3.1 "Needs You" — the centrepiece

One screen, all projects, answering *what is waiting on me*. This is the feature that turns a tracker into a planner — build it properly.

**Include, in this priority order:**

1. `decision` tasks, status ≠ done/dropped, **that block an `in_progress` milestone** — these are stopping active work.
2. All other open `decision` tasks.
3. Anything with status `blocked`.
4. `in_progress` milestones with **no activity in 42 days** (configurable), sourced from the activity log.
5. Tasks with `owner: me` inside an `in_progress` milestone.

**Each row shows:** the item, its project and milestone, how long it has been waiting, and why it surfaced. Clicking goes to the node in context.

**Empty state is a real state** — "Nothing is waiting on you" is a good outcome and should look like one, not like a broken page.

## 3.2 Focus

Add a boolean `focus` flag to milestones (`set_focus` tool). Focus view shows **only** focused milestones and their open tasks; everything else collapses.

This is deliberately the cheap version of a sprint: no dates, no ceremony. Cap focus at ~5 milestones and warn past that — an unbounded focus list is just the full map again.

## 3.3 Activity feed

Chronological, grouped by day, filterable by project and by actor. Each entry is one line. This is what I read after a build session to see what happened.

Give it a **"this week" summary header**: N tasks completed, N added, N decisions raised, across N projects.

## 3.4 Build pipeline

Add `kind` to projects: `standard | build_spine`.

A `build_spine` project renders as an **ordered horizontal pipeline** — each milestone a segment, sequenced by `position`, coloured by status, showing progress. Everything else renders as today's list.

This is the single view that answers *"what phases, in what order, and where are we"* at a glance. It is the main thing the map cannot do today.

Each segment shows the milestone name, its status, and `done/total` tasks. The current phase is visually dominant; completed phases recede; future phases are present but quiet.

## 3.5 Stale

Everything with no activity in N days (default 42), ordered oldest first, grouped by project. This is how drift surfaces without any planning ritual.

## Tier 3 acceptance

- Needs You correctly ranks a decision blocking an in-progress milestone above an unattached one.
- Needs You renders a genuine, non-broken empty state.
- The build pipeline renders correctly for a project with 6 milestones where 5 are done.
- Every view works on the existing data with no new fields filled in by hand.

---

# TIER 4 — Relations and capture

## 4.1 `blocked_by` — one link, not a graph

Add nullable `blocked_by` (a single node or task ID) via `link_nodes(from_id, to_id, "blocked_by")`.

**Deliberately not a dependency graph.** The one case that matters: a `decision` task blocking a milestone, so the map can say *"Hardening & Launch is waiting on you to decide X."* Show the blocker inline on the blocked node, and reciprocally list what a decision is blocking.

Detect and reject cycles.

## 4.2 The idea shelf

Ideas attach to a **Domain**, typed `idea`, with no project or milestone.

**Collapsed by default** — the domain header shows a count ("7 ideas") and nothing more until I open it. Adding an idea must take one action and no decisions about where it goes.

This exists because ideas arriving mid-project is normal and healthy, and because the alternative — a "Features" or "Backlog" project — grows forever and reports nothing. **Do not build a backlog project.**

Promoting an idea to a milestone or task is one action, and records the promotion in the activity log.

## 4.3 Repo provenance — hidden by default

- `repo_url` on a Domain.
- Optional `refs` on a task: a list of `{ type: commit|pr|issue, url, label }`.

**Surface text never shows a SHA, a branch, or a file path.** The card shows "Marketplace filters ✓"; expanding it shows "3 commits · closed 2 Aug". This is provenance you can drill into, not technical noise on the plan.

**Do not auto-generate tasks from commits, branches or issues.** That would bury the map in exactly the detail the altitude rule exists to keep out. Links attached to existing tasks, yes. Tasks created from git, never.

## 4.4 `supersedes`

When something is dropped because the plan changed shape, `link_nodes(new_id, old_id, "supersedes")` points the replacement at what it replaced. The dropped node renders with "superseded by →".

This is what makes the map an honest record of how thinking evolved, rather than a tidy fiction.

## Tier 4 acceptance

- A decision blocking a milestone appears on both nodes and in Needs You.
- A domain with 7 ideas shows a count, not 7 rows.
- A completed task with 3 commit links shows no SHA until expanded.
- Cycle creation is rejected with a clear error.

---

# Explicit non-goals

Do not build these. Each was considered and rejected:

- **Estimates, story points, velocity, burndown charts.** Team coordination instruments. I would fill them in wrong and then stop using the tool.
- **Sprints with start and end dates.** The `focus` flag does the useful 90% at 5% of the cost.
- **Assignees beyond `me` and `claude`.** There are two actors.
- **Comment threads, mentions, notifications, custom workflow builders.** This is Jira's weight without Jira's reason to exist.
- **Auto-created tasks from commits, PRs, or issue trackers.**
- **Required fields, empty-state nags, or completion-percentage pressure.** Sparse branches are a legitimate state.
- **Deleting anything on my behalf.** `dropped` exists so that nothing has to be destroyed. Deletion stays explicit, manual, and confirmed.

---

# How to deliver

1. **Step 0 discovery, then stop and report the plan.** Wait for approval.
2. **One tier per PR**, in order. Each tier ships working software on its own.
3. **Migrations are additive, reversible, and tested against a copy of real data** before touching the live map.
4. **Tests for the derivation rules and the Needs You ranking specifically** — those two carry the most logic and are the easiest to get subtly wrong.
5. **After each tier, tell me what changed in one paragraph**, in plain language, no schema dumps.

If a requirement here turns out to be wrong once you can see the real code, **say so and propose the alternative** rather than implementing something you think is a mistake.
