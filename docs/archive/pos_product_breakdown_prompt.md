# POS (Personal Operating System) - Product Breakdown Prompt

*Instruction to Claude: Please use the following comprehensive details about the POS (Personal Operating System) application to generate a highly detailed, professional product breakdown for my product portfolio. It should highlight the problem it solves, the unique architecture, the AI-first approach, and the specific feature set, following the "recruiter-readable, engineer-respectable" depth rule.*

---

## 1. Product Overview & Vision
**Name:** POS (Personal Operating System)
**Concept:** A highly opinionated, AI-native personal management and productivity ecosystem designed not just to track tasks, but to strategically align daily execution with high-level life domains. 
**Target Audience:** Power users, engineers, and founders who need a "second brain" that acts less like a passive notebook and more like an active, collaborative AI co-founder or mentor.

## 2. Core Architecture & Tech Stack
- **Frontend:** React, TypeScript, Tailwind CSS, Vite.
- **Visual Mapping Engine:** ReactFlow (Custom node implementations, dynamic radial layouts, and interactive canvas).
- **Backend & Database:** Supabase (PostgreSQL), Edge Functions.
- **State Management:** Zustand.
- **AI Integration:** MCP (Model Context Protocol) server exposing local tools to Claude, enabling direct AI interaction with the PostgreSQL database and UI state.

## 3. Key Features & Capabilities

### A. The LifeMap (Visual Goal Architecture)
Unlike standard linear to-do lists, the POS uses a hierarchical node-based visual system:
- **Hierarchy:** Center -> Domains (e.g., Health, Career) -> Projects (e.g., Portfolio Website) -> Milestones / Execution Nodes (e.g., Design System).
- **Dual Views:** Offers both a standard structured list view and an immersive, interactive visual canvas (radial node layout) built on ReactFlow.
- **Focus Mode ("Lock In"):** Users can isolate a specific project to eliminate distractions and dial in on execution.
- **Unified Status System:** Standardized workflow states across all nodes: *Not Started, In Progress, Blocked, Parked, Done, Dropped*.
- **Needs Attention Widget:** A smart, collapsible hovering widget that aggregates tasks requiring immediate attention (e.g., Blocked tasks, decisions needed, or explicitly assigned to the user).

### B. Project Briefs (Strategic Depth)
A robust system for documenting the "Why" and "How" of every project.
- **Comprehensive Schema:** Tracks `one_liner`, `problem`, `my_role`, `outcomes`, `tech_stack`, `features`, `key_decisions`, `repository_url`, `figma_url`, and `live_url`.
- **Slide-out Drawer UI:** Beautifully animated side-drawers for viewing and editing briefs without losing context of the overall LifeMap.
- **"Sticky" Human Data:** A specialized 3-tier database architecture (`lifemap_briefs`, `lifemap_brief_sections`, `lifemap_brief_events`) designed explicitly for human-AI collaboration. If a human writes a section, field-level metadata ensures the AI agent can *never* silently overwrite it.

### C. AI Mentorship & MCP Integration
- **Context-Aware AI:** The system is built to be manipulated by an AI agent (Claude) running locally via MCP.
- **Proactive Suggestions:** The AI can auto-generate project briefs, summarize milestones, and suggest tech stacks based on a few keywords provided by the user.

### D. Extended Ecosystem (Modules)
The POS is built as a highly extensible platform containing various life-management modules:
- **Thought Incubator:** For capturing and maturing raw ideas.
- **Job Tracker:** For managing application pipelines.
- **Finance & Shopping:** For personal resource management.
- **Quick Capture:** Global shortcut for frictionless data entry.

## 4. Crucial UX/UI & Design Decisions
- **Premium Aesthetics:** Heavy emphasis on modern, dark-mode visual excellence. Uses glassmorphism (backdrop blurs), subtle micro-animations, custom scrollbars, and vibrant, curated HSL color gradients to make the app feel "alive".
- **Density vs. Clarity:** Carefully balanced data density. E.g., transitioning complex Milestone nodes into compact summary cards on the visual map, while moving heavy data into side drawers.
- **Interaction Design:** Double-click-to-edit inline titles, distinct visual badges for priorities, and intuitive expand/collapse mechanisms for hierarchical depth.

## 5. The "Engineer-Respectable" Decisions
- **AI-Native Database Schema:** Instead of a simple CRUD table for Project Briefs, the system uses an event-sourced or heavily metadata-tracked table structure to manage conflict resolution between human inputs and AI generations.
- **Event Bubbling Management in ReactFlow:** Complex handling of React DOM events vs. ReactFlow canvas events (`e.stopPropagation()`) to ensure inline UI elements (like dropdowns and buttons inside custom nodes) function perfectly without triggering map drags or node selection.
- **Seamless State Migrations:** Dynamic runtime migrations for backward compatibility (e.g., migrating legacy string statuses like 'active' to strict enum types like 'in_progress' seamlessly through Zustand selectors).

---
*End of Prompt*
