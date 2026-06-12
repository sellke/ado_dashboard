# Visible Tabs Backed by a Full Five-Sprint Rolling Window

> **Status:** Complete
> **Created:** 2026-06-05
> **Owner:** @AdamSellke
> **Contract Locked:** ✅
> **Origin:** Promoted from issue `.writ/issues/improvements/2026-06-05-five-sprint-window-visible-tabs.md`

## Contract Summary

**Deliverable:** Deepen ADO sync ingestion so the database holds full, fresh data (sprint
records, work items, capacity, metric snapshots) for the **9 most-recent sprints** — the 5
visible sprint tabs plus the 4 additional prior sprints required to fully back the oldest
visible tab's anchored five-sprint window. Every visible tab then drives a complete
five-sprint window, degrading gracefully to available data when the program has fewer than
9 sprints of history.

**Must Include:**
- Sync ingestion depth raised from 5 → 9, expressed as explicit, centralized constants
  (`VISIBLE_SPRINT_TABS`, `ROLLING_WINDOW_DEPTH`, derived `INGEST_SPRINT_DEPTH`) so the
  visible-vs-backing relationship is intentional, not an accident of two independent
  `take: 5`s.
- Work items, capacity, and metric snapshots computed/refreshed for the full ingested set
  (cascades from the selection change — verified, not assumed).
- Visible tab count stays **5**; current-sprint default view stays byte-for-byte identical.

**Hardest Constraint:** Increasing ingestion depth ~80% (5→9 sprints × 5 workstreams)
without unacceptably slowing Sync Now, and without regressing current-sprint behavior or the
completed `2026-06-04-prev-sprint-tabs-full-rolling-window` anchored-window behavior.

**Success Criteria:**
1. With ≥ 9 sprints in ADO, selecting the oldest visible tab yields a 5-sprint window in all
   three charts (velocity, bug burndown, overhead).
2. Visible tab count is still 5; the current-sprint default view is unchanged.
3. A sync ingests/refreshes work items + metric snapshots for all 9 sprints (not just 5).
4. With < 9 sprints, behavior degrades gracefully (truncated, never padded) with no errors.
5. Existing sync, metrics-route, and trend-service tests pass; new tests cover deepened
   selection + the visible-vs-backing constant relationship.

**Scope Boundaries:**
- **Included:** `SYNC_CONFIG` depth, `lib/sync/iterations.ts` selection, centralized
  constants, verifying work-item/capacity/metric coverage of the deeper window, tests.
- **Excluded:** Changing visible tab count or tab sourcing, UI changes, partial-window
  indicators, the `/api/metrics` anchored-window logic, schema changes, real-time data, a
  configurable per-user depth.

## Problem Statement

The dashboard exposes two read paths over sprint data, each independently scoped to five
sprints:

- **Visible tabs** come from `GET /api/sprints/stories` (`take: 5`) → the latest 5 sprints.
- **Chart window** comes from `GET /api/metrics?sprintId=<selected>`, which anchors a
  rolling window to the selected sprint: `startDate <= selected.startDate`, ordered desc,
  `take: 5`.

