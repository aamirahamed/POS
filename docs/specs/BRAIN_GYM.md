# Brain Gym — Spec

Status: draft, agreed in conversation 2026-10-02; interview prep revised the same day. Backlog item D3.

## Purpose

A 60-day morning routine, done in one sitting at a desk (laptop only, no mobile design work), 40–45 minutes on weekdays. Goal: land a PM role (applications open late November 2026) and grow intellectually, with AI and Product Management as the main focus.

Design principles:
- **Every module ends with an output** (an answer, an argument, a prediction, a summary) that gets feedback. No read-only modules.
- **Retrieval beats re-reading.** A short recall warm-up resurfaces earlier content on a spaced schedule.
- **Modules feed each other.** Today's AI news is material for the Think exercise; lessons get a "where this shows up in product work" angle.
- **Agents where they add judgement, plain code where they don't.** Streaks, scheduling and maths checking are deterministic.
- **Measure change.** Baseline test on days 1, 30 and 60.

First series: **Game Theory** (topic) and **The Cold War** (history).

## Daily session (weekdays, ~42 min)

| # | Module | Min | What happens | Output |
|---|---|---|---|---|
| 0 | Recall | 3 | 3 questions from earlier days, spaced (1 day, 1 week, 3 weeks…) | Answers, auto-checked or self-rated |
| 1 | AI Briefing | 7 | 3–5 items from the last 24h, each: what happened / why it matters / what it makes buildable. One AI term explained. | "So what for a PM?" answer, graded |
| 2 | Interview Rep | 10 | One question, rotating: behavioural, product sense, metrics, strategy, estimation, AI-PM | Spoken answer (recorded), scored against rubric, model answer, which story bank story fit best |
| 3 | Think | 7 | One exercise, often built on today's news: steelman, assumption hunt, fallacy spotting, pre-mortem, second-order effects | Written response, critiqued |
| 4 | Numbers | 5 | 2–3 "numbers for PMs" problems: estimation (by hand), probability & expected value, base rates, A/B stats, unit economics, compounding. Calculator allowed except estimation. | Numeric answers, checked; worked solution |
| 5 | Lesson | 5 | Next chapter of the current topic series (game theory, consciousness, Jung, quantum physics, philosophy, identity…) | One-line summary + 1 recall question |
| 6 | History | 5 | Next episode of the current themed history series (e.g. "The Cold War in 8 episodes") | One-line summary + 1 recall question |
| 7 | Close | 1 | "One thing I'll use today" | One line |

Typed answers everywhere except the Interview Rep, which is spoken.

### Weekends

- **Saturday: mock interview.** A 25–30 minute multi-turn interview run by the interviewer agent, with follow-up questions like a real interviewer. Full debrief afterwards.
- **Sunday: weekly review + teardown.** The reviewer agent summarises the week (scores, weak spots, streak), adjusts next week's difficulty and focus. Plus a product/business teardown ("why did X win?").

## Interview prep

- **Target:** any PM role (APM, PM, Senior PM, AI PM), B2B or B2C. Big tech (Apple, Google, Microsoft) plus Australian startups and scaleups.

### Market analysis (runs first, refreshed monthly)

The Market Analyst reads at least 50 real PM postings and builds a **requirements matrix**: each requirement or skill, how often it appears, and how that varies by seniority and company type. Sources:
- Public job board feeds (Greenhouse, Lever, Ashby), used by many Australian startups and scaleups.
- Gemini search grounding for big-tech postings.
- Postings Aamir saves with the Chrome extension (which already extracts requirements and skills; needs D4 fixed).
- LinkedIn and Seek are not collected automatically (their terms forbid it).

Each requirement gets a **readiness rating** for Aamir with evidence (a story bank story, practice scores, an artefact). Requirements are split into:
- **Buildable in 60 days:** skills and knowledge. The plan targets these gaps; "meet all criteria by day 60" means every buildable requirement reaches "ready" with evidence.
- **Fixed:** years of experience, degrees, specific domain history. Prep here is how to address them in interviews.

### Story bank

15–20 STAR stories built from Aamir's portfolio and career history, each tagged by competency and linked to the requirements it proves. The Story Builder asks follow-up questions where a story lacks numbers or detail. Stored in POS and editable.

### Practice and feedback

