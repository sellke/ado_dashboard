# Accurate Current Sprint Identification

> **Status:** Complete
> **Created:** 2026-06-22
> **Owner:** @AdamSellke
> **Origin:** Promoted from issue: `.writ/issues/improvements/2026-06-22-accurate-current-sprint.md`
> **Contract Locked:** yes

## Specification Contract

**Deliverable:** Unify current-sprint identification by persisting ADO's `isCurrent` on `Sprint` during sync and routing all read paths through a shared `resolveCurrentSprint()` resolver with validated fallbacks.

**Must Include:** One resolver used by sync, metrics API, stories API, snapshot computation, and dashboard default sprint selection — not three independent date-range checks.

**Hardest Constraint:** ADO's `isCurrent` is only available at sync time; read paths must rely on the persisted flag plus date validation without live ADO calls.

### Experience Design

- **Entry point:** User opens dashboard with no `sprintId` query param (default load).
- **Happy path:** Dashboard loads the true current sprint tab; charts show projected vs actual correctly; "(current)" badge matches the active sprint.
- **Moment of truth:** First paint shows the in-progress sprint, not whichever sprint was computed most recently.
- **Feedback model:** No new UI — correct tab/badge/chart mode is the feedback.
- **Error experience:** If no sprints exist, existing empty-state behavior; no new error surfaces for stale ADO flags (silent fallback to date match → most recent past).

### Business Rules

**Resolver priority (single authoritative rule):**

1. **ADO flag (validated):** Sprint with persisted `isCurrent === true` where `startDate <= now` and `endDate >= now`. If `endDate < now`, treat the flag as stale and fall through.
2. **Date-range match:** Sprint where `startDate <= now <= endDate`. If multiple match, prefer the one with `isCurrent === true`; else highest `startDate`.
3. **Gap / no active sprint:** Most recent past sprint (`startDate <= now`, max `startDate`) — covers weekend gaps between sprints.
4. **No candidates:** Return `null` when no sprint has `startDate <= now`.

**Sync write rule:** During iteration sync, set `isCurrent = true` on the resolved current sprint and `isCurrent = false` on all other sprints in the ingested set.

**Dashboard default:** When no `sprintId` param, default to the resolver output — not `metricSnapshot` ordered by `computedAt`.

**Timezone:** Keep instant `Date` comparison as today (`startDate <= now <= endDate`); document that sprint boundaries follow stored UTC timestamps from ADO.

### Success Criteria

1. All current-sprint consumers call the shared resolver (or equivalent persisted + validated read).
2. Dashboard default sprint matches ADO's active sprint after sync.
3. Edge cases covered by tests: stale flag, gap, overlap, all-past window, no sprints.
4. `selectRollingSprints` internal inconsistency fixed (anchor index vs returned `currentSprint`).

### Scope Boundaries

**Included:**

- Prisma `isCurrent` field on `Sprint`.
- Shared resolver module (`lib/sprint/resolve-current.ts`).
- Sync persistence during `upsertSprintsFromIterations`.
- Adoption in `/api/metrics`, `/api/sprints/stories`, `lib/metrics/snapshot.ts`.
- Regression tests for cross-layer consistency.

**Excluded:**

- Changing visible tab count or rolling window depth.
- Live ADO re-fetch on dashboard load.
- Timezone redesign or calendar-day normalization.
- UI component changes beyond consuming corrected API flags.

### Technical Concerns

- Schema migration adds `isCurrent Boolean @default(false)`; backfill occurs on next sync (no manual data migration script required).
- Only one sprint should have `isCurrent = true` after sync; ingested sprints are cleared before setting the winner.
- Related completed specs (`2026-06-05-five-sprint-window`, `2026-04-08-current-sprint-chart-visibility`, `2026-06-04-prev-sprint-tabs`) assume reliable `currentSprintId` — this spec hardens that foundation.

### Recommendations

- Refactor `selectRollingSprints` to delegate current-sprint resolution to the shared function.
- Add `resolveCurrentSprintId(sprints, now?)` helper for ID-only consumers.
- Mirror existing `iterations.test.ts` scenarios in resolver unit tests plus stale-flag and gap cases.

