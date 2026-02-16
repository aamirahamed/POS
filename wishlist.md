# MODULE: Shopping Wish List

## Purpose

The Shopping Wish List module is designed to help prioritize and organize items I wish to buy.

This is NOT a cart.
This is NOT an impulsive buying tool.

The purpose is to:
- Capture desired purchases with links and details
- Categorize them into meaningful buckets
- Rank them based on importance
- Understand how much money needs to be saved
- Make intentional buying decisions

The goal is clarity and prioritization, not urgency.

---

# Core Concept

Each entry is a “Wish Item”.

A Wish Item must support:

- Item name
- Link (URL)
- Estimated price
- Category
- Priority bucket
- Optional notes
- Status

---

# Priority Buckets

Each item must belong to one of the following buckets:

1. Need Now  
2. Need Next  
3. Nice to Have  
4. Dream / Long-Term  

Items must be movable between buckets.

The UI should allow quick reassignment.

---

# Categories

Allow categorization into:

- Tech & Gadgets
- Health & Fitness
- Education & Courses
- Clothing & Accessories
- Home & Lifestyle
- Travel
- Gifts
- Other

Categories must be editable in future, but for MVP use these defaults.

---

# Ranking System

Each Wish Item should allow rating on:

- Impact (1–5)
- Urgency (1–5)
- Frequency of use (1–5)

Total score = sum of these ratings.

Items within a bucket can be sorted by total score.

Higher score = higher priority.

---

# Status Flow

Each item must support:

- Considering
- Shortlisted
- Planned
- Bought
- Dropped

Behavior:

- Only Shortlisted and Planned items count toward savings targets.
- Bought items move to a “Purchased” section.
- Dropped items move to archive but remain viewable.

---

# Savings Overview

The module should display:

- Total estimated cost per bucket
- Total estimated cost overall
- Optional manual “Saved Amount” field per bucket
- Remaining amount to reach bucket goal

# Shopping Wish List – UI Requirement

Design the Shopping Wish List page using four clearly separated visual blocks arranged in a clean grid layout.

The four blocks must be:

- Need Now
- Need Next
- Nice to Have
- Dream / Long-Term

Each block should function as a container that displays a list of Wish Items belonging to that bucket.

Inside each block, each item should display:
- Item name
- Estimated price
- Rank score
- Status
- Quick action menu (edit / move / delete)

The layout must be:
- Dark theme
- Clean, minimal
- Card-style blocks with clear spacing
- Scrollable within each block if many items exist
- Visually balanced and not cluttered

This should feel structured and premium, not like a basic list.