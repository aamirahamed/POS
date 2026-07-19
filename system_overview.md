# Personal Operating System (POS) – Product Vision & Functional Overview

This document provides a conceptual, functional, and user-experience guide to the Personal Operating System (POS). It outlines the core vision, philosophy, and user workflows of each feature, explaining the *what* and *why* of the system to guide future design and feature additions.

---

## 1. Core Vision & Philosophy

The **Personal Operating System (POS)** is not a task manager, a productivity tracker, or a short-term checklist app. It is a long-term **strategic architecture platform** designed to structure, organize, and manage different dimensions of personal life in a clear, calm, and scalable way.

### The Problem it Solves
Standard productivity apps create pressure by focusing on short-term urgency, daily checklists, and constant notifications. This leads to overwhelm and reactive behavior. 

### The POS Philosophy
*   **Separation of Strategy and Execution**: Strategic design (answering *where am I going?* and *why?*) is decoupled from daily execution (*what do I need to do right now?*).
*   **Clarity over Pressure**: Visual structures encourage organized planning rather than chaotic task dumps.
*   **Decoupled Modularity**: Each segment of life (academic, career, finance, planning, memory) is isolated into its own module. Modules communicate through clean, centralized boundaries.
*   **External Memory (No Mental Load)**: Information is captured immediately into the system so that the human brain can be used for *processing*, not *storage*.

---

## 2. Global Layout & User Navigation

The POS is rendered in a premium dark-themed web environment designed for maximum focus.
*   **Sidebar Navigation**: A permanent left-hand navigation panel (retractable on mobile) lets the user hop between modules.
*   **Command Center Panel**: Access via a keyboard shortcut (`Cmd+K` / `Ctrl+K`) or button trigger, enabling the user to run actions, find nodes, and capture data from any screen.
*   **Quick Capture Zone**: A dedicated, distraction-free screen designed for high-speed capture of thoughts, tasks, and bookmarks.

---

## 3. Module Deep-Dive

### Module A: Life Map
The visual mind map at the heart of the POS. It represents Aamir's strategic layout of life.

```
                  [ Center Node: Aamir ]
                           │
             ┌─────────────┴─────────────┐
       [ Pillar: Health ]        [ Pillar: Career ]
                                         │
                                [ Thread: Upskilling ]
                                         │
                                [ Initiative: AI PM ]
                                         │
                         [ Subnode: Learn to Build AI Agent ]
```

*   **Pillars (L2)**: The main departments of life (Health, Career, Growth, Masters, and the system Inbox).
*   **Threads (L3)**: Continuous developmental streams under a pillar (e.g., "Upskilling" under "Career").
*   **Initiatives (L4)**: Medium-term focal goals under a thread (e.g., "AI PM" under "Upskilling").
*   **Subnodes / Execution Nodes (L5)**: The transition point where strategy meets action. Opening an execution node slides out a panel showing:
    *   **Action Checklist**: Sub-tasks for the project.
    *   **Markdown Notes**: Rich-text project summaries.
    *   **Resources**: Document attachments and web links.
*   **Visual Layout**: Strict top-down radial-tree styling where child nodes are balanced and centered horizontally below their parents. Nodes can be collapsed to hide clutter.

---

### Module B: Thought Incubator
A digital holding zone for unorganized thoughts, concepts, and captures.
*   **The Inbox**: A list of raw text items captured on the fly.
*   **Triage Engine**: Thoughts are kept here to prevent them from cluttering the Life Map. Once a week, the user triages this list, doing one of three things:
    1.  **Map It**: Assign it as a new Thread, Initiative, or Subnode under a Life Map pillar.
    2.  **Act On It**: Convert it directly into a Reminder.
    3.  **Discard**: Archive or delete the thought.

---

### Module C: Dashboard (Overview)
A unified workspace dashboard aggregating critical information from other modules for quick daily scanning.
*   **Today's Schedule**: Pulls active personal Google Calendar events.
*   **Latest Roster Updates**: Compiles shifts and highlights changes compared to the previous calendar fetch.
*   **Active Reminders**: Visual checklist of items due today.
*   **Quick Capture Widget**: A textbox to dump thoughts immediately.
*   **Overview Widgets**: Micro-panels for RMIT assignments, Job applications count, and Wishlist items.

---

### Module D: YD Roster & Calendar Integration
Merges retail shift logs with personal scheduling.
*   **Calendar Sync**: Fetches and caches events from Google Calendar.
*   **Shift Tracking & Comparison**: Recognizes retail shifts by searching for the "RETAIL SALES ASSISTANT" title. It compares newly fetched shifts against stored records:
    *   **Shift Added**: Highlights new shifts added to the roster.
    *   **Shift Removed**: Highlights shifts that have been canceled or removed.
    *   **Shift Modified**: Displays changes in shift timings with previous times struck out.
    *   **Earnings Calculator**: Estimates weekly earnings by parsing shift hours, subtracting breaks, and multiplying by pay rates.

---

### Module E: Job Tracker & Chrome Extension
A career planning pipeline linked with a browser extension to capture jobs.
*   **Web Dashboard**: A kanban-style pipeline displaying application statuses:
    `Wishlist` ➔ `Applied` ➔ `Interviewing` ➔ `Offered` ➔ `Rejected`
*   **Browser Extension**: A companion tool that lets Aamir save jobs with one click while browsing sites like LinkedIn or Indeed:
    1.  **One-Click Capture**: Aamir clicks "Capture Job" on a listing.
    2.  **AI Extraction**: The extension runs the page text through an AI model (Chrome's Gemini Nano or cloud APIs) to extract the company, role, location, salary, work mode, and description.
    3.  **SSO Database Sync**: The extension retrieves the login session from the web app's local storage and saves the extracted job details directly to the database.

---

### Module F: RMIT Assignment Tracker
An academic progress manager tailored to RMIT University coursework.
*   **Hierarchy**: Organized by `Semesters` ➔ `Subjects` ➔ `Assignments`.
*   **Grade Projection**: Calculates current grade point averages (GPA) and forecasts grades based on assignment weightings and scores.
*   **Time Management**: Lists coursework deadlines, prioritizing tasks based on due dates and weight.

---

### Module G: Finance Page
A financial dashboard and transaction log.
*   **Transaction Register**: Record of income and expenses.
*   **Auto-Categorization**: Automatically bins transactions into categories (e.g. *Utilities*, *Food*, *Shopping*) by running descriptions through regex heuristics.
*   **Budgeting Alerts**: Displays visual progress indicators for categories to prevent overspending.

---

### Module H: Reminders, Shopping, & Wishlist
*   **Reminders**: Time-sensitive personal action items. Supports mark-as-completed, snooze, and calendar syncing.
*   **Shopping**: Quick checklist of household needs, sorted by department (e.g. *Groceries*, *Pharmacy*).
*   **Wishlist**: Impulse buy blocker. Encourages adding items to a list with price, links, and notes. This delays purchases, helping evaluate if an item is a true need or a fleeting want.
