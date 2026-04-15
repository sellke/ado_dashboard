# Current Sprint Chart Visibility (Lite)

> Source: .writ/specs/2026-04-08-current-sprint-chart-visibility/spec.md
> Purpose: Efficient AI context for implementation

## For Coding Agents

**Deliverable:** Include current sprint in velocity, bug burndown, and overhead charts with in-progress styling.

**Root cause:** `buildTrendSeries` filters out `selectedCurrentSprintId`. Data is already fetched — just dropped.

**Implementation Approach:**
- `lib/metrics/trend-service.ts`: after building `actualSprintsAsc` (4 prior), push current sprint with `mode: 'current'`; `TrendSprintMetrics.mode` becomes `'actual' | 'current'`
- `lib/dashboard/types.ts`: add `isCurrent: boolean` to `TrendSprintViewModel`; `ApiTrendSprint.mode` union adds `'current'`
- `lib/dashboard/adapter.ts`: `mapTrendSprint` sets `isCurrent: sprint.mode === 'current'`
- `components/Dashboard/VelocityTrendChart.tsx`: add `currentSprintId` prop; overlay `Forecasted` on current sprint data point (no separate x-entry); hollow dot via custom `dot` render prop
- `components/Dashboard/WorkstreamHealthCard.tsx`: pass `currentSprintId` to `VelocityTrendChart`; extend bug burndown `tickFormatter` to append `(Cur)` for current sprint

**Files in Scope:**
- `lib/metrics/trend-service.ts` — emit current sprint with `mode: 'current'`
- `lib/dashboard/types.ts` — `ApiTrendSprint.mode`, `TrendSprintViewModel.isCurrent`
- `lib/dashboard/adapter.ts` — `mapTrendSprint` sets `isCurrent`
- `components/Dashboard/VelocityTrendChart.tsx` — hollow dot + forecast overlay
- `components/Dashboard/WorkstreamHealthCard.tsx` — pass prop, bug burndown label
- `components/Dashboard/OverheadBreakdownChart.tsx` (or Panel) — `(Cur)` label

**No DB or API route changes needed.** Current sprint data already in `trendSnapshots`.

---

## For Review Agents

**Acceptance Criteria:**
1. During active sprint: current sprint appears as rightmost point in velocity chart, bug burndown, and overhead chart
2. Velocity chart current-sprint dot is hollow (open circle); forecasted value overlays same x-position
3. Bug burndown + overhead x-axis show `Sprint N (Cur)` for current sprint
4. Historical sprint view (no active sprint) renders identically to pre-change behavior
5. `buildTrendSeries` emits exactly 5 entries when current sprint exists (4 actual + 1 current)

**Business Rules:**
- Rolling window stays 5 sprints total (`take: 5` from DB, unchanged)
- `mode: 'current'` marks the in-flight sprint; all others remain `mode: 'actual'`
- `velocity` for current sprint = story points in DONE states at last sync (partial)
- Forecast overlays current sprint, not appended as a new x-axis entry

**Experience Design:**
- Entry: dashboard load during active sprint
- Happy path: all three charts show current sprint rightmost with partial data
- Feedback: hollow dot + `(Cur)` label signals in-progress without tooltip/callout
- Error: no current sprint → charts unchanged from today's behavior

---

## For Testing Agents

**Success Criteria:**
1. `buildTrendSeries` unit tests: 5-sprint output when current sprint present; `mode: 'current'` on last entry
2. `VelocityTrendChart` unit tests: no separate forecasted entry when current sprint is last; `Forecasted` value on current sprint data point
3. Adapter tests: `isCurrent: true` on mapped sprint with `mode: 'current'`

**Shadow Paths to Verify:**
- **Happy path:** 4 prior + 1 current sprint → 5 entries, current is `isCurrent: true`
- **No current sprint:** `selectedCurrentSprintId` not in `rollingSprintsDesc` → 4 entries, no `isCurrent` entry
- **Current sprint has null velocity:** MetricSnapshot missing → `velocity: null`, chart dot omitted via `connectNulls: false`
- **No prediction:** `prediction` is null → no `Forecasted` overlay, chart renders only `Completed Points`

**Edge Cases:**
- Rolling window < 5 sprints (new project) → current sprint still appended if ref exists
- `currentSprintId` prop undefined in VelocityTrendChart → falls back to existing forecast-append behavior

**Coverage:** `trend-service.test.ts`, `adapter.test.ts`, `VelocityTrendChart.test.tsx`
