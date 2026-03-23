# Dashboard Metrics Audit

> Created: 2026-03-23
> Status: Complete
> Origin: Section-by-section audit of live dashboard (2026-03-20/23)

## Contract Summary

**Deliverable:** Fix metric tile data sources, rework milestone display, improve layout density, add overhead composition chart, and scope bug page to dashboard filter.

**Must Include:** Per-sprint actual Overhead % and Carry-Over % that respond to sprint tab selection.

**Hardest Constraint:** The milestones rework (P2) touches milestones API, adapter, types, and a new UI component — most structurally complex change.

## Experience Design

**Entry point:** Existing `/dashboard` and `/dashboard/streams` pages — no new routes.

**Happy path:** User opens dashboard → sees correct rolling-average metrics at program level → scrolls to workstream cards → selects sprint tab → Overhead % and Carry-Over % update to that sprint's actuals → milestone section shows quarterly-grouped Feature progress with per-workstream story breakdowns.

**Feedback model:** Instant tab switching — all data pre-loaded in trend sprints (no refetch on tab change). Milestone data loaded from existing `/api/milestones` endpoint.

**Error experience:** Unchanged — empty states for missing data, error alerts for failed fetches.

## Business Rules

### Metric Tile Behavior

**Program Summary (5 tiles, unchanged except Predictability exclusion):**
- Avg Total Velocity (pts) — rolling average, summed across workstreams
- Avg Total Velocity Rate (pts/hr) — rolling average
- Avg Total Overhead % — rolling average
- Avg Total Carry-Over % — rolling average

**Workstream Cards (4 tiles per card):**

| Tile | Value Source | Responds to Sprint Tab |
|---|---|---|
| Avg Velocity | Rolling average (unchanged) | Yes — shows rolling avg as-of selected sprint |
| Velocity Rate | Avg velocity rate (unchanged) | No — always shows latest |
| Overhead % | **Selected sprint's actual overhead %** | **Yes** |
| Carry-Over % | **Selected sprint's actual carry-over %** | **Yes** |

When the sprint tab changes to a non-current sprint:
- Overhead % shows that sprint's actual `overheadPercent` (from `overheadComposition.overheadPercent` on the trend sprint, or from `MetricSnapshot.overheadPercent`)
- Carry-Over % shows that sprint's actual carry-over rate, derived from `carryOverPoints / plannedPoints * 100` on the trend sprint

When the sprint tab is on the current (in-flight) sprint:
- Overhead % and Carry-Over % show the current snapshot values (existing behavior)

### Milestone Display (Program Summary)

Replace the current count-card rollup (Total / Complete / In Progress / Not Started) with a quarterly-grouped, per-milestone, per-workstream breakdown:

**Grouping:** By quarter tag (Q1, Q2, Q3, Q4) from Feature-level milestones.

**Per Feature milestone, per workstream:**
- Total count of ADP-month-tagged child User Stories
- % of those stories that are In Progress (ADO states: Active, In Progress)
- % of those stories that are Completed (ADO states: Resolved, Closed, Done)

**ADO State Mapping** (consistent with existing `mapStateToStatusGroup`):
- In Progress = states mapped to `Active` status group
- Completed = states mapped to `Resolved` or `Completed` status groups

### Bug Page Scoping

`BugReportContainer` currently fetches `/api/metrics` with no dashboard filter, showing all 5 workstreams including Streams. Change to pass `dashboard=main` so it respects the same filter as the main dashboard (Action Tracker, Pitch Tracker, KPI Services, UCM only).

## Detailed Requirements

### Story 1: Sprint-Actual Overhead % and Carry-Over % (W2/W3)

**Problem:** When a user selects a non-current sprint tab, the Overhead % and Carry-Over % tiles show that sprint's rolling averages (`overheadPercentAvg`, `carryOverRateAvg`) instead of the actual values for that sprint. For the default (current sprint) view, the tiles show the current snapshot's value/avg which may also not be the sprint-specific actual.

**Fix:**
1. Ensure per-sprint `overheadPercent` (actual) is available on `TrendSprintViewModel`. It's already in the API response via `overheadComposition.overheadPercent` but not mapped to a top-level field on the view model.
2. Ensure per-sprint `carryOverRate` (actual) is available on `TrendSprintViewModel`. It can be derived: `(carryOverPoints / plannedPoints) * 100` — both fields are already on the trend sprint.
3. Update `WorkstreamHealthCard` to use actual values (not `*Avg` fields) when overriding metrics for a selected sprint.

**Files:**
- `lib/dashboard/types.ts` — add `rawOverheadPercent` and `rawCarryOverRate` to `TrendSprintViewModel`
- `lib/dashboard/adapter.ts` — map `overheadComposition.overheadPercent` and derive carry-over rate in `mapTrendSprint()`
- `components/Dashboard/WorkstreamHealthCard.tsx` — use actual values in `displayMetrics` override

### Story 2: Workstream Cards 2-Column Layout (W1)

**Problem:** The 4-column grid (`lg: 4`) makes each workstream card ~25% viewport width. With velocity charts, story lists, overhead charts + item tables, and milestones with burnup charts, cards are extremely tall and cramped. Charts are unreadable at this width.

