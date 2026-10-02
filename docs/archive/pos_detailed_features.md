# Exhaustive Breakdown of Built Features in POS App

Based on a complete codebase audit, below is a comprehensive, module-by-module documentation of every feature built in the POS application, detailing what it does, the underlying data it tracks, and how it functions visually and interactively.

*(Note: "Quick Capture" and "Thought Incubator" have been omitted as requested).*

---

## 1. Application Layout & Navigation
### Architecture & Routing
- **Active Routes (`App.tsx`)**:
  - `/` -> Overview Dashboard
  - `/life-map` -> Interactive Radial & Domain Life Map
  - `/briefs` -> Project Briefs Portfolio/CV Aggregator
  - `/mentor` -> Life Map AI Mentor & Strategic Auditor
  - `/reminders` -> Reminders & Time-based To-dos
  - `/wishlist` -> 4-Bucket Decision Matrix Wishlist
  - `/tracker` -> Masters Academic Assessment Tracker
  - `/jobs` -> Job Search Kanban & Pipeline Tracker
  - `/shopping` -> Grocery & Shopping List
  - `/finance` -> Live Bank Sync, Pay Cycle & Discretionary Spend Engine
- **Global Navigation (`MainLayout.tsx`)**:
  - Desktop Sidebar drawer listing all active routes with icons and user badge ("Aamir").
  - Global AI Command Center floating action button (FAB) accessible anywhere via `Cmd+K` or `Ctrl+K`.

---

## 2. Authentication & Profile Fact Store
### `AuthWrapper.tsx`
- **What it does**: Controls app-wide user access powered by Supabase Auth.
- **Data Tracked**: Supabase `Session` object. Persists Google OAuth Access/Refresh tokens for calendar integration (`user_google_tokens`).
- **Features**: Email/Password login, 1-Click "Continue with Google" OAuth.

### Profile Memory (`useProfileStore.ts`)
- **What it does**: Stores user background facts and context key-value pairs (`user_facts` table) utilized by the AI mentor.
- **Data Tracked**: Open-ended `facts` record (e.g., career preferences, bio, location).

---

## 3. Overview Dashboard (`DashboardPage.tsx`)
- **What it does**: Centralized operational command center aggregating live status across modules.
- **Visual & Interactive Features**:
  - **Greeting & Live Clock**: Dynamic greeting with current date, live HH:MM clock, and quick stats (Active Reminders, Focuses, Backlog count).
  - **Today's Focus**: Card list allowing users to pin active Projects/Milestones directly from the Life Map for daily execution.
  - **Active Reminders Widget**: Embedded view of pending reminders with inline completion checkboxes.
  - **Operational Awareness Zone**:
    - **Google Calendar Sync**: Connection status and sync trigger.
    - **Youth Dimension (YD) Shift Roster & Earnings Engine**: Integrates shift schedules, calculates paid hours, penalty rates, and gross/net estimated earnings.
    - **Hours & Earnings Trend Chart**: Recharts area graph displaying weekly hours/net earnings trends (past, current, upcoming) with delta insights.
  - **Assistant Suggestions Panel**: Contextual AI recommendations based on backlog density.

---

## 4. Life Map (`LifeMap.tsx`)
- **What it does**: Represents the user's complete life architecture as a visual hierarchical node graph (Center -> Domains -> Projects -> Milestones) supporting tree editing, contextual context canvases, resource attachments, and AI manipulation.
- **Data Tracked (`useLifeMapStore.ts`)**: Node types (`domain`, `project`, `milestone`), statuses (`not_started`, `in_progress`, `blocked`, `parked`, `done`, `dropped`), priorities, tasks, canvases, resources (YouTube, articles), and streaks.
- **Visual & Interactive Views**:
  1. **Domains List View (`DomainsView.tsx`)**: Structured card-based view grouped by Life Domains. Interactive status badge dropdowns, progress bars, inline creation, and drag-and-drop ordering.
  2. **ReactFlow Visual Canvas Map**: Interactive radial graph using custom nodes (`DomainNode`, `ProjectNode`, `MilestoneNode`). Features pan/zoom, mini-map, and custom algorithmic radial layout.
  3. **Focus Mode View**: Isolates a single selected project and its child milestones to eliminate distractions.
  4. **Activity Log View**: Timeline feed tracking historical edits, completions, and layout changes.
  5. **Needs-You Banner (`NeedsYouBanner.tsx`)**: Smart, collapsible alert bar highlighting blocked tasks, required decisions, or tasks specifically assigned to the user.
- **Drawers & Modals**:
  - **Execution Node Drawer**: Full slide-over inspector for deep-work. Allows editing title, priority, status overrides, actionable checklist items (assigned to Me vs. Claude), resource attachments, and rich text notes.
  - **Project Brief Drawer**: Structured editor for project strategy (One-liner, Problem statement, Key tech stack, Impact/outcomes, GitHub link). Uses an AI-native 3-tier database to ensure human edits are "sticky" and never overwritten by the AI.

---

