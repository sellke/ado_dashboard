# Technical Specification — Visible Tabs Full Five-Sprint Window

> **Spec:** 2026-06-05-five-sprint-window-visible-tabs
> **Created:** 2026-06-05
> **Tech Stack:** Next.js 15.3.3 (App Router), React 19.1.0, TypeScript 5.8.3 (strict),
> Prisma, Jest 30 + RTL

---

## 1. The Depth Relationship

Two read paths each surface five sprints, but they need different sets:

| Read path | Source | Sprints surfaced |
|---|---|---|
| Visible tabs | `GET /api/sprints/stories` (`take: 5`) | latest 5 |
| Chart window | `GET /api/metrics?sprintId=<sel>` (anchored `take: 5`) | `[sel−4 … sel]` |

The oldest visible tab is the 5th-newest sprint; its window reaches back 4 further. So the
union of sprints that must exist with fresh data is:

```
INGEST_SPRINT_DEPTH = VISIBLE_SPRINT_TABS + ROLLING_WINDOW_DEPTH − 1
                    = 5 + 5 − 1
                    = 9
```

### 1.1 Constants Module

Create a single source of truth (proposed `lib/sync/window.ts`):

```typescript
/** Number of sprint tabs surfaced by GET /api/sprints/stories. */
export const VISIBLE_SPRINT_TABS = 5;

/** Length of the anchored rolling window in GET /api/metrics. */
export const ROLLING_WINDOW_DEPTH = 5;

/**
 * Sprints that must be ingested with full, fresh data so every visible tab is
 * backed by a complete rolling window. The oldest visible tab needs
 * (ROLLING_WINDOW_DEPTH − 1) additional prior sprints.
 */
export const INGEST_SPRINT_DEPTH = VISIBLE_SPRINT_TABS + ROLLING_WINDOW_DEPTH - 1; // 9
```

> Placement note: `lib/sync/window.ts` keeps the constant next to its primary consumer
> (sync). The read routes import the same constants for their assertions/tests. If a shared
> location is preferred, `lib/dashboard/window-constants.ts` is an acceptable alternative —
> pick one and import everywhere; do not redefine.

---

## 2. Sync Layer Changes

### 2.1 `lib/sync/config.ts`

```typescript
import { INGEST_SPRINT_DEPTH } from './window';

export const SYNC_CONFIG = {
  projectNameOrId: 'Event Streaming Platform',
  lookbackSprintCount: INGEST_SPRINT_DEPTH, // 9 = visible 5 + 4 prior backing
  // ...rest unchanged
} as const;
```

### 2.2 `lib/sync/iterations.ts`

`selectRollingSprints(iterations, count)` already supports arbitrary depth:
- Filters out future sprints (`startDate > now`).
- Anchors on the current sprint (`isCurrent`, else date-range, else last).
- Selects `current + (count − 1)` prior, sorted descending.
- Truncates naturally when fewer sprints exist (`startIdx = max(0, currentIdx − (count − 1))`).

So **no new selection logic is required** — only the depth passed in.

`selectRollingFiveSprints` is a hardcoded `count = 5` wrapper. Two acceptable approaches:

- **Preferred:** In the orchestrator, replace `selectRollingFiveSprints(allIterations)` with
  `selectRollingSprints(allIterations, INGEST_SPRINT_DEPTH).sprints`. Keep
  `selectRollingFiveSprints` only if other callers still need exactly 5; otherwise remove it.
- **Alternative:** Repoint `selectRollingFiveSprints` to `selectRollingSprints(iterations,
  INGEST_SPRINT_DEPTH)` and rename to `selectRollingWindowSprints` to avoid the misleading
  "Five" name.

Grep for `selectRollingFiveSprints` before deciding — there is at least the orchestrator
caller; confirm no test or other module depends on the literal 5.

### 2.3 `lib/sync/orchestrator.ts` (verify, likely no logic change)

The orchestrator already cascades the selected set to every phase:

| Phase | Coupling to selection | Coverage at depth 9 |
|---|---|---|
| Sprint upsert | `upsertSprintsFromIterations(selected, ...)` | 9 sprint rows |
| Work items | `sprintPaths: Array.from(sprintIdMap.keys())` | 9 sprints |
| Capacity | `iterationIdMap` built from `selected` | 9 iterations |
| Metric compute | loops `selectedSprintPathsOrderedDesc` (oldest→newest) | 9 snapshots |

Verify the oldest→newest recompute order is preserved so current-sprint projections can read
prior snapshots (existing comment at the metric-computation hook). No change expected; assert
with a test.

---

## 3. Read Paths (no logic change; add guards)

- `app/api/sprints/stories/route.ts` — `take: 5` stays. Optionally replace the literal with
  `VISIBLE_SPRINT_TABS` for clarity.
