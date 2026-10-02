# Personal Operating System (POS) – Codebase & Architecture Specification

This document provides a comprehensive technical overview of the Personal Operating System (POS) project. It describes the system architecture, modular features, database schemas, frontend-extension SSO integration, and core algorithms. 

---

## 1. Project Overview & Core Philosophy
The **Personal Operating System (POS)** is a modular web-based platform designed to structure, organize, and manage different dimensions of personal life (strategic thinking, operational execution, external memory, finance, and career planning).

### Design Philosophy
*   **Decoupled Modules**: Each feature (Life Map, Finance, Reminders, etc.) functions as an independent block.
*   **Separation of Strategy and Execution**: Strategic nodes in the **Life Map** branch down into concrete, actionable **Execution Nodes (Subnodes)** that link directly to other operational screens.
*   **Calm Aesthetics**: Features a premium, high-contrast dark theme with glassmorphism, subtle micro-animations (Framer Motion), and strict Z-index layering.

---

## 2. Technical Stack
*   **Core Frontend**: React 19, TypeScript 5.9, Vite 7.3, React Router DOM 7.
*   **Styling**: TailwindCSS 4, Custom Vanilla CSS rules, Lucide React (icons).
*   **State Management**: Zustand 5 with local persistence middleware.
*   **Backend & Authentication**: Supabase (PostgreSQL database, Row Level Security, Edge Functions).
*   **Mind Map Visualizer**: `@xyflow/react` (React Flow v12) for rendering interactive hierarchies.
*   **Chrome Extension**: MV3 (Manifest V3), TypeScript, Chrome Scripting & Storage API, Chrome Built-in AI (Gemini Nano) and Cloud AI fallbacks.

---

## 3. Directory Layout

```
POS/
├── codebase_architecture.md         # This architectural manual
├── pos-app/                         # Web Application
│   ├── src/
│   │   ├── components/              # Shared UI design system tokens (buttons, toaster, etc.)
│   │   ├── hooks/                   # Global React hooks
│   │   ├── layouts/                 # MainLayout shell, responsive menu drawer, CommandCenter integration
│   │   ├── lib/                     # Supabase JS client configuration
│   │   ├── modules/                 # App Features (auth, dashboard, lifemap, capture, etc.)
│   │   ├── services/                # Supabase database interfaces
│   │   ├── store/                   # Zustand stores (useCalendarStore, useLifeMapStore, etc.)
│   │   ├── types/                   # TypeScript interfaces
│   │   └── utils/                   # Shared utility engines (earnings calculations, layouts, etc.)
│   ├── supabase/                    # Backend Configuration
│   │   ├── config.toml              # Edge Functions registry
│   │   └── functions/               # Deno DRL Edge Functions
│   │       ├── daily-lifemap-summary/
│   │       └── refresh-google-token/
│   └── test_db_local.js             # Local environment test file
└── pos-extension/                   # Companion Browser Extension
    ├── manifest.json                # MV3 extension setup
    └── src/
        ├── background/              # Background service workers
        ├── content/                 # Site scraping (LinkedIn, Indeed, Prosple, GradConnection) & Auth Sync
        ├── popup/                   # Capture UI, AI extraction interface, and settings
        └── lib/                     # Gemini Nano / OpenAI client integration
```

---

## 4. System Architecture & Auth Sync (SSO)

The project leverages a custom **Single Sign-On (SSO) SSO-bridging bridge** between the web app and the Chrome extension, removing the need for double logins.

```
┌────────────────────────────────┐            ┌────────────────────────────────┐
│         Chrome Extension       │            │         POS Web App            │
│ ┌────────────────────────────┐ │            │ ┌────────────────────────────┐ │
│ │      popup/App.tsx         │ │            │ │    AuthWrapper.tsx         │ │
│ └──────────────┬─────────────┘ │            │ └──────────────┬─────────────┘ │
│                │               │            │                │               │
│      Sends session request     │            │   Saves session in LocalStr    │
│                │               │            │   (key: sb-*-auth-token)       │
│                ▼               │            │                ▲               │
│ ┌────────────────────────────┐ │            │                │               │
│ │   content/auth-sync.ts     │─┼────────────┼────────────────┘               │
│ └────────────────────────────┘ │            │  Reads localStorage            │
│                                │            │                                │
└────────────────────────────────┘            └────────────────────────────────┘
```

