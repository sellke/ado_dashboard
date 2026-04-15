# Current Sprint Visibility in Workstream Charts

> Created: 2026-04-08
> Status: Complete
> Contract Locked: ✅

## Contract Summary

**Deliverable:** Include the current (in-flight) sprint in all three workstream card charts — velocity trend, bug burndown, and overhead breakdown — showing partial actual data with in-progress visual styling and overlaying the forecasted velocity on the current sprint's data point rather than appending a separate forecasted entry.

**Must Include:**

- Current sprint as rightmost entry in `buildTrendSeries` output, marked `mode: 'current'`
- Velocity chart: hollow dot for current sprint, forecast value overlaid at the same x-position
- Bug burndown: current sprint column with `(Current)` x-axis label
- Overhead breakdown: current sprint segment with `(Current)` label

**Hardest Constraint:** `buildTrendSeries` currently keeps exactly 4 historical sprints (`slice(0, 4)`). Adding the current sprint as a 5th entry shifts the rolling window display — the rolling window stays at 5 total sprints (4 prior + current), so the oldest prior sprint will no longer appear in the trend charts. This is intentional and matches the existing `rollingSprints` fetch of `take: 5`.

---

## 🎯 Experience Design

- **Entry point:** User loads the dashboard during an active sprint — all workstream cards show charts
- **Happy path:** Velocity line chart shows 4 completed sprints + current sprint as rightmost point; current sprint dot is hollow to signal in-progress; the forecasted velocity value appears as an overlaid `Forecasted` series point at the current sprint's x-position (not a new entry to the right); bug burndown adds a current sprint column labeled `"Sprint N (Cur)"`; overhead breakdown adds a current sprint bar group
- **Moment of truth:** The user immediately sees where the current sprint stands — actual completed points so far + what's expected by end of sprint — without switching views or opening a separate panel
- **Feedback model:** Visual styling (hollow dot, `(Cur)` label) communicates "in progress" without requiring a tooltip or alert
- **Error experience:** If no current sprint exists (dashboard loaded against a historical sprint ID), charts behave identically to today — no current sprint entry, no regression
- **Empty state:** If the current sprint has no `MetricSnapshot` yet (sync not run), the current sprint entry renders with `velocity: null` and the chart gracefully omits the dot via `connectNulls={false}` (already the chart's setting)
- **Responsive behavior:** No changes to chart sizing; the additional x-axis tick (`Sprint N (Cur)`) follows existing x-axis rotation/truncation behavior

---

## 📋 Business Rules

- **5-sprint window:** The rolling window is already fetched as `take: 5` sprints from the DB. `buildTrendSeries` currently uses the 4 non-current sprints from that set. After this change it uses all 5 (4 prior + 1 current). No DB query change needed.
- **Current sprint velocity is partial:** `MetricSnapshot.velocity` for the current sprint equals story points in DONE states at the time of last sync. This is explicitly communicated via the hollow dot + `(Cur)` label — no additional caveats needed in the UI.
- **Forecast overlays on current sprint:** The `Forecasted` series value (currently appended as a separate x-axis entry) moves to the current sprint data point. The current sprint data point carries both `'Completed Points'` (actual so far) and `Forecasted` (predicted end-of-sprint). The separate `(Forecasted)` sprint label entry is removed.
- **Historical sprint behavior unchanged:** No changes to how past sprints are computed, labeled, or styled.
- `**computeBugBurndown` receives the current sprint:** The caller in `route.ts` constructs `sprintsAsc` from the trend series output. Once the current sprint is in the series, it flows into bug burndown automatically. Bug counts for the current sprint come from the same backward-reconstruction logic — current open bugs are the starting point.
- `**isCurrent` flag flows through the type chain:** `TrendSprintMetrics → ApiTrendSprint → TrendSprintViewModel` all gain `isCurrent: boolean`.

---

## Implementation Approach

### Backend — `lib/metrics/trend-service.ts`

1. Change `TrendSprintMetrics.mode` union: `'actual' | 'current'`
2. After building `actualSprintsAsc` (4 prior sprints), append the current sprint as a 5th entry:
  ```ts
   const currentRef = rollingSprintsDesc.find((s) => s.id === selectedCurrentSprintId);
   if (currentRef) {
     const currentSnapshots = scopeSnapshots.filter((s) => s.sprintId === currentRef.id);
     const currentVelocity = sumNullable(currentSnapshots.map((s) => s.velocity));
     const currentNetCap = sumNullable(
       currentSnapshots.map((s) => calculateNetCapacityHours(s.grossHours, s.overheadHours))
     );
     sprints.push({
       sprintId: currentRef.id,
       sprintName: currentRef.name,
       velocity: currentVelocity,
       velocityRate: calculateVelocityRate(currentVelocity, currentNetCap),
       activeBugs: 0,   // overridden by computeBugBurndown in route.ts
       bugsClosed: 0,
       mode: 'current',
     });
   }
  ```
3. `buildTrendSeries` still returns the same `TrendSeriesResult` shape — no return type change.
4. `computeBugBurndown` needs no internal changes — the caller in `route.ts` now passes a 5-sprint `sprintsAsc` that includes the current sprint.

### Types — `lib/dashboard/types.ts`

- `ApiTrendSprint.mode`: `'actual' | 'current'`
- `TrendSprintViewModel`: add `isCurrent: boolean`

### Adapter — `lib/dashboard/adapter.ts`

- `mapTrendSprint`: set `isCurrent: sprint.mode === 'current'`

### API route — `app/api/metrics/route.ts`

No structural changes needed. Once `buildTrendSeries` emits the current sprint, it flows into:

- `formatted.trends.sprints` (velocity, overhead composition, bug list, overheadBreakdown)
- `wsBurndown` via `computeBugBurndown` (bug counts overwrite activeBugs/bugsClosed for current sprint)

The `sprintRefMap` lookup for `computeBugBurndown`'s `sprintsAsc` argument already includes all rolling sprint refs — no change needed there.

### Velocity Chart — `components/Dashboard/VelocityTrendChart.tsx`

- Add `currentSprintId?: string` prop (passed from `WorkstreamHealthCard`)
- In `buildChartData`: when the last sprint in `sprints` is the current sprint, place the `Forecasted` value on that data point instead of appending a new entry:
  ```ts
  const lastSprint = sprints[sprints.length - 1];
  const isLastCurrent = lastSprint && currentSprintId && lastSprint.sprintId === currentSprintId;
  if (isLastCurrent && prediction?.rawVelocity != null) {
    data[data.length - 1].Forecasted = prediction.rawVelocity;
    // do NOT push a separate prediction entry
  } else if (prediction && data.length > 0) {
    // existing logic for when no current sprint is present
  }
  ```
- Custom dot for current sprint: use Recharts' `dot` render prop on the `Completed Points` series to render a hollow circle when `payload.sprint === currentSprintName`:
  ```tsx
  dot={(props) => {
    const isCurrentDot = props.payload.sprint === currentSprintName;
    return isCurrentDot
      ? <circle cx={props.cx} cy={props.cy} r={4} stroke={props.stroke} strokeWidth={2} fill="white" />
      : <circle cx={props.cx} cy={props.cy} r={4} fill={props.stroke} />;
  }}
  ```

### WorkstreamHealthCard — `components/Dashboard/WorkstreamHealthCard.tsx`

- Pass `currentSprintId` down to `VelocityTrendChart`:
  ```tsx
  <VelocityTrendChart
    trendSprints={trendSprints}
    prediction={prediction ?? null}
    activeSprintId={activeSprintId}
    currentSprintId={currentSprintId}   // ← add this
  />
  ```

### Bug Burndown chart — `WorkstreamHealthCard.tsx`

- Extend `xAxisProps.tickFormatter` in the `AppBarChart` bug burndown section to append `" (Cur)"` for the current sprint:
  ```ts
  tickFormatter: (v: string) => {
    const label = v.replace(/^Sprint\s*/i, '');
    const isCurrent = trendSprints.find((s) => s.sprintName === v)?.isCurrent;
    return isCurrent ? `${label} (Cur)` : label;
  }
  ```

### Overhead chart — `OverheadBreakdownChart.tsx` / `OverheadBreakdownPanel.tsx`

- Same `tickFormatter` pattern: look up `isCurrent` from `trendSprints` and append `" (Cur)"` to the current sprint's x-axis label.

---

## Success Criteria

1. Dashboard loaded during an active sprint shows the current sprint as the rightmost column/point in all three chart types (velocity, bug burndown, overhead)
2. Velocity chart: current sprint point is hollow; the `Forecasted` series overlays the current sprint x-position, not a separate entry to the right
3. Bug burndown and overhead charts: current sprint entry is labeled with `(Cur)` suffix on the x-axis
4. When no current sprint exists (historical view), charts are visually identical to pre-change behavior
5. All existing tests pass; new tests cover `buildTrendSeries` current-sprint emission and `VelocityTrendChart` overlay logic

---

## Scope Boundaries

**Included:**

- `buildTrendSeries` emitting current sprint with `mode: 'current'`
- Type chain propagation (`TrendSprintMetrics → ApiTrendSprint → TrendSprintViewModel` with `isCurrent`)
- `VelocityTrendChart`: hollow dot + forecast overlay on current sprint
- Bug burndown + overhead: `(Cur)` x-axis label for current sprint
- Tests for `buildTrendSeries` and `VelocityTrendChart`

**Excluded:**

- Changing the rolling window size (stays `take: 5`, same as today)
- Live/polling data — current sprint velocity reflects last sync, not real-time ADO data
- Detail panel (Planned/Completed/Carry-over text block) — already pulls from prior sprint by design; no change
- Changes to sync/ingestion, `MetricSnapshot` computation, or any DB schema
- The program-level trend chart (separate component, separate scope)

