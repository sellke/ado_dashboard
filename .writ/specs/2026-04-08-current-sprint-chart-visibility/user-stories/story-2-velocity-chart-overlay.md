# Story 2: Velocity chart — hollow dot and forecast overlay for current sprint

> **Status:** Completed ✅
> **Priority:** High
> **Effort:** Medium
> **Dependencies:** Story 1 — Trend Series Backend

---

## User Story

**As a** dashboard viewer,
**I want** the velocity chart to show the current sprint's partial actual points alongside its forecasted end-of-sprint velocity,
**So that** I can see both where we are now and where we're expected to land — at a glance, on the same chart.

---

## Acceptance Criteria

- [x] **Given** the current sprint is included in `trendSprints` (Story 1 complete),
  **When** the velocity chart renders,
  **Then** the current sprint appears as the rightmost data point with a hollow (open) circle dot, not a filled dot.

- [x] **Given** a `prediction` value exists and the last sprint in `trendSprints` is the current sprint,
  **When** `buildChartData` runs,
  **Then** the `Forecasted` value is placed on the current sprint data point (same x-position) — no separate x-axis entry is appended.

- [x] **Given** `prediction` is null or no current sprint is the last entry,
  **When** `buildChartData` runs,
  **Then** behavior is identical to pre-change (separate forecasted entry appended if applicable).

- [x] **Given** `currentSprintId` is not passed (undefined),
  **When** the chart renders,
  **Then** all dots render as filled circles — no regression.

---

## Implementation Tasks

- [x] Add `currentSprintId?: string` prop to `VelocityTrendChartProps` in `components/Dashboard/VelocityTrendChart.tsx`
- [x] In `buildChartData`: when `currentSprintId` matches the last sprint's `sprintId`, place `Forecasted` value on that data point instead of pushing a new x-entry
- [x] Implement custom `dot` render prop on the `Completed Points` series: render hollow circle (`fill="white"`, `stroke=color`, `strokeWidth=2`) when the data point is the current sprint, filled circle otherwise
- [x] In `components/Dashboard/WorkstreamHealthCard.tsx`: pass `currentSprintId` prop to `VelocityTrendChart`
- [x] Add/update tests in `__tests__/components/Dashboard/VelocityTrendChart.test.tsx` for overlay and hollow dot behavior

---

## Technical Notes

- `VelocityTrendChart` currently has `activeSprintId?: string` (for reference line). The new `currentSprintId` is separate — it identifies the in-flight sprint, not the tab-selected sprint.
- `buildChartData` receives `sprints: TrendSprintViewModel[]`. After Story 1, the last sprint has `isCurrent: true`. Use `sprints[sprints.length - 1]?.sprintId === currentSprintId` (or `isCurrent`) to detect the current sprint.
- Recharts `dot` prop on `<Line>` accepts a render function: `dot={(props) => <circle ... />}`. The `props` object includes `cx`, `cy`, `stroke`, and `payload` (the chart data point object).
- To identify the current sprint in the `dot` renderer: compare `props.payload.sprint` to the current sprint's name, or add a boolean `isCurrentSprint` field to the chart data point object in `buildChartData`.
- The simplest approach: add `isCurrentSprint: boolean` to `ChartDataPoint` type and set it in `buildChartData` when building the current sprint entry. Then `dot` prop checks `props.payload.isCurrentSprint`.
- The existing "connect bridge" between last actual and forecast (lines 38–40 in `VelocityTrendChart.tsx`: `data[data.length - 1].Forecasted = lastActual`) should be removed or adapted — when the current sprint is the last entry, the `Forecasted` value on the same point creates the visual overlay, no bridge needed.

---

## Definition of Done

- [x] Velocity chart shows current sprint as rightmost point with hollow dot
- [x] `Forecasted` series value overlays the current sprint x-position (no separate entry appended)
- [x] When `currentSprintId` is undefined, chart behavior is unchanged
- [x] No TypeScript errors
- [x] Tests cover overlay logic and hollow dot detection

---

## Context for Agents

- **Spec:** `.writ/specs/2026-04-08-current-sprint-chart-visibility/spec.md`
- **Primary file:** `components/Dashboard/VelocityTrendChart.tsx`
- **Secondary file:** `components/Dashboard/WorkstreamHealthCard.tsx` — pass `currentSprintId` to `VelocityTrendChart`; `currentSprintId` is already available from the component's props (`WorkstreamHealthCardProps.currentSprintId?: string`)
- **Chart data type:** `type ChartDataPoint = { sprint: string; 'Completed Points'?: number; Forecasted?: number }` — extend with `isCurrentSprint?: boolean`
- **Dot render pattern:**

  ```tsx
  dot={(props) => {
    const { cx, cy, stroke, payload } = props;
    if (payload.isCurrentSprint) {
      return <circle key={`dot-${cx}`} cx={cx} cy={cy} r={4} stroke={stroke} strokeWidth={2} fill="white" />;
    }
    return <circle key={`dot-${cx}`} cx={cx} cy={cy} r={4} fill={stroke} />;
  }}
  ```

- **Overlay logic in buildChartData:** When last sprint is current, set `data[data.length - 1].Forecasted = prediction.rawVelocity` instead of pushing a new data point. Remove/skip the bridge line (`data[data.length - 1].Forecasted = lastActual`) for the current-sprint case.
