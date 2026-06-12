# Previous Sprint Tabs Show Full Five-Sprint Rolling Window

> **Status:** Complete
> **Created:** 2026-06-04
> **Owner:** @AdamSellke
> **Contract Locked:** ✅
> **Origin:** Promoted from issue `.writ/issues/improvements/2026-06-04-prev-sprint-tabs-full-rolling-window.md`

## Contract Summary

**Deliverable:** When a previous sprint tab is selected, the velocity, bug burndown, and overhead charts display a full five-sprint rolling window ending at (and including) the selected sprint, computed server-side by anchoring the rolling-window query to the selected sprint.

**Must Include:**
- API rolling-window query anchored to the selected sprint (5 sprints with `startDate <= selected.startDate`, ordered desc) instead of fixed latest-5.
- Tab selection triggers a refetch of `/api/metrics?sprintId=<selected>` (lift `activeSprintId` to `DashboardContainer`).
- Past-sprint windows render all five sprints as completed/actual — no hollow "current" dot, no forecast overlay.
- Bug burndown reconstructed accurately as-of each sprint in the window (using `adoCreatedDate`), not from today's open count.

**Hardest Constraint:** Keeping the live current-sprint view byte-for-byte unchanged (the `2026-04-08-current-sprint-chart-visibility` behavior) while the same code paths now also serve past-anchored windows.

**Success Criteria:**
1. Selecting Sprint N (N < latest) shows the window [N-4 … N] in all three charts, with N as the rightmost point.
2. Current-sprint tab is visually and behaviorally identical to pre-change.
3. Historical bug burndown reflects open counts as-of each sprint, independent of today's open count.
4. Existing metrics-route and trend-service tests pass; new tests cover anchored window, forecast suppression, and as-of burndown.

**Scope Boundaries:**
- Included: metrics-route window query, `buildTrendSeries`/`computeBugBurndown` anchoring, `activeSprintId` lift + refetch wiring, loading state, tests.
- Excluded: changing tab sourcing, the metrics-row/detail client override (already correct), program-level trend chart, sync/ingestion, schema changes, real-time data.

## 🎯 Experience Design

### Entry Point
User clicks a previous sprint tab in the `SprintTabSelector` above the workstream cards grid.

### Happy Path
1. Dashboard loads with the current sprint selected by default (unchanged).
2. User clicks a completed sprint tab (e.g., "Sprint 10" when "Sprint 14" is latest).
3. The cards show a brief loading state while metrics refetch with `sprintId=Sprint 10`.
4. All three charts re-render to the window [Sprint 6 … Sprint 10], with Sprint 10 as the rightmost actual data point.
5. User clicks back to the current sprint — charts return to the live view with the forecast overlay and hollow current-sprint dot.

### Moment of Truth
Clicking a past sprint tab and seeing the entire five-sprint historical context shift to that point in time — accurate velocity, burndown, and overhead for the window *ending* at that sprint, not the always-latest window.

### State Catalog
- **Loading:** During tab-triggered refetch, cards display a loading state (a deliberate, accepted change from the prior pre-loaded "instant" tab switch).
- **Populated:** Five-sprint window (or fewer if history is short), all actual data points for past-sprint selections.
- **Empty:** A selected sprint without a `MetricSnapshot` degrades to "N/A" gracefully (existing behavior preserved).
- **Error:** Refetch failure surfaces through the existing `metricsViewState === 'error'` path with retry; the previously rendered view is replaced by the standard error view model.
- **Edge (short history):** Fewer than 5 prior sprints → window is truncated to what exists (e.g., 3 sprints), never padded.

### Feedback Model
Inline re-render of the workstream cards after refetch completes. A short loading indicator communicates the fetch; no full-page reload.

### Responsive Behavior
No chart sizing or layout changes. X-axis tick behavior (rotation/truncation) is unchanged.

## 📋 Business Rules