1.  **Storage Access**: When the user opens the extension popup, a content script (`auth-sync.ts`) is executed on the domain hosting the POS web app.
2.  **Bridging**: `auth-sync.ts` scans the browser's `localStorage` for keys matching `sb-*-auth-token` (the standard Supabase JWT key format).
3.  **SSO Activation**: The token is passed back to the extension popup, letting the extension construct an identical Supabase Client instance under the same authenticated session.

---

## 5. Database Schema (Supabase PostgreSQL)

Row Level Security (RLS) is strictly enforced on all tables so users can only access rows matching `auth.uid() = user_id`.

### Core Tables & Structs

#### `user_google_tokens`
Stores the Google OAuth tokens required for background Google Calendar integration.
*   `user_id` (UUID, Primary Key, foreign key to `auth.users`)
*   `access_token` (Text, encrypted on backend)
*   `refresh_token` (Text, Google offline token)
*   `expires_at` (Timestamp with timezone)
*   `updated_at` (Timestamp with timezone)

#### `life_maps`
Stores the mind map JSON state.
*   `id` (UUID, Primary Key)
*   `user_id` (UUID, Unique)
*   `nodes` (JSONB Array) - Array of `LifeMapNode` elements
*   `edges` (JSONB Array) - Array of connection links
*   `updated_at` (Timestamp with timezone)

#### `calendar_events` & `yd_shifts`
*   `calendar_events`: Caches raw events loaded from Google Calendar.
*   `yd_shifts`: Stores shift comparison statuses (`unchanged`, `added`, `removed`, `modified`) and comparison offsets.

#### `reminders`
*   `id` (UUID, Primary Key)
*   `user_id` (UUID)
*   `text` (Text)
*   `due_date` (Timestamp)
*   `completed` (Boolean)

#### `shopping_items` & `wishlist_items`
*   `shopping_items`: Simple shopping logs (`name`, `quantity`, `category`, `completed`).
*   `wishlist_items`: Items you want to purchase (`name`, `price`, `url`, `notes`).

#### `jobs`
*   `id` (UUID, Primary Key)
*   `user_id` (UUID)
*   `company` (Text)
*   `role` (Text)
*   `location` (Text)
*   `status` (Text: `wishlist`, `applied`, `interviewing`, `offered`, `rejected`)
*   `url` (Text)
*   `source` (Text: e.g. "LinkedIn")
*   `description` (Text)

---

## 6. Functional Core Modules (Web Application)

### A. Life Map (`lifemap`)
The visual core of the POS, rendering the hierarchy of strategic planning using `@xyflow/react`.

#### 1. Node Types
The map enforces a strict 5-level hierarchy:
1.  **Center (`center`)**: Static center node labeled "Aamir".
2.  **Pillar (`pillar`)**: Broad life departments (Health, Career, Growth, Masters, Inbox).
3.  **Thread (`thread`)**: Long-term streams under a pillar (e.g., "Upskilling" under "Career").
4.  **Initiative (`initiative`)**: Goals currently targeted (e.g., "Build AI Agent" under "Upskilling").
5.  **Subnode (`subnode` / Execution Node)**: Concrete execution projects containing custom lists, markdown notes, and resource attachments (e.g., "Kaggle Google Agent Course").

#### 2. Layout Algorithm (`pos-app/src/utils/layout.ts`)
Calculates coordinates using a Top-Down Tree structure to center items cleanly and avoid overlaps.
*   **Subtree Width Calculation**: Starting at the leaf nodes, it recursively checks children count, nodes dimensions, and sibling gaps (`SIBLING_GAP = 120`) to calculate a subtree bounding-width.
*   **Coordinate Assignment**: Moves down from the center node, centering each child's block vertically (`LEVEL_HEIGHT = 280`) and horizontally below its parent.
*   **Z-Index Hierarchy**: Strict layering is enforced (`center: 100` > `pillar: 50` > `thread: 40` > `initiative: 30` > `subnode: 20`) to keep connectors flowing neatly beneath nodes.

#### 3. Command Center (`lifemap/components/CommandCenter.tsx`)
A sliding keyboard-focused drawer that allows users to quickly add items anywhere in the tree structure, run commands, and execute tree actions.

#### 4. Inbox Self-Healing
An automatic inbox node safeguard (`ensureInboxExists`) resides in `useLifeMapStore.ts`. On database loads, it verifies the existence of `pillar-inbox`, `thread-inbox`, `initiative-inbox`, and `subnode-inbox`. If any node or connecting edge is missing, it regenerates the node and reapplies the layout automatically.