- **Rubrics** per question type, so scores are comparable over time.
- **Spoken answers:** recorded in the browser and sent to Gemini as audio; content and delivery are both judged (structure, length, filler).
- **Feedback on every answer:**
  - A score per rubric dimension (structure, specificity, metrics, trade-offs, delivery).
  - What worked.
  - What was missed, stated specifically (e.g. "no impact metric", "'we' throughout, your role unclear").
  - Aamir's own answer rewritten better, using his real story, not a generic model answer.
  - Which story fit best, if a different one would have been stronger.
  - **Redo:** answer the same question again immediately and see the score change.

## AI Briefing sources

Fetched nightly from RSS/blogs, deduplicated, ranked by importance:
- Official: Anthropic, OpenAI, Google DeepMind / Google AI, Meta AI, Microsoft AI, Mistral, Hugging Face blog.
- Curated: smol.ai AI News (covers X/Twitter and Discord), Simon Willison, Latent Space, Import AI, The Batch, Interconnects.
- Gemini's Google Search grounding fills gaps and checks freshness.
- X/Twitter is not scraped directly (expensive API, fragile scraping); smol.ai covers it.

Depth: PM level daily, with a technical section (how it works, notable papers) in each briefing, plus a weekly technical deep-dive on Sunday. A running "what AI can do now" page is updated weekly.

## Gamification

- **Full day** = all modules done that day.
- **Streak** counts full days. **One freeze per week**, applied automatically to a missed day.
- **Catch-up allowed:** missed modules stay in a visible "missed" list and can be done later, marked late. A late completion does not restore the streak.
- **60-day quest map** showing every day: full, partial, frozen, missed.
- **Skill stats** (Product, AI, Reasoning, Numbers, Knowledge) from rolling scores, so strengths and weak spots are visible. No XP, levels or badges.
- **Baseline test** on days 1, 30, 60: one interview answer, one reasoning task, five numbers problems.

## Agents

| Agent | When it runs | Job |
|---|---|---|
| Session Builder | Nightly (scheduled) | Plans and writes tomorrow's session from: due recall items, series progress, weak skills, story bank coverage, last week's review. |
| News Curator | Nightly, before the builder | Fetches sources, dedupes, ranks, writes the briefing and technical notes. |
| Market Analyst | Setup, then monthly | Collects 50+ PM postings, builds the requirements matrix, rates readiness against it. |
| Grader | On each submit (non-interview modules) | Scores answers, gives feedback, creates recall items. |
| Interviewer | Interview Rep and Saturday mock | Asks questions and follow-ups, in character. Never coaches mid-interview. |
| Coach | After each interview answer, and weekly | Scores interview answers with the feedback set above. Keeps the coaching file: weak areas with evidence and trend (improving / stuck / solved), readiness against the requirements matrix. Decides what to practise next; the Session Builder follows its plan. |
| Story Builder | On demand (setup, then occasionally) | Turns career material into STAR stories, asks follow-up questions. |
| Weekly Reviewer | Sunday | Summarises the week, adjusts focus and difficulty. |

Plain code (no agent): streaks, freezes, recall scheduling, numeric answer checking, stats.

## Technical design

- **Model:** Gemini (Aamir's existing API). Pro for generation and grading, Flash for news summarising. Called only server-side (Supabase Edge Functions) with a key stored in Supabase secrets, never in the browser.
- **Scheduling:** `pg_cron` + `pg_net` in Supabase trigger the nightly build around 3am Melbourne time.
- **Edge functions:** `bg-build-session` (curator + builder), `bg-grade`, `bg-interview` (interviewer + coach), `bg-stories`, `bg-market`, `bg-weekly-review`.
- **Tables** (all owner-scoped by RLS): `bg_days`, `bg_modules`, `bg_attempts`, `bg_recall_items`, `bg_series`, `bg_stories`, `bg_news_items`, `bg_reviews`, `bg_job_postings`, `bg_requirements` (the matrix plus readiness), `bg_coaching_notes` (weak areas, evidence, trend).
- **UI:** a `/brain-gym` page (today's session, step by step), a quest map / stats view, a story bank view. A dashboard card shows today's progress and the streak.

## Build phases

1. **Foundation:** tables, Brain Gym page shell, streak/freeze/missed logic, quest map. Manual test content.
2. **Content agents:** News Curator, Session Builder, Lesson/History series, Numbers, Think, Grader. Nightly schedule.
3. **Interview prep:** market analysis and requirements matrix, story bank, spoken Interview Rep with Coach feedback and redo, Saturday mock interview, coaching file.
4. **Learning loop:** recall engine, weekly review, baseline tests, skill stats.

Day 1 of the 60 is the first day all of phase 1–2 works end to end. Phase 3 can land a few days into the run.