**Fix:** Change `WorkstreamCardsGrid` from `lg: 4` to `lg: 2`. Each card gets ~50% viewport width. Charts become readable, story list titles aren't truncated as aggressively, and the vertical stack is shorter.

**Files:**
- `components/Dashboard/WorkstreamCardsGrid.tsx` — change `SimpleGrid cols` from `{ base: 1, sm: 2, lg: 4 }` to `{ base: 1, lg: 2 }`

### Story 3: Overhead Composition Stacked Bar Chart (W4)

**Problem:** `OverheadCompositionChart.tsx` (stacked bar showing ceremony/bug/spike/support hours per sprint) exists as a component with tests and Storybook stories but is not wired into the dashboard. Only `OverheadBreakdownChart.tsx` (multi-line trend) is displayed in `OverheadBreakdownPanel`.

**Fix:** Add `OverheadCompositionChart` to `OverheadBreakdownPanel` alongside the existing line chart. The composition data (`overheadComposition` from trend sprints) is already mapped to `OverheadCompositionViewModel[]` by the adapter and available on the workstream card view model.

**Files:**
- `components/Dashboard/OverheadBreakdownPanel.tsx` — import and render `OverheadCompositionChart` using `card.overheadComposition` (passed through from parent)
- `components/Dashboard/WorkstreamHealthCard.tsx` — pass `overheadComposition` to `OverheadBreakdownPanel`

### Story 4: Milestone Section Rework (P2)

**Problem:** The Program Summary milestone section shows simple count cards (Total / Complete / In Progress / Not Started) with a current month SP summary. Leadership needs to see per-Feature, per-workstream story breakdowns grouped by quarter.

**Required Display:**

```
Q3 FY26
├── Feature: "Streams v2 Launch" (#12345)
│   ├── Action Tracker: 12 stories → 25% in progress, 50% completed
│   ├── Pitch Tracker: 8 stories → 12% in progress, 75% completed
│   └── KPI Services: 5 stories → 0% in progress, 40% completed
│
├── Feature: "Config Unification" (#12346)
│   └── UCM: 15 stories → 33% in progress, 20% completed

Q4 FY26
├── Feature: "KPI Dashboard" (#12347)
│   └── KPI Services: 10 stories → 0% in progress, 0% completed
```

**Data source:** The milestones API already returns per-milestone progress (completedPoints, totalPoints, percentComplete). It also returns child stories grouped by feature. What's needed:

1. **API enrichment:** Extend `GET /api/milestones` to include per-workstream child story breakdowns for each milestone — total count, count in progress, count completed, grouped by workstream.
2. **Types:** New view model types for the quarterly-grouped, per-workstream display.
3. **Adapter:** Transform API response into the quarterly-grouped structure.
4. **Component:** New `MilestoneQuarterlyPanel` component replacing the current count-card display in `ProgramSummarySection`.

**ADO State Classification for stories:**
- In Progress: states in the `Active` status group (`Active`, `In Progress`, etc.)
- Completed: states in the `Resolved` or `Completed` status groups (`Resolved`, `Closed`, `Done`, etc.)
- Remaining: all other states (New, etc.)

**Files:**
- `app/api/milestones/route.ts` — extend response with per-workstream story breakdown per milestone
- `lib/milestones/types.ts` — add per-workstream breakdown types
- `lib/dashboard/types.ts` — add `MilestoneQuarterlyViewModel`, `MilestoneWorkstreamBreakdown`
- `lib/dashboard/adapter.ts` — add quarterly grouping + workstream breakdown mapping
- `components/Dashboard/MilestoneQuarterlyPanel.tsx` — new component
- `components/Dashboard/ProgramSummarySection.tsx` — replace count-card section with new panel

### Story 5: Bug Page Dashboard Filter (B1)

**Problem:** `BugReportContainer` fetches `/api/metrics` without a dashboard filter, returning all 5 workstreams including Streams. The main dashboard filters to 4 workstreams.

**Fix:** Pass `dashboard="main"` to the fetch URL in `BugReportContainer`, consistent with the main dashboard.

**Files:**
- `components/Dashboard/BugReportContainer.tsx` — change fetch URL to `/api/metrics?dashboard=main`

## Implementation Approach

**Order:** Stories 1, 2, 3, 5 are independent and can be built in parallel. Story 4 (milestone rework) is the largest and can start in parallel but has the most moving parts.

**Data strategy:** Reuse existing API data wherever possible. Stories 1–3 and 5 require no new API endpoints. Story 4 requires extending the milestones API response.

**Testing:** Each story should include unit tests for adapter changes and component tests for UI changes, following existing patterns in `__tests__/`.

## Scope Boundaries

**Included:**
- Sprint-actual Overhead % and Carry-Over % (W2/W3)
- 2-column workstream card layout (W1)
- Overhead composition stacked bar chart (W4)
- Milestone quarterly/workstream rework (P2)
- Bug page dashboard filter (B1)

**Excluded:**
- Predictability metric display (not needed at workstream level; not needed at program level per user)
- PowerPoint export (separate spec after metrics are correct)
- Phase 2 transcript/ceremony features
- New pages or routes
- Aging WIP, Scope Creep Index, Cross-Team Dependencies (deferred)