## Current State

| Layer | Behavior today |
|---|---|
| `selectRollingSprints` (sync) | ADO `isCurrent` → date range → last sprint in window; returned `currentSprint` can disagree with anchor index |
| `Sprint` model (DB) | No `isCurrent` column — only dates persisted |
| `/api/metrics` default | Latest `metricSnapshot.computedAt`, not current sprint |
| `/api/metrics`, `/api/sprints/stories`, `snapshot.ts` | Date-range only: `startDate <= now <= endDate` |

ADO iteration `timeFrame` mapping lives in `lib/sync/ado-client.ts` (`isCurrent` from `timeFrame === 1`).

## Detailed Requirements

### Schema

Add to `Sprint` model in `prisma/schema.prisma`:

```prisma
isCurrent Boolean @default(false)
```

Run Prisma migration. Existing rows default to `false` until next sync.

### Resolver Module

Create `lib/sprint/resolve-current.ts` with:

- `SprintCurrentInput` — minimal shape: `{ id?, startDate, endDate, isCurrent? }`.
- `resolveCurrentSprint(sprints, now?)` — returns the winning sprint or `null`.
- `resolveCurrentSprintId(sprints, now?)` — convenience wrapper returning `id | null`.
- `isSprintActiveByDate(sprint, now?)` — shared date-range check.
- `isAdoCurrentFlagValid(sprint, now?)` — validates persisted flag per business rule 1.

Pure function; no DB or ADO imports. Unit-tested exhaustively.

### Sync Persistence

In `upsertSprintsFromIterations`:

1. Resolve current sprint from ADO iteration inputs using shared resolver (before or after upsert — resolver input uses ADO `isCurrent`).
2. Upsert name, dates, and `isCurrent` per row (`true` only for resolved current path).
3. Clear `isCurrent` on ingested sprints that are not current.

In `selectRollingSprints`:

- Use shared resolver for `currentIdx` / `currentSprint` (eliminate divergent logic at line 75).

### API Read Paths

**`/api/metrics`:**

- Replace inline `isCurrentSprint` date check with resolver over `rollingSprints` (include `isCurrent` in select).
- Replace default `sprintId` resolution: query sprints with `startDate <= now`, run resolver, use result; fall back to latest snapshot only if resolver returns null and snapshots exist.

**`/api/sprints/stories`:**

- Replace inline `isCurrent: sprint.startDate <= now && sprint.endDate >= now` with resolver per sprint list.

### Metrics Computation

**`lib/metrics/snapshot.ts`:**

- Replace inline `isCurrentSprint` check with resolver (single-sprint array or shared date+flag helper).

**`lib/metrics/orchestrator.ts` (if applicable):**

- Use resolver when determining which sprint is "current" for plan snapshot capture triggers.

### Testing

- Unit: `__tests__/lib/sprint/resolve-current.test.ts` — all priority rules, stale flag, gap, overlap, empty input.
- Update: `__tests__/lib/sync/iterations.test.ts` — persistence of `isCurrent`, consistent `currentSprint`.
- Update: API route tests for default sprint and `isCurrent` flags in responses.
- Integration: dashboard default sprint loads current, not latest snapshot.

## Implementation Approach

1. **Story 1:** Schema migration + resolver module + unit tests (foundation, no wiring).
2. **Story 2:** Sync writes `isCurrent`; refactor `selectRollingSprints` to use resolver.
3. **Story 3:** API routes adopt resolver; fix metrics default `sprintId`.
4. **Story 4:** Snapshot/metrics orchestrator adopt resolver.
5. **Story 5:** Regression coverage locking cross-layer behavior.

## Cross-Spec Relationship

Foundational hardening for completed specs that depend on `currentSprintId` / `isCurrent`:

- `2026-06-05-five-sprint-window-visible-tabs`
- `2026-04-08-current-sprint-chart-visibility`
- `2026-06-04-prev-sprint-tabs-full-rolling-window`

No changes to their UI or window-depth contracts.
