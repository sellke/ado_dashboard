# Phase 1C: Workstream Velocity Section — Specification

> Created: 2026-02-19
> Status: Planning
> Contract Locked: ✅

## Contract Summary

**Deliverable:** Extend WorkstreamHealthCards with inline velocity line charts, per-workstream velocity rate tile, current-sprint prediction, and per-sprint bug listings with closed-item strikethrough.

**Must Include:** Per-workstream velocity line chart replacing text-based trends, with rolling average reference line and dashed prediction extension for the current sprint.

**Hardest Constraint:** The per-sprint bug listing requires a new API contract — the current API returns only bug *counts* per sprint, not individual work items. We need to fetch and expose per-sprint bug details (ADO ID, title, state) per workstream.

**Success Criteria:**
- Each WorkstreamHealthCard renders a velocity line chart (5 sprints + prediction)
- Velocity rate shows as a 4th metric tile with value formatted as pts/hr
- Rolling average appears as a horizontal reference line on the velocity chart
- Current sprint prediction appears as dashed line extension, visually distinct from actuals
- Each sprint in the card lists bugs by ADO number and title, with closed bugs struck through
- All new components have unit tests

**Scope Boundaries:**
- Included: Velocity chart, velocity rate tile, prediction per workstream, rolling avg reference line, per-sprint bug listing with strikethrough
- Excluded: Carry-over chart (metric tile only), overhead composition breakdown (Phase 1D), Storybook stories (deferred), milestone data (Phase 1E)

---

## Detailed Requirements

### 1. Velocity Rate Metric Tile

Add velocity rate as a **4th metric tile** in each WorkstreamHealthCard. The tile order becomes:

| # | Metric | Format | Source |
|---|--------|--------|--------|
| 1 | Velocity | `42 SP` | MetricSnapshot.velocity |
| 2 | Velocity Rate | `0.95 pts/hr` | Computed: velocity / netCapacityHours |
| 3 | Overhead % | `32.5%` | MetricSnapshot.overheadPercent |
| 4 | Carry-Over % | `12.3%` | MetricSnapshot.carryOverRate |

- Velocity rate is computed per workstream per sprint: `doneLikeStoryPoints / (grossHours - overheadHours)`
- The value comes from the trend service calculation, exposed via the API
- RAG badge: none for velocity rate (informational metric, no threshold defined)
- For current sprint (projected mode): append "(Projected)" to velocity and velocity rate values

### 2. Velocity Line Chart

Replace the text-based trend section in WorkstreamHealthCard with an inline Mantine `LineChart`:

- **Data points:** 4 completed sprints (solid line with dots) + current sprint prediction (dashed extension)
- **X-axis:** Sprint names (abbreviated, e.g., "Sprint 1", "Sprint 2")
- **Y-axis:** Story points completed
- **Reference line:** Horizontal dashed line at the rolling average velocity value, labeled "Avg: X"
- **Prediction:** Dashed line segment from the last actual sprint to the predicted value for the current sprint
- **Chart height:** ~200px (compact within the card)
- **Styling:** Match the existing program-level velocity chart style (`LineChart` from `@mantine/charts`)

### 3. Current-Sprint Prediction (Per Workstream)

- **Formula:** `avgVelocityRate × currentSprintNetCapacityHours`
  - `avgVelocityRate` = mean of velocity rates across the 4 completed sprints in the rolling window
  - `currentSprintNetCapacityHours` = current sprint's `grossHours - overheadHours` for that workstream
- **Display:** Dashed line extending from the last actual data point to the predicted point
- **Label:** Sprint name with "(Forecasted)" suffix
- The `buildTrendSeries()` function already computes this per workstream when `workstreamId` is provided — this just needs to be exposed in the API response

### 4. Per-Sprint Bug Listing

For each sprint in the workstream trend window, display individual bug work items:

- **Data per bug:** ADO work item ID, title, state
- **Closed bugs:** Rendered with strikethrough text styling (CSS `text-decoration: line-through`)
- **Open bugs:** Rendered in normal text
- **ADO ID format:** `#12345` (prefixed with hash)
- **Placement:** Below the velocity chart, grouped by sprint
- **Empty state:** "No bugs" text when a sprint has zero bug items
- **Source:** `WorkItem` table filtered by `type = 'Bug'`, joined by `sprintId` and `workstreamId`

### 5. API Changes

Extend the `GET /api/metrics` response:

#### Per-workstream prediction (new field on `ApiWorkstream`)

```typescript
prediction?: {
  velocity: number | null;
  velocityRate: number | null;
  mode: 'predicted';
  formula: string;
}
```

#### Per-sprint bug items (new field on trend sprint objects)

```typescript
// Extended ApiTrendSprint
bugs: Array<{
  adoId: number;
  title: string;
  state: string;
}>
```

### 6. Type Changes

#### `lib/dashboard/types.ts`

- Add `prediction` to `ApiWorkstream`
- Add `bugs` array to `ApiTrendSprint`
- Add `velocityRate` metric tile to `WorkstreamCardViewModel`
- Add `TrendBugViewModel` type for UI bug items
- Extend `TrendSprintViewModel` with `bugs: TrendBugViewModel[]`

#### `lib/dashboard/adapter.ts`

- Map velocity rate from API to 4th metric tile
- Map per-sprint bugs to `TrendBugViewModel[]`
- Map per-workstream prediction to chart data

### 7. Component Changes

#### `WorkstreamHealthCard.tsx`

- Render 4 metric tiles instead of 3 (add velocity rate)
- Replace text-based trend section with `VelocityTrendChart` component
- Add per-sprint bug listing section below chart
- Handle empty states (no trend data, no bugs)

#### New: `VelocityTrendChart.tsx` (component within Dashboard/)

- Accepts trend sprint data + prediction + rolling avg
- Renders Mantine `LineChart` with actual + predicted series
- Adds horizontal reference line for rolling average
- Compact height (~200px)

#### New: `SprintBugList.tsx` (component within Dashboard/)

- Accepts array of trend sprints with bug data
- Renders per-sprint collapsible/grouped bug lists
- Closed bugs shown with strikethrough
- ADO ID as `#12345` prefix

---

## Implementation Approach

### Data Flow

```
MetricSnapshot (DB)
  ↓
GET /api/metrics (extended response)
  ↓  now includes: per-workstream prediction + per-sprint bug items
adapter.ts (maps to view models)
  ↓  now maps: velocity rate tile + bug view models + prediction
WorkstreamHealthCard
  ├── 4 metric tiles (velocity, velocity rate, overhead %, carry-over %)
  ├── VelocityTrendChart (line chart + reference line + prediction)
  └── SprintBugList (per-sprint bug items with strikethrough)
```

### Leveraged Existing Code

- `buildTrendSeries()` already computes per-workstream predictions — just needs API exposure
- `calculateVelocityRate()` and `calculateNetCapacityHours()` exist in `trend-service.ts`
- Mantine `LineChart` with `referenceLines` prop already used in `ProgramSummarySection`
- `WorkItem` model has `adoId`, `title`, `state`, `type`, `sprintId`, `workstreamId`

### New Code Required

1. API query: fetch bug work items per sprint per workstream for the rolling window
2. API response extension: add prediction + bugs to workstream trend data
3. Type definitions: `TrendBugViewModel`, extended API types
4. `VelocityTrendChart` component with prediction line
5. `SprintBugList` component with strikethrough styling
6. Adapter mapping for new fields
7. Unit tests for all new/changed code
