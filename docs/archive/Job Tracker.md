# MODULE: Job Tracker (POS)

Build a **Job Tracker** module inside my **Personal Operating System (POS)** to manage my job search pipeline in a calm, structured way.

## Aim
The Job Tracker should help me:
- Capture job opportunities quickly
- Track each opportunity through a clear pipeline
- Never miss follow-ups
- Keep notes, links, and interview details organised
This is not a stressful productivity tool. It should feel clean, professional, and easy to maintain.

## Future Consideration
In a later phase, a browser extension will be added to auto-capture job postings into this Job Tracker. Design the Job Tracker cleanly so it can accept auto-imported job entries later without needing major refactoring.

## Core Concept
Each entry is a **Job Opportunity** that moves through a pipeline stage.

## Pipeline Stages
Implement these stages as the primary workflow:
- Wishlist (saved but not applied)
- Applied
- Interviewing
- Offer
- Rejected
- Archived (manually dropped or no longer relevant)

I should be able to move a job between stages easily.

## Required Functionality

### 1) Add and Manage Job Opportunities
I should be able to create a job entry with:
- Company name
- Role title
- Job URL
- Location
- Work mode (remote/hybrid/onsite/unknown)
- Employment type (intern/part-time/full-time/contract/unknown)
- Source (LinkedIn/Seek/company site/referral/other)
- Notes

Optional fields (nice to have):
- Salary range
- Date discovered
- Date applied

### 2) Kanban Pipeline UI
The main Job Tracker view must be a **Kanban board** with columns for each stage:
Wishlist | Applied | Interviewing | Offer | Rejected

- Each job appears as a card.
- Drag-and-drop between columns (or quick stage change control).
- Cards should show the essentials at a glance: Company, Role, Location, next follow-up date (if set).

Archived jobs should be hidden from the main board and accessible via a toggle or separate view.

### 3) Job Detail View
Clicking a job card should open a detailed view (side panel or dedicated page) with:
- All job fields
- Notes section
- Activity timeline (simple log like: stage changes, follow-up updates, interview entries)

Keep it clean and readable.

### 4) Follow-Up Tracking
Each job should support follow-up management:
- Next follow-up date
- Follow-up notes
- Follow-up status (pending/done)

I should be able to quickly see which jobs need follow-up soon.
Add a lightweight filter or view: “Follow-ups due”.

### 5) Interview Tracking
When a job is in Interviewing stage, allow tracking:
- Interview rounds (Round 1, Round 2, etc.)
- Interview date/time (optional)
- Notes per round
- Outcome per round (pending/pass/fail)

Keep it minimal but structured.

### 6) Offer Tracking
When a job is in Offer stage, allow:
- Offer details (salary, start date, notes)
- Offer deadline (optional)
- Decision (accepted/declined/pending)

### 7) Search, Filters, Sorting
Include:
- Search by company or role
- Filters by location, source, work mode, employment type
- Sort by date added, date applied, follow-up date

Do not add heavy analytics for MVP.

## UX and Design Requirements
- Dark theme
- Professional, minimal layout
- Calm UI with clear spacing
- No aggressive red warnings
- No guilt-inducing metrics
- Focus on clarity and progress visibility

## Definition of Done (MVP)
Job Tracker is complete when:
- I can create and manage job opportunities
- I can move jobs across stages via Kanban
- I can record follow-ups, interviews, and offers
- I can search and filter effectively
- Archived jobs are handled cleanly
- The module is structured so a future auto-import (extension) can add jobs easily later
