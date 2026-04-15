# Story 3: Bug burndown and overhead — label current sprint as in-progress

> **Status:** Completed ✅
> **Priority:** Normal
> **Effort:** Small
> **Dependencies:** Story 1 — Trend Series Backend

---

## User Story

**As a** dashboard viewer,
**I want** the bug burndown and overhead charts to label the current sprint distinctly,
**So that** I can quickly tell which column represents in-progress data versus completed sprint history.

---

## Acceptance Criteria

- [x] **Given** the current sprint appears in `trendSprints` (Story 1 done),
  **When** the bug burndown chart renders,
  **Then** the current sprint's x-axis tick reads `"N (Cur)"` (where N is the sprint number stripped of the "Sprint " prefix, matching existing tickFormatter behavior).

- [x] **Given** the overhead breakdown chart renders trend data,
  **When** the current sprint entry appears,
  **Then** its x-axis tick also reads `"N (Cur)"`.

- [x] **Given** the current sprint is NOT the last sprint in `trendSprints` (historical view or no active sprint),
  **When** the charts render,
  **Then** no `(Cur)` label appears — no regression.

- [x] **Given** the `isCurrent` flag is `true` on a `TrendSprintViewModel` entry,
  **When** the `tickFormatter` encounters that sprint name,
  **Then** it appends `" (Cur)"` after stripping the "Sprint " prefix.

---

## Implementation Tasks

- [x] In `components/Dashboard/WorkstreamHealthCard.tsx`, extend the bug burndown `AppBarChart` `xAxisProps.tickFormatter` to look up `isCurrent` from `trendSprints` by sprint name and append `" (Cur)"` when true
- [x] Locate the overhead chart's `tickFormatter` (in `components/Dashboard/OverheadBreakdownChart.tsx` or `OverheadBreakdownPanel.tsx`) and apply the same `(Cur)` suffix pattern
- [x] Verify both charts' tick labels visually with a current-sprint dataset (verified via test assertions in OverheadBreakdownChart.test.tsx and WorkstreamHealthCard.test.tsx)

---

## Technical Notes

- Existing bug burndown `tickFormatter` in `WorkstreamHealthCard.tsx`: `(v: string) => v.replace(/^Sprint\s*/i, '')` — extend to: strip prefix, then check if `trendSprints.find((s) => s.sprintName === v)?.isCurrent` is true, if so append `" (Cur)"`.
- `trendSprints` is in scope in `WorkstreamHealthCard` as a destructured value from `card`. The `buildBugChartData` function is defined at module level — pass `trendSprints` into the tickFormatter closure or inline the check.
- For the overhead chart: check which component owns the overhead x-axis tick. It may be `OverheadBreakdownChart.tsx` (receives `overheadComposition` array) or rendered inside `OverheadBreakdownPanel.tsx`. The overhead data is keyed by `sprintName`, so cross-referencing `trendSprints` by name is the same pattern.
- No visual color/opacity changes needed for this story — the `(Cur)` label is the sole distinction for bugs and overhead charts. The hollow dot (Story 2) handles the velocity chart visual.
- The `OverheadBreakdownPanel` receives `trendSprints` as a prop (via `WorkstreamHealthCard`). Verify whether it needs a prop addition or can derive `isCurrent` from its existing data.

---

## Definition of Done

- [x] Bug burndown chart labels current sprint as `"N (Cur)"` on x-axis
- [x] Overhead breakdown chart labels current sprint as `"N (Cur)"` on x-axis
- [x] Historical sprints have no `(Cur)` label — behavior unchanged
- [x] No TypeScript errors
- [x] No visual regressions in other chart labels

---

## Context for Agents

- **Spec:** `.writ/specs/2026-04-08-current-sprint-chart-visibility/spec.md`
- **Bug burndown chart location:** `WorkstreamHealthCard.tsx` — the `<AppBarChart>` in the "Bug Burndown" section, `xAxisProps.tickFormatter`
- **Overhead chart location:** `components/Dashboard/OverheadBreakdownChart.tsx` and/or `OverheadBreakdownPanel.tsx`
- **`isCurrent` source:** `TrendSprintViewModel.isCurrent` (boolean, set by Story 1)
- **TickFormatter pattern:**

  ```ts
  tickFormatter: (v: string) => {
    const label = v.replace(/^Sprint\s*/i, '');
    const isCurrent = trendSprints.find((s) => s.sprintName === v)?.isCurrent;
    return isCurrent ? `${label} (Cur)` : label;
  }
  ```

- **`trendSprints` availability:** Already destructured in `WorkstreamHealthCard` from `card.trendSprints`. For the overhead chart, check if `OverheadBreakdownPanel` already receives `trendSprints` (it does, via its props).
