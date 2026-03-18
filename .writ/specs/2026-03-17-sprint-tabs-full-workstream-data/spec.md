# Sprint Tabs — Full Workstream Data Scoping

> Created: 2026-03-17
> Status: Complete
> Contract Locked: ✅

## Contract Summary

**Deliverable:** Make all workstream card sections respond to sprint tab selection by enriching the existing API trends with per-sprint rolling averages and detail data, then extracting the appropriate values client-side based on `activeSprintId`.

**Must Include:** Metrics row, detail block, and velocity chart all update when sprint tab changes — currently only story list and overhead items respond.

**Hardest Constraint:** Enriching trend sprints from `MetricSnapshot` without breaking the existing API contract or significantly increasing payload size.

**Success Criteria:** Switching tabs updates all five sections — metrics, detail, velocity chart, overhead items, and story list — to reflect the selected sprint context.

**Scope Boundaries:**
- Included: Enrich API trend sprints with snapshot data, metrics row responds to tab, detail block responds to tab, velocity chart highlights selected sprint
- Excluded: New API endpoints, re-fetching on tab change, predictability metric (not displayed), global state management

## Experience Design

### Entry Point
User clicks a sprint tab in the `SprintTabSelector` component above the workstream cards grid.

### Happy Path
1. User sees the dashboard with the current sprint selected by default
2. User clicks a completed sprint tab (e.g., "Sprint 12")
3. All workstream card sections update instantly:
   - Metrics row shows rolling averages as-of Sprint 12
   - Detail block shows Sprint 12's actual planned/completed/carry-over points
   - Velocity chart highlights Sprint 12's data point
   - Overhead items show Sprint 12's bugs/spikes/support (already working)
   - Story list shows Sprint 12's stories (already working)
4. User clicks back to current sprint — everything resets to default view

### Moment of Truth
Clicking a past sprint tab and seeing the entire card context shift to that sprint's data instantly, with no loading spinners or delays.

### Feedback Model
Inline update — all values change in place simultaneously. No transitions, no loading states (data is pre-loaded in the initial fetch).

### Error Experience
If a sprint has no `MetricSnapshot` data (edge case for very old sprints), metrics display "N/A" gracefully. Detail block shows "N/A" for missing fields. Velocity chart still highlights the selected sprint dot.

## Business Rules

1. **Metrics row shows rolling averages as-of the selected sprint:**
   - "Avg Velocity" → rolling velocity average ending at the selected sprint
   - "Velocity Rate" → actual velocity rate for the selected sprint
   - "Overhead %" → rolling overhead average ending at the selected sprint
   - "Carry-Over %" → rolling carry-over average ending at the selected sprint

2. **Detail block shows that sprint's actual values:**
   - Planned points, completed points, carry-over points from the selected sprint's `MetricSnapshot`
   - Detail sprint label updates to reflect the selected sprint's name and dates

3. **Velocity chart highlights the selected sprint:**
   - Visual indicator (e.g., larger dot, different fill, or vertical reference line) on the selected sprint's data point
   - Chart still shows all trend sprints for context

4. **Current sprint default:**
   - On load, current sprint tab is selected (existing behavior preserved)
   - When current sprint is selected, behavior is identical to today's behavior

5. **Data source:**
   - All data comes from the enriched initial API response (no refetch on tab change)
   - Per-sprint data sourced from `MetricSnapshot` table (already stores rolling averages and detail)

## Detailed Requirements

### API Enrichment

Extend each object in the `trends.sprints` array with fields from `MetricSnapshot`:

| Field | Source | Purpose |
|---|---|---|
| `velocityAvg` | `MetricSnapshot.velocityAvg` | Rolling avg velocity as-of sprint |
| `overheadPercentAvg` | `MetricSnapshot.overheadPercentAvg` | Rolling avg overhead as-of sprint |
| `carryOverRateAvg` | `MetricSnapshot.carryOverRateAvg` | Rolling avg carry-over as-of sprint |
| `plannedPoints` | `MetricSnapshot.plannedPoints` | Detail block planned points |
| `completedPoints` | `MetricSnapshot.completedPoints` | Detail block completed points |
| `carryOverPoints` | `MetricSnapshot.carryOverPoints` | Detail block carry-over points |
| `grossHours` | `MetricSnapshot.grossHours` | Detail block gross hours |

These fields are nullable — `MetricSnapshot` may not exist for every sprint in the window.

### Client-Side Extraction

When `activeSprintId` changes, `WorkstreamHealthCard` finds the matching trend sprint and extracts:
- Rolling averages for the metrics row tiles
- Detail values for the detail block
- Sprint name for the detail label

If no matching trend sprint is found (shouldn't happen in practice), fall back to default behavior (current sprint data from the top-level response).

### Velocity Chart Highlighting

`VelocityTrendChart` receives `activeSprintId` and visually distinguishes the selected sprint's data point. Implementation options (in order of preference):
1. Larger, filled dot on the selected sprint
2. Vertical reference line at the selected sprint
3. Different color for the selected sprint's dot

## Implementation Approach

**Strategy:** Enrich existing API response → extend types → update adapter → update UI components. No new endpoints, no refetching.

**Data flow after change:**
```
GET /api/metrics (initial load, unchanged endpoint)
→ response.workstreams[].trends.sprints[] now includes snapshot fields
→ adapter maps to enriched TrendSprintViewModel
→ WorkstreamCardsGrid passes activeSprintId to WorkstreamHealthCard
→ WorkstreamHealthCard extracts metrics/detail from matching trend sprint
→ VelocityTrendChart highlights selected sprint
```

## Cross-Spec Overlap

- **workstream-velocity** (In Progress) — Both touch `VelocityTrendChart` and `WorkstreamHealthCard` metrics tiles. This spec adds `activeSprintId` awareness; velocity spec adds the chart and rate tile. Coordinate: velocity spec should be completed first since it establishes the chart component.
- **workstream-overhead** (Planning) — Both touch `OverheadBreakdownPanel`. Overhead items already respond to `activeSprintId`; this spec doesn't change overhead behavior. No conflict expected.

## Relevant Files

### Modified
- `app/api/metrics/route.ts` — enrich trend sprint objects with MetricSnapshot fields
- `lib/dashboard/types.ts` — extend `ApiTrendSprint` and `TrendSprintViewModel` with new fields
- `lib/dashboard/adapter.ts` — map new trend sprint fields
- `components/Dashboard/WorkstreamHealthCard.tsx` — extract metrics/detail from active sprint's trend data
- `components/Dashboard/VelocityTrendChart.tsx` — add `activeSprintId` prop and visual highlight

### Unchanged
- `components/Dashboard/WorkstreamCardsGrid.tsx` — already passes `activeSprintId` to cards
- `components/Dashboard/SprintTabSelector.tsx` — already handles tab state
- `components/Dashboard/SprintStoryListPanel.tsx` — already responds to `activeSprintId`
- `components/Dashboard/OverheadBreakdownPanel.tsx` — already filters items by `activeSprintId`
- `lib/dashboard/sprint-utils.ts` — sprint list derivation unchanged