## 5. POS AI Command Center (`CommandCenter.tsx`)
- **What it does**: Global multi-turn AI Assistant (Sam) accessible from anywhere in the app (`Cmd+K`).
- **Capabilities (`agentService.ts`)**: Executes natural language commands to inspect or mutate state. Features multi-step tool orchestration with transparent status logs (e.g., "Adding to shopping list...", "Creating new LifeMap project...").

---

## 6. Life Map Mentor (`MentorPage.tsx`)
- **What it does**: AI Strategic Advisor (powered by Gemini 2.5/Flash) that audits the Life Map, identifies imbalances, and offers actionable structural recommendations.
- **Visual & Interactive Features**:
  - **Audit Dashboard**: Real-time structural analysis with visual progress bars showing node density across domains (Balance Ratios).
  - **1-Click AI Suggestions**: Interactive cards displaying recommended roadmap additions with a 1-click "Apply Suggestion" button that automatically creates the node/task in the Life Map.
  - **Profile Memory Editor**: Editable text card allowing users to update background facts used by the AI during coaching.

---

## 7. Project Briefs Aggregator (`BriefsPage.tsx`)
- **What it does**: Consolidates all Project Briefs created within the Life Map into a single portfolio & CV source view.
- **Visual & Interactive Features**: Search bar filtering by project name/one-liner. Project brief cards highlighting stage badges, completion status indicators (missing fields), and stale review flags (> 30 days since last review).

---

## 8. Finance & Bank Sync (`FinancePage.tsx`)
- **What it does**: Full personal finance management system.
- **Data Tracked (`useFinanceStore.ts`)**: Bank accounts, transactions, category corrections.
- **Visual & Interactive Features**:
  - **Live Bank Sync**: Tab bar showing connected accounts with real-time balances, powered by a Redbark serverless API integration.
  - **Pay Cycle Summary Bar**: Automatically detects salary cycles and calculates total income, fixed expenses, discretionary safe spend limits, and remaining daily allowance.
  - **Category Breakdown**: Donut/bar charts detailing spending across categories.
  - **Weekly Snapshot**: Comparison of current vs. previous week spending trends with percentage deltas.
  - **Transaction List**: Interactive table with inline category re-assignment that saves overrides for future syncs.

---

## 9. Job Tracker (`JobTrackerPage.tsx`)
- **What it does**: Comprehensive job application and career opportunity pipeline manager.
- **Data Tracked (`useJobTrackerStore.ts`)**: Jobs (company, role, status, salary, mode), activity logs, interview rounds, offers.
- **Visual & Interactive Features**:
  - **Dual View**: 
    - Kanban Board with drag-and-drop columns (Wishlist, Applied, Interviewing, Offer, Rejected).
    - Searchable Data Table list view.
  - **Job Detail Sheet**: Slide-over drawer managing application notes, activity timeline logs, interview rounds (pending/pass/fail), and offer details.

---

## 10. Masters Assignment Tracker (`AssignmentTracker.tsx`)
- **What it does**: Academic assessment tracker built specifically for university/Masters coursework.
- **Data Tracked (`useAssignments.ts`)**: Semesters, assignments (due dates, contribution weight %, individual/group).
- **Visual & Interactive Features**:
  - **Dashboard View**: Shows total progress, subject progress bars, and draggable timeline cards.
  - **Assignment Buckets Bar**: Proximity bucket classification highlighting urgency (< 3 days, 1-2 weeks, > 2 weeks).
  - **Assignment List**: Sortable table view with completion checkboxes and inline edit modals.
  - **Subject Settings**: Dialog to manage academic subject names and custom color tags.

---

## 11. Reminders (`Reminders.tsx`)
- **What it does**: Task and time-based reminder system synchronized with Supabase.
- **Visual & Interactive Features**:
  - Quick-add reminder input bar.
  - **15-Day Date Selector**: Scrollable horizontal pill bar allowing quick date selection.
  - **Time Preset Selector**: Quick buttons for time presets (Morning, Noon, Afternoon, Evening, Night).
  - Filtered lists automatically highlighting overdue reminders in red/amber.

---

## 12. Shopping List (`ShoppingListPage.tsx`)
- **What it does**: Quick grocery and item shopping manager.
- **Visual & Interactive Features**:
  - Optimistic UI input bar.
  - **Recurring Item Toggle**: Allows marking staple items (e.g., milk) as recurring.
  - Separate sections for Active items vs. Completed items with a "Clear Completed" quick reset button.

---

## 13. Decision Matrix Wishlist (`Wishlist.tsx`)
- **What it does**: Strategic purchase planning wishlist with a composite decision matrix scoring algorithm.
- **Data Tracked (`useWishlistStore.ts`)**: Wishlist items, prices, 4-tier priority buckets, 1-5 scoring metrics (Impact, Urgency, Frequency).
- **Visual & Interactive Features**:
  - **Header Financial Metrics**: Live calculation of Total Estimated Volume ($) vs. Total Purchased Spend ($).
  - **4-Bucket Kanban Board**: Columns for *Need Now*, *Need Next*, *Nice to Have*, and *Dream*.
  - **Auto-Sorting Algorithm**: Items within columns automatically sort based on composite score: `Score = Impact + Urgency + Frequency`.
  - **Item Modals**: Interactive 1-5 slider controls for calculating item scores visually.

---
*End of Document*
