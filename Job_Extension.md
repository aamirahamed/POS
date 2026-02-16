Build a **Chrome browser extension** for my **Personal Operating System (POS)** called **“Save Job to POS”**. The extension must be **AI-powered** and use an AI model to extract job posting details accurately and comprehensively before saving into the POS **Job Tracker**.

## Goal
When I am viewing any job posting page (LinkedIn, Seek, Indeed, company careers pages, etc.), the extension should capture all relevant information with minimal manual effort and save it into the POS Job Tracker reliably.

AI is mandatory. Do not build this as simple selector-based scraping only.

## User Flow
1. I open a job posting page in Chrome.
2. I click the extension icon and press **Capture Job**.
3. The extension uses **AI to extract and structure the job details**.
4. A **preview form** appears with all extracted fields filled in.
5. I can edit fields quickly if needed.
6. I click **Save to POS**.
7. The job is created/updated in POS Job Tracker and I see a success message with an option to open it in POS.

## AI Extraction Requirements
The extension must use AI to:
- Extract structured fields from messy web pages accurately
- Avoid hallucinating or guessing missing data
- Capture all relevant information even if the page layout differs across sites
- Prefer extracting exact text for factual fields
- Produce clean, readable job description text without unrelated page content

If data is not present, AI must return blank or “Unknown”, not guess.

## Fields to Extract (AI must populate when present)
- Company name
- Role title
- Job URL
- Location (city/state/country when possible)
- Work mode: Remote / Hybrid / Onsite / Unknown
- Employment type: Internship / Part-time / Full-time / Contract / Temporary / Unknown
- Salary range (if present) including currency and period (hourly/monthly/annual)
- Full job description (clean text)
- Responsibilities (bulleted list)
- Requirements (bulleted list)
- Skills/keywords (list)
- Experience required (if mentioned)
- Application deadline (if mentioned)
- Source site name (auto-detected)

## Data Quality and Validation Rules
- Do not guess missing fields.
- Factual fields (company, title, location, salary) must be extracted from the page text.
- Generated fields (responsibilities, requirements, skills) must be derived only from the job posting content.
- Remove irrelevant sections like navigation, cookie banners, footers, and unrelated recommendations.
- Show “Missing core fields” warning if title/company/location/description/url are not captured.

## Preview UI Requirements
The extension popup must show:
- A clean editable form with extracted fields
- Confidence indicator per field: High / Medium / Low
- Highlight missing or low-confidence fields
- Buttons:
  - Capture Job
  - Re-capture
  - Save to POS
  - Cancel

Allow choosing initial pipeline stage before saving:
Wishlist / Applied / Interviewing / Offer / Rejected

Default stage: Wishlist.

## POS Integration Requirements
- On Save, create a new Job Opportunity in POS Job Tracker using the extracted data.
- If the same URL already exists in POS, detect it and update the existing entry instead of creating a duplicate (show a confirmation before updating).

## Error Handling
- If capture fails, show a clear error and allow retry.
- If the page does not look like a job posting, warn me but still allow manual save with minimal fields (title + URL).
- If AI returns uncertain results, still show the preview but flag low-confidence fields clearly.

## Design Requirements
- Dark theme
- Minimal, premium UI
- Fast interaction
- No clutter

## Scope Boundaries
Do NOT build:
- Background crawling
- Bulk scraping
- Auto-search job feeds
- Notifications or alerts
Only user-initiated capture from the page I am currently viewing.

Deliver a fully working extension that uses AI extraction, shows a preview, allows edits, and saves reliably into POS Job Tracker.