---

### B. Dashboard Calendar & YD Roster Sync (`dashboard`)
Integrates personal Google Calendar logs and shift management.

#### 1. YD Roster Hours Comparison (`useCalendarStore.ts`)
Compiles roster shift changes across sync calls:
*   **Date-Based Matching**: Matches newly fetched calendar items against previously stored shifts using local date strings (`YYYY-MM-DD`) instead of event IDs.
*   **Timezone Correction**: Compares start and end timestamps converted to absolute UTC epoch milliseconds (`new Date().getTime()`) to prevent false differences caused by timezone offset disparities.
*   **Past Safeguard**: Automatically marks any completed past shifts (where `endTime` is in the past) as `unchanged` to prevent roster history changes.
*   **Roster Updates Box**: If changes occur, the dashboard builds a natural language summary (e.g., *"Friday shift of 3 hours removed, Monday shift added worth 4 hours (+1 hour net change)"*). Rescheduling updates with identical durations (0-hour changes) are skipped in the summary.

#### 2. Secure Token Refresh Flow (`refresh-google-token`)
Implements Google OAuth token renewals without exposing Google's Client Secret in the frontend:
1.  Frontend checks the token's validity using `getOrRefreshToken()` in `useCalendarStore.ts`.
2.  If the token expires in less than 5 minutes, the store invokes the `refresh-google-token` Edge Function.
3.  The Edge Function validates the client's Supabase JWT, retrieves the `refresh_token` from the database, issues a POST request to Google's token endpoint (`https://oauth2.googleapis.com/token`) with the secure backend `GOOGLE_CLIENT_SECRET`, updates the database, and returns the new token.

---

### C. Quick Capture & Thought Incubator (`capture`, `incubator`)
*   **Quick Capture**: Single page capture system where items can be written and assigned directly to Execution Nodes. It uses a recursive helper `resolveNodePath()` to build clean breadcrumb strings (e.g., `Career > Upskilling > Build AI Agent`).
*   **Thought Incubator**: Captures raw thoughts, letting you triage items later by turning them into nodes or assigning them to existing threads.

---

### D. RMIT Assignment Tracker (`tracker`)
Tracks university coursework by organizing items into a hierarchy of `Semesters` -> `Subjects` -> `Assignments`. It includes calculators for weighting, grades, and calendar scheduling.

---

### E. Finance Tracker (`finance`)
A transaction visualizer and budget analyzer.
*   **Classifier Heuristic**: Categorizes arbitrary spending descriptions into bins like *Food*, *Transport*, *Shopping*, *Health*, *Utilities*, and *Bills* using case-insensitive regex patterns (e.g., `[/pharmacy/i, /chemist/i] -> 'Health'`).
*   **Analytics**: Groups and plots spending trends using Recharts.

---

## 7. Chrome Extension Architecture (`pos-extension`)

An MV3 companion extension that extracts job details from pages and saves them to the POS dashboard database.

```
                                      ┌──────────────────────────┐
                                      │  Google / OpenAI API     │
                                      └─────────────▲────────────┘
                                                    │
                                             API HTTP request
                                                    │
┌──────────────────────────┐  Scrapes text   ┌──────┴───────────────────┐  Inserts Job  ┌──────────────────────────┐
│  Target Job Description  ├────────────────►│   extension/popup/App    ├──────────────►│    Supabase PostgreSQL   │
│  (LinkedIn, Indeed, etc.)│                 └──────────────────────────┘               │    (jobs table)          │
└──────────────────────────┘                                                            └──────────────────────────┘
```

### Content Script Scraper (`content/index.ts`)
*   Optimized selectors slice the DOM of major portals (LinkedIn: `.jobs-description__content`, Indeed: `#jobDescriptionText`) to clean up clutter.
*   Strips noisy inline scripting, buttons, and SVGs to compile clean layout text.

### AI Extraction Engine (`lib/ai.ts`)
*   Converts clean page text into structured JSON matching the `JobData` interface.
*   **Chrome Built-in AI**: Uses Chrome's experimental local LLM interface (`window.ai.createTextSession()`) if active to parse text locally.
*   **Cloud Fallback**: Automatically falls back to cloud providers (OpenAI GPT or Google Gemini API) if local execution is unavailable.