The `2026-06-04-prev-sprint-tabs-full-rolling-window` spec (Complete) anchored the chart
window to the selected tab. But it explicitly accepted truncation at the edge ("never
padded"). The reason the edge truncates is upstream: **sync only ingests the latest 5
sprints**.

```
SYNC_CONFIG.lookbackSprintCount = 5   // current + 4 prior
selectRollingFiveSprints(...)         // hardcoded count = 5
→ upsertSprintsFromIterations(5)      // only 5 sprint rows refreshed
→ sprintIdMap has 5 entries           // work items synced for 5 sprints
→ computeAllMetrics over 5 sprints    // metric snapshots for 5 sprints
```

When the user selects the **oldest visible tab** (the 5th-newest sprint), its anchored window
needs that sprint plus the **4 sprints before it** — sprints #5…#9 counting from newest. The
union of sprints needed to fully back all five visible tabs is sprints **#1…#9 = 9 sprints**.
Today only 5 are ingested/refreshed, so the oldest tabs render charts with 1–4 sprints of
context (or stale data for older sprint rows that survive from earlier syncs but are never
refreshed).

For a mature program these prior sprints exist in ADO — they are simply never pulled. The fix
is to ingest deep enough to back every visible tab.

## 🎯 Experience Design

### Entry Point
User selects any sprint tab in the `SprintTabSelector` above the workstream cards grid. The
UI is unchanged.

### Happy Path
1. A Full sync runs (manual "Sync Now" or scheduled), now ingesting 9 sprints of data.
2. User opens the dashboard — current sprint selected by default (unchanged).
3. User clicks the **oldest** visible tab.
4. All three charts render a complete five-sprint window ending at that sprint, instead of a
   thin truncated view.

### Moment of Truth
The oldest visible tab looks as complete as the newest — five real data points in velocity,
burndown, and overhead — because the backing sprints now exist with fresh data.

### State Catalog
- **Populated (mature program, ≥ 9 sprints):** Every visible tab drives a full five-sprint
  window.
- **Young program (< 9 sprints):** Windows truncate to what exists; never padded; no error.
- **Loading / Error:** Unchanged from existing dashboard behavior (06-04 refetch + error
  view model).
- **Edge (far-left rolling average):** The leftmost sprint of the oldest window computes its
  trailing `velocityAvg`/`overheadPercentAvg` over fewer priors (see Known Limitations).

### Feedback Model
No new UI. The improvement is purely in data completeness after a sync. No partial-window
warning badge — graceful truncation is the chosen behavior.

### Responsive Behavior
No chart sizing or layout changes.

## 📋 Business Rules

1. **Ingestion depth formula:** `INGEST_SPRINT_DEPTH = VISIBLE_SPRINT_TABS +
   ROLLING_WINDOW_DEPTH − 1`. With `VISIBLE_SPRINT_TABS = 5` and `ROLLING_WINDOW_DEPTH = 5`,
   ingestion depth = **9**.
2. **Visible tab list unchanged:** Still the latest 5 sprints. This spec does not change tab
   sourcing or count.
3. **Anchored-window query unchanged:** `/api/metrics` still anchors `startDate <= selected`
   and takes 5; it simply finds full backing data now.
4. **Freshness, not just rows:** Sprints already accumulate (upsert never deletes). The
   change guarantees fresh work items + recomputed metric snapshots for the full backing set,
   not just sprint rows.
5. **Graceful degradation:** A program with fewer than 9 sprints presents available sprints
   only — truncated, never padded.
6. **Current sprint determination unchanged:** Current sprint selection (`isCurrent` /
   date-range) and the current-sprint forecast/projection behavior are untouched.

## Detailed Requirements

### Sync Depth (`lib/sync/config.ts`, `lib/sync/iterations.ts`)

`SYNC_CONFIG.lookbackSprintCount` is currently `5`. The orchestrator selects via
`selectRollingFiveSprints(allIterations)` (hardcoded 5). Everything downstream — sprint
upsert, `sprintIdMap`, work-item sync, capacity sync, metric computation — is scoped to that
selection. Deepening the selection to 9 cascades correctly to all downstream phases because
they iterate over the selected set.

Required changes:
- Introduce centralized constants (new module, e.g. `lib/sync/window.ts` or
  `lib/dashboard/window-constants.ts`):
  - `VISIBLE_SPRINT_TABS = 5`
  - `ROLLING_WINDOW_DEPTH = 5`
  - `INGEST_SPRINT_DEPTH = VISIBLE_SPRINT_TABS + ROLLING_WINDOW_DEPTH − 1` (= 9)
- `SYNC_CONFIG.lookbackSprintCount` references `INGEST_SPRINT_DEPTH` (or is set to 9 with a
  comment tying it to the formula).
- Replace the hardcoded `selectRollingFiveSprints` call in the orchestrator with a
  depth-parameterized selection (`selectRollingSprints(allIterations, INGEST_SPRINT_DEPTH)`),
  or update `selectRollingFiveSprints` to read the constant. `selectRollingSprints` already
  accepts a `count` and selects `current + (count − 1)` prior, future-excluded — so it
  supports 9 with no new logic.

### Downstream Coverage Verification (`lib/sync/orchestrator.ts`)

The orchestrator already:
- Builds `sprintIdMap` from the selected sprints → work items sync for all selected sprints.
- Loops `computeAllMetrics(sprintId)` over `selectedSprintPathsOrderedDesc` (oldest → newest)
  → metric snapshots for all selected sprints.
- Syncs capacity for iterations in `iterationIdMap` (built from selected).

With depth = 9 these automatically cover 9 sprints. This spec **verifies** that coverage with
tests rather than assuming it, and confirms the oldest→newest metric recompute order still
holds (so current-sprint projections can read prior snapshots).

### Read Paths (no change)

- `GET /api/sprints/stories` keeps `take: 5` → 5 visible tabs.
- `GET /api/metrics` keeps its anchored `take: 5` window.

These are unchanged; they only behave better because the DB is now deep enough. Tests assert
the visible-vs-backing relationship via the shared constants so a future `take` change can't
silently break the guarantee.

## Implementation Approach

**Strategy:** A single lever — the sync selection depth — cascades to all ingestion phases.
Centralize the depth relationship as named constants, raise the lever from 5 to 9, then verify
(via tests) that work items, capacity, and metric snapshots cover the full backing set and
that the read paths still surface exactly 5 tabs with full windows.

**Data flow after change:**

```
Full sync
→ selectRollingSprints(allIterations, INGEST_SPRINT_DEPTH=9)
→ upsert 9 sprint rows; sprintIdMap has 9 entries
→ work items synced for 9 sprints; capacity for 9 iterations
→ computeAllMetrics over 9 sprints (oldest → newest)
DB now holds fresh data for the 9 most-recent sprints.

User selects oldest visible tab (sprint #5)
→ GET /api/metrics?sprintId=#5
→ rollingSprints anchored startDate <= #5.startDate, take 5 → [#9 … #5] (all present)
→ full five-sprint window renders
```

**Sequencing:** Story 1 (constants + depth) is the core change. Story 2 (downstream coverage
verification + guards) builds on it. Story 3 (tests + regression) confirms behavior end to
end and protects the relationship.

## Known Limitations

- **Rolling-average far edge:** A per-sprint trailing average (`velocityAvg`,
  `overheadPercentAvg`) for the leftmost sprint of the *oldest* window (sprint #9) is computed
  over fewer priors than a mid-window sprint, because we do not ingest beyond depth 9. This is
  accepted as graceful degradation at the far edge, consistent with "present available data."
  Ingesting deeper (e.g. 13) to perfect the edge average is explicitly out of scope.
- **Sync cost:** Ingestion work increases ~80% (5→9 sprints × 5 workstreams). Story 3
  includes a sanity check; if Sync Now becomes unacceptable, a follow-up could scope
  work-item sync to the visible 5 while keeping bugs/snapshots for the deeper 4 — not pursued
  here.

## Cross-Spec Context

- **`2026-06-04-prev-sprint-tabs-full-rolling-window`** (**Complete**) — predecessor. It
  anchored the metrics window to the selected sprint but accepted edge truncation. This spec
  completes the data-retention side it deferred. Constraint, not conflict.
- **`2026-06-04-delivery-to-bug-ratio-metric`** — also touches
  `app/api/metrics/route.ts`, but this spec changes **sync depth only** and does not modify
  that route's logic, so there is no real overlap.

## Relevant Files

### Modified
- `lib/sync/config.ts` — `lookbackSprintCount` driven by the depth formula (5 → 9).
- `lib/sync/iterations.ts` — depth-parameterized rolling selection; constant wiring.
- New constants module (e.g. `lib/sync/window.ts`) — `VISIBLE_SPRINT_TABS`,
  `ROLLING_WINDOW_DEPTH`, `INGEST_SPRINT_DEPTH`.

### Verified / Guarded (likely no logic change)
- `lib/sync/orchestrator.ts` — confirm work-item/capacity/metric phases cover the deeper set.
- `app/api/sprints/stories/route.ts`, `app/api/metrics/route.ts` — read paths; assert
  `take` counts against shared constants in tests.

### Tests
- `__tests__/lib/sync/iterations.test.ts` — selection at depth 9; current + 8 prior; future
  excluded; truncation when fewer exist.
- `__tests__/lib/sync/orchestrator.test.ts` — work items + metrics cover all ingested
  sprints.
- Constant-relationship test — `INGEST_SPRINT_DEPTH === VISIBLE_SPRINT_TABS +
  ROLLING_WINDOW_DEPTH − 1` and route `take` values align.