1. **Window definition:** The rolling window is up to 5 sprints with `startDate <= selectedSprint.startDate`, ordered by `startDate` descending, including the selected sprint. Truncated only when fewer than 5 sprints of history exist.
2. **Default selection unchanged:** On load, the current sprint is selected and the view is identical to today's behavior.
3. **Forecast/current styling gating:** The forecast (prediction) overlay and `mode: 'current'` styling (hollow dot, `(Cur)` labels) apply **only** when the selected sprint is the live current sprint (the sprint whose window contains `now`). For a past-sprint window, all five sprints render as `mode: 'actual'` with no forecast entry.
4. **Bug-open-as-of-sprint-end:** A bug counts as open at sprint S's end when `adoCreatedDate <= S.endDate` AND (`state` is in `BUG_OPEN_STATES`, OR (`state` is in `BUG_RESOLVED_STATES` AND `adoChangedDate > S.endDate`)). This replaces the today-anchored backward reconstruction.
5. **Metrics row / detail override preserved:** The existing client-side override (selected sprint's `velocityAvg`, detail points) from the `2026-03-17` spec remains; with server refetch the selected sprint is also the top-level response sprint, so the override must remain consistent (idempotent), not double-applied.
6. **Data source unchanged:** Per-sprint values continue to come from `MetricSnapshot`; bug as-of counts come from `WorkItem` (`adoCreatedDate`/`adoChangedDate`/`state`). No schema changes.

## Detailed Requirements

### API: Anchored Rolling Window (`app/api/metrics/route.ts`)

Today the rolling window is fixed to the latest 5 sprints:

```ts
const rollingSprints = await prisma.sprint.findMany({
  orderBy: { startDate: 'desc' },
  take: 5,
  select: { id: true, name: true, startDate: true, endDate: true },
});
```

This must anchor to the resolved `sprint` (which already honors the `sprintId` query param):

```ts
const rollingSprints = await prisma.sprint.findMany({
  where: { startDate: { lte: sprint.startDate } },
  orderBy: { startDate: 'desc' },
  take: 5,
  select: { id: true, name: true, startDate: true, endDate: true },
});
```

`currentSprintId` for the window is still the sprint (if any) whose window contains `now`. For a past-anchored window this resolves to `null`, which must drive forecast suppression rather than falling back to the newest window sprint.

### Trend Service: Forecast Suppression (`lib/metrics/trend-service.ts`)

`buildTrendSeries` currently falls back to `rollingSprintsDesc[0]?.id` when `currentSprintId` is null, then appends that sprint as `mode: 'current'` with a forecast. For a past-anchored window this is wrong. When the resolved window does not contain the live current sprint:
- Do not append a `mode: 'current'` entry.
- Treat all window sprints as `mode: 'actual'`.
- Suppress the prediction/forecast (the prediction is only meaningful for the in-flight sprint).

The caller must pass an explicit signal (e.g., `currentSprintId` stays `null` and `buildTrendSeries` no longer falls back to `rollingSprintsDesc[0]`, OR a dedicated `isCurrentWindow` flag) so historical windows render five actual sprints.

### Trend Service: As-Of Bug Burndown (`computeBugBurndown`)

Replace the backward reconstruction (which starts from today's open count) with a direct as-of computation per sprint using `adoCreatedDate` + `adoChangedDate` + `state`. For each sprint S in the window:
- `bugsClosed(S)` = resolved bugs whose `adoChangedDate` falls within S's window (unchanged).
- `activeBugs(S)` = bugs where `adoCreatedDate <= S.endDate` AND (open state OR (resolved AND `adoChangedDate > S.endDate`)).

This requires the caller to pass `adoCreatedDate` for each bug; `route.ts` already selects `adoChangedDate` for burndown bugs and must add `adoCreatedDate`.

### Client: Lift `activeSprintId` + Refetch (`DashboardContainer.tsx`, `WorkstreamCardsGrid.tsx`)

`activeSprintId` currently lives in `WorkstreamCardsGrid` and never triggers a fetch. Lift it to `DashboardContainer` so `metricsUrl` includes `sprintId` when a non-current sprint is selected. Selecting a tab updates the URL → triggers `fetchMetrics`. The sprint tab list (from `deriveSprintList(sprintStoriesMap)`) and its selection UI stay where they are; only the selected id is lifted (or surfaced via callback).

Default (current sprint) should omit `sprintId` to preserve the existing default-resolution path and current-sprint behavior.

## Implementation Approach

**Strategy:** Server anchors the window to the selected sprint; client lifts selection state and refetches on change; trend service gates forecast/current styling and computes burndown as-of.

**Data flow after change:**

```
User clicks past sprint tab
→ activeSprintId (lifted to DashboardContainer) updates metricsUrl with sprintId
→ GET /api/metrics?sprintId=<selected>
→ resolved sprint = selected; rollingSprints anchored (startDate <= selected.startDate, take 5 desc)
→ currentSprintId = null (window has no live-current sprint)
→ buildTrendSeries emits 5 actual sprints, no forecast
→ computeBugBurndown computes as-of activeBugs/bugsClosed per sprint
→ cards re-render with the historical window
```

**Sequencing:** Story 1 (server window + suppression) and Story 3 (as-of burndown) are backend and can land before Story 2 (client refetch) is observable end-to-end. Story 4 covers tests and current-sprint regression parity.

## Cross-Spec Context

Both referenced specs are **Complete** — they are constraints, not active conflicts:

- **`2026-03-17-sprint-tabs-full-workstream-data`** — established the client-side metrics/detail override keyed on `activeSprintId`. With server refetch the selected sprint becomes the top-level response sprint; verify the override stays idempotent and does not conflict.
- **`2026-04-08-current-sprint-chart-visibility`** — defines current-sprint forecast overlay + hollow-dot + `(Cur)` labels. This behavior must be preserved exactly and gated so it never applies to past-anchored windows.

## Relevant Files

### Modified
- `app/api/metrics/route.ts` — anchor rolling-window query to selected sprint; pass `adoCreatedDate` into burndown; gate forecast via `currentSprintId`.
- `lib/metrics/trend-service.ts` — suppress current/forecast for past windows; replace burndown reconstruction with as-of computation.
- `components/Dashboard/DashboardContainer.tsx` — own `activeSprintId`, include `sprintId` in `metricsUrl`, refetch on change, loading state.
- `components/Dashboard/WorkstreamCardsGrid.tsx` — surface selected sprint id upward (callback/lifted state) instead of holding it locally.

### Tests
- `__tests__/app/api/metrics/route.test.ts` — anchored window, forecast suppression, as-of burndown, current-sprint parity.
- Trend-service unit tests — `buildTrendSeries` window gating and `computeBugBurndown` as-of logic.

### Unchanged (verify, do not regress)
- `components/Dashboard/SprintTabSelector.tsx`, `lib/dashboard/sprint-utils.ts` — tab sourcing.
- `components/Dashboard/WorkstreamHealthCard.tsx`, `VelocityTrendChart.tsx` — client override and chart rendering.