- `app/api/metrics/route.ts` — anchored window `take: 5` stays. Optionally replace the literal
  with `ROLLING_WINDOW_DEPTH`.

Using the constants here is recommended (makes the relationship self-documenting) but is not
required for correctness. If literals are kept, the constant-relationship test in §5 still
guards the design.

---

## 4. Error & Rescue Map

| Operation | What Can Fail | Planned Handling | Test Strategy |
|---|---|---|---|
| Fetch team iterations | ADO network / auth error | Existing orchestrator try/catch records `Iterations: <msg>`, sets `hasFailure`; other phases isolated | Mock fetcher throws → assert SyncLog failure + isolation |
| Select rolling window | Fewer than 9 sprints exist | `selectRollingSprints` truncates to available; no throw, no padding | Unit: 5/6/8 iterations → that many selected |
| Select rolling window | No past/current sprints (`[]` or all future) | Returns `{ sprints: [], currentSprint: null }`; orchestrator skips upsert | Unit: empty + all-future inputs |
| Upsert sprints | DB write error | Propagates to orchestrator try/catch (existing) | Existing orchestrator error tests cover path |
| Metric compute (deeper set) | `computeAllMetrics` throws for a sprint | Existing non-fatal catch around the compute hook | Assert sync still completes Success |

No `[UNPLANNED]` operations: the deeper window reuses existing, already-handled phases.

---

## 5. Test Strategy

### 5.1 Selection depth (`__tests__/lib/sync/iterations.test.ts`)

| Test | Description |
|---|---|
| Depth 9 selects current + 8 prior | 12 iterations, current at index → 9 selected, desc |
| Future excluded at depth 9 | Future iterations never selected |
| Truncates below depth | 5 iterations → 5 selected; 7 → 7 selected (never padded) |
| Empty input | `[]` → `{ sprints: [], currentSprint: null }` |
| Ordering | Output sorted by `startDate` descending |

### 5.2 Downstream coverage (`__tests__/lib/sync/orchestrator.test.ts`)

| Test | Description |
|---|---|
| `sprintIdMap` covers 9 | With ≥ 9 iterations, work-item sync receives 9 sprint paths |
| Metric compute covers 9 | `computeAllMetrics` invoked for all 9 ingested sprints |
| Recompute order | Sprints recomputed oldest → newest |
| Failure isolation preserved | Iteration fetch throw → failure logged, other phases isolated |

### 5.3 Constant relationship (guard test)

| Test | Description |
|---|---|
| Formula holds | `INGEST_SPRINT_DEPTH === VISIBLE_SPRINT_TABS + ROLLING_WINDOW_DEPTH − 1` |
| Config wired | `SYNC_CONFIG.lookbackSprintCount === INGEST_SPRINT_DEPTH` |
| Route alignment | stories route `take` === `VISIBLE_SPRINT_TABS`; metrics window `take` === `ROLLING_WINDOW_DEPTH` (if constants adopted in routes) |

### 5.4 Regression

- Existing `__tests__/app/api/metrics/route.test.ts` and trend-service tests pass unchanged.
- Existing sync/iterations tests updated only where they asserted the literal 5 as ingestion
  depth (now 9) — distinguish "visible tabs = 5" assertions (unchanged) from "ingestion = 5"
  assertions (now 9).

---

## 6. File Change Summary

### Created
| File | Purpose |
|---|---|
| `lib/sync/window.ts` | `VISIBLE_SPRINT_TABS`, `ROLLING_WINDOW_DEPTH`, `INGEST_SPRINT_DEPTH` |
| `__tests__/lib/sync/window.test.ts` (or inline in iterations test) | Constant-relationship guard |

### Modified
| File | Changes |
|---|---|
| `lib/sync/config.ts` | `lookbackSprintCount` ← `INGEST_SPRINT_DEPTH` |
| `lib/sync/iterations.ts` | Depth-parameterized selection; retire/rename hardcoded `selectRollingFiveSprints` |
| `__tests__/lib/sync/iterations.test.ts` | Depth-9 selection, truncation, ordering |
| `__tests__/lib/sync/orchestrator.test.ts` | Downstream coverage of 9 sprints |

### Verified (no expected logic change)
| File | Reason |
|---|---|
| `lib/sync/orchestrator.ts` | Phases already iterate the selected set |
| `app/api/sprints/stories/route.ts` | Tab count stays 5 |
| `app/api/metrics/route.ts` | Anchored window logic unchanged |

---

## User Story References

- **Story 1:** Centralize depth constants + raise ingestion to 9 — §1, §2.1, §2.2
- **Story 2:** Verify/guard downstream coverage of the deeper window — §2.3, §3
- **Story 3:** Tests, regression parity, and sync-cost sanity — §4, §5
