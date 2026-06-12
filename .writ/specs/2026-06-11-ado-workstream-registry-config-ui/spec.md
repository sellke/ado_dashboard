# ADO Workstream Registry Config UI

> **Status:** Not Started
> **Created:** 2026-06-11
> **Owner:** @AdamSellke
> **Origin:** `/edit-spec` — replace hardcoded `SYNC_CONFIG.workstreams` with in-app configuration

## Specification Contract

**Deliverable:** A database-persisted **Workstream Registry** admin panel that lets operators
define which Azure DevOps boards/teams map to dashboard workstreams — org → project → team/board
+ area path — with full CRUD and live ADO pickers. Sync reads the registry on the next
**Sync Now**; seeded defaults reproduce today's hardcoded `SYNC_CONFIG` exactly.

**Must Include:** Full add/edit/remove workstream flows, live ADO project + team discovery,
persistence on `Workstream` + program-level sync settings, and a sync refactor that removes
the hardcoded workstream array from `lib/sync/config.ts`.

**Hardest Constraint:** The sync pipeline today assumes a single org (from `ADO_ORG` env),
one project, one umbrella iteration team, and five hardcoded sub-teams with derived area paths.
Moving to DB-backed config without breaking existing synced data or dashboard scope semantics
requires careful seed migration and guarded delete behavior.

### 🎯 Experience Design

- **Entry point:** A **Workstream Registry** action in the dashboard settings area (coordinate
  placement with Workstream Scope modal and Metric Configuration panel).
- **Happy path:** Open registry → see list of workstreams → Add or Edit → pick Project → pick
  Team/Board from live ADO list → confirm/edit area path → Save → success toast. Changes apply
  on next Sync Now.
- **Moment of truth:** After the next sync, the new/changed workstream appears in
  `GET /api/workstreams`, the dashboard scope modal, and metric cards with data from the
  configured ADO board.
- **Feedback model:** Mantine toast on save/delete; inline validation on required fields;
  delete confirmation dialog explaining sync impact.
- **Error experience:** ADO discovery failures show recoverable errors with retry; invalid
  team GUID or unreachable area path blocks Save with a clear message; delete blocked (409)
  when workstream has synced data — UI offers **Disable sync** instead.

### 📋 Business Rules

- **Defaults match current behavior.** Seed `Workstream` rows and `SyncProgramConfig` from
  today's `SYNC_CONFIG` + `prisma/seed.ts` workstreams so a fresh DB syncs identically.
- **Org source:** `adoOrg` defaults from `ADO_ORG` env at seed time; stored on each workstream
  and on `SyncProgramConfig` for consistency. No multi-org switching UI in v1.
- **Required fields per workstream:** `name`, `adoOrg`, `adoProject`, `adoTeamId`, `adoAreaPath`.
- **Area path:** Full ADO area path string (not suffix-only). Live team picker may suggest a
  default area path; user can override before Save.
- **Program settings (`SyncProgramConfig` singleton):** `adoProject`, `iterationTeamId`,
  `lookbackSprintCount` (default 5). Replaces hardcoded `SYNC_CONFIG.projectNameOrId`,
  `iterationTeamId`, `lookbackSprintCount`.
- **Delete guard:** Hard DELETE blocked when related work items, snapshots, or milestones exist
  (409). Offer `syncEnabled: false` to exclude from sync without data loss.
- **Sync timing:** Mapping changes take effect on **next Sync Now** only — no auto-sync on save.
- **Permissions:** Soft gate (save-confirm). No auth model built (none exists today).
- **Dashboard scope unchanged:** Browser-local include/exclude (`2026-05-27-dashboard-workstream-config-ui`)
  continues to filter visibility; this spec controls **which workstreams exist and sync**.

**Success Criteria:**

1. Fresh DB seeded with defaults syncs the same five workstreams as today's hardcoded config.
2. Adding a sixth workstream via UI + next sync ingests its ADO data without code changes.
3. Editing a workstream's `adoTeamId` + area path + next sync pulls data from the new board.
4. `SYNC_CONFIG.workstreams` array removed; sync reads exclusively from DB.

**Scope Boundaries:**

- **Included:** schema migration + seed, ADO discovery APIs, workstream registry CRUD APIs,
  admin UI with live pickers, sync orchestrator refactor, regression tests.
- **Excluded:** multi-org tenant switching, auth/permissions, auto-sync on save, changing
  iteration selection algorithm, dashboard include/exclude scope (stays browser-local).

### ⚠️ Cross-Spec Overlap

- **`2026-05-27-dashboard-workstream-config-ui`** (Complete) — `GET /api/workstreams` and scope
  modal consume the registry; extend response shape only; do not change scope semantics.
- **`2026-02-11-ado-data-sync`** (Complete) — this spec replaces its hardcoded workstream source;
  sync behavior otherwise unchanged.
- **`2026-05-28-metric-calculation-config-ui`** (Not Started) — coordinate settings entry points.

## Detailed Requirements

### Current vs target

| Concern | Today | Target |
|---|---|---|
| Workstream list | Hardcoded in `SYNC_CONFIG.workstreams` | `Workstream` DB rows |
| Team/board ID | In config TS, not in DB | `Workstream.adoTeamId` |
| Project / org | Hardcoded / env only | `SyncProgramConfig` + per-row `adoOrg`/`adoProject` |
| Area path | Built from suffix in orchestrator | Stored full path on `Workstream.adoAreaPath` |
| Iteration team | `SYNC_CONFIG.iterationTeamId` | `SyncProgramConfig.iterationTeamId` |
| Admin UI | None — requires code edit | Workstream Registry panel |

### Implementation approach

1. Extend Prisma models; seed from `SYNC_CONFIG` + existing seed workstreams.
2. Add ADO client helpers: list projects, list teams for project (REST API).
3. Add registry CRUD + discovery API routes.
4. Build admin UI with cascade pickers and validation.
5. Refactor sync to load program config + enabled workstreams from DB; remove hardcoded array.
6. Regression: default seed → sync → same workstream count and area paths as before.

See `sub-specs/database-schema.md`, `sub-specs/api-spec.md`, `sub-specs/technical-spec.md`.

## Story Map

| # | Story | Delivers |
|---|---|---|
| 1 | Schema, migration & seeded defaults | DB models + zero-drift seed |
| 2 | ADO discovery API | Live project/team pickers |
| 3 | Workstream registry CRUD API | GET/POST/PUT/DELETE + validation |
| 4 | Registry admin UI | Full CRUD with live pickers |
| 5 | Sync refactor & regression | DB-driven sync; remove hardcoded config |
