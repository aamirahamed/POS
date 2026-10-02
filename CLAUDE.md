# POS (Personal Operating System)

Aamir's personal tool: a Life Map (Domain → Project → Milestone → Task) plus dashboard, reminders, finance, job tracker, wishlist, shopping, and an AI assistant. Built originally with Antigravity; being cleaned up and extended with Claude Code. Single user, Melbourne.

**Work plan lives in [BACKLOG.md](BACKLOG.md).** Check it before starting anything, and update statuses as items finish. Older design docs are in `docs/` (`archive/` is stale; `specs/` holds the Life Map upgrade prompts, only partly implemented, and the Brain Gym spec). Personal material (profile, portfolio, career history) lives in `private/`, which is gitignored: never move it into tracked folders, because the GitHub repo is public.

## Layout

- `pos-app/`: the web app (React 19, Vite, Tailwind 4, Zustand, React Flow, Supabase). Deployed on Vercel at pos-system-three.vercel.app.
  - `src/modules/<feature>/`: one folder per page. `src/store/`: Zustand stores. `src/services/`: Supabase access and the Sam agent (`services/agent/`).
  - `mcp-server/`: local MCP server (stdio) that lets Claude read and edit the Life Map and Project Briefs. Registered as `pos`.
  - `supabase/`: `migrations/` (one baseline plus anything newer) and `functions/` (`refresh-google-token`, `sync-redbark`).
- `pos-extension/`: Chrome extension that saves job postings into the `jobs` table.
- `SemesterTracker/` is gitignored and no longer part of POS.

## Commands (run in `pos-app/`)

- `npm run dev` (port 5173), `npm run build` (runs `tsc -b`), `npx vitest run`, `npx eslint .`
- MCP server: `cd mcp-server && npm run build`. Claude runs `build/index.js`, so **rebuild after editing `mcp-server/src`**, then restart the MCP connection.
- Supabase CLI is linked to project `iykdzhvlgraafoalzlbf`. `supabase db dump` and related commands need Docker; the binary is at `/Applications/Docker.app/Contents/Resources/bin` and may not be on PATH.

## Things to know

- **Life Map storage:** the whole map is one JSON row per user in `life_maps`, saved wholesale by both the web app and the MCP server, so the last writer wins. Splitting it into per-node rows is backlog item S6.
- **Two separate AIs:** Sam (Cmd+K in the app, Gemini, runs in the browser, key exposed) and Claude (via the MCP server, writes straight to the database). Unifying them is parked (A2).
- **Legacy inbox IDs:** the live map still has `pillar-inbox`, `initiative-inbox`, `subnode-inbox`. Code handles both old and new names; don't remove that until the IDs are renamed during S6.
- **Statuses:** the model is `not_started | in_progress | blocked | parked | done | dropped`, with a tested derivation in `src/utils/lifemapDerivation.ts`, but many screens still use old values (`active`, `backlog`, `completed`). Backlog item A4.
- **Altitude rule for map text:** Life Map tasks describe what is happening, never how it is built. Project Briefs may name the stack but stop before implementation detail.
- TypeScript is strict with `noUnusedLocals`; path alias `@/` maps to `src/`. ESLint has a known backlog of errors (174 on 2026-10-02): don't add new ones.
- Never print or commit `.env` values or the service-role key. Secrets used by the MCP server live in the Claude config, not the repo.
- Deleting deployed Supabase resources is blocked for Claude by the permission system; leave those for Aamir to do in the dashboard.
- Aamir reviews app changes in a local dev server before anything is committed.
