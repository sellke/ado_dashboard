# Phase 1C: Technical Specification

> Spec: .code-captain/specs/2026-02-19-workstream-velocity/spec.md

## Architecture Overview

Phase 1C extends the existing dashboard data pipeline to expose richer per-workstream data (predictions, bug details) and replaces text-based trend rendering with visual charts.

### Data Flow

```
MetricSnapshot + WorkItem (DB)
        ↓
buildTrendSeries() — already computes per-WS prediction + velocity rate
        ↓
GET /api/metrics (EXTENDED: prediction per WS, bugs per trend sprint)
        ↓
adapter.ts (EXTENDED: velocity rate tile, bug view models, prediction mapping)
        ↓
WorkstreamHealthCard
    ├── 4 Metric Tiles (Velocity, Velocity Rate, Overhead %, Carry-Over %)
    ├── VelocityTrendChart (NEW: line chart + reference line + prediction)
    └── SprintBugList (NEW: per-sprint bugs with strikethrough)
```

## Change Impact Analysis

### Story 1: API Data Contract Extension

**Files Modified:**

| File | Change Type | Description |
|------|------------|-------------|
| `app/api/metrics/route.ts` | Modify | Add prediction to workstream response; extend bug query to include adoId + title; add bugs to trend sprint objects |

**Risk Assessment:** Low-Medium. Additive API changes. The `buildTrendSeries()` function already computes predictions — this just exposes them. Bug query extends the existing `trendBugs` fetch.

**Key Implementation Detail:**

The existing code already fetches trend bugs:
```typescript
const trendBugs = await prisma.workItem.findMany({
  where: { type: 'Bug', sprintId: { in: rollingSprintIds }, ...wsFilter },
  select: { sprintId: true, workstreamId: true, state: true, adoChangedDate: true },
});
```

Extend the `select` to include `adoId` and `title`:
```typescript
select: { sprintId: true, workstreamId: true, state: true, adoChangedDate: true, adoId: true, title: true },
```

Then group by sprintId and attach to each trend sprint object.

### Story 2: Types and Adapter

**Files Modified:**

| File | Change Type | Description |
|------|------------|-------------|
| `lib/dashboard/types.ts` | Modify | Add TrendBugViewModel, extend ApiTrendSprint with bugs, add prediction to ApiWorkstream, extend TrendSprintViewModel with bugs, add prediction to WorkstreamCardViewModel |
| `lib/dashboard/adapter.ts` | Modify | Add velocity rate to METRIC_LABELS, map bugs in mapTrendSprint, map prediction per workstream card |
| `__fixtures__/dashboard-fixtures.ts` | Modify | Add bug data and prediction to workstream fixtures |

**Risk Assessment:** Low. Additive type changes and adapter mapping.

### Stories 3 & 4: New Components

**Files Created:**

| File | Change Type | Description |
|------|------------|-------------|
| `components/Dashboard/VelocityTrendChart.tsx` | New | Mantine LineChart with actual + predicted series + reference line |
| `components/Dashboard/VelocityTrendChart.test.tsx` | New | Component tests |
| `components/Dashboard/SprintBugList.tsx` | New | Per-sprint bug listing with strikethrough |
| `components/Dashboard/SprintBugList.test.tsx` | New | Component tests |

**Risk Assessment:** None (new files only).

### Story 5: Card Integration

**Files Modified:**

| File | Change Type | Description |
|------|------------|-------------|
| `components/Dashboard/WorkstreamHealthCard.tsx` | Modify | Replace text trends with VelocityTrendChart + SprintBugList |
| `components/Dashboard/WorkstreamHealthCard.test.tsx` | Modify | Update tests for 4 tiles + chart + bugs |

**Risk Assessment:** Medium. Replacing existing UI content. Must verify no visual regressions.

## Velocity Rate Computation

Velocity rate is **not stored** in MetricSnapshot — it's computed at read time.

**Per sprint:**
```
velocityRate = velocity / netCapacityHours
netCapacityHours = grossHours - overheadHours
```

**For the metric tile (current sprint):**
- Completed sprint: use the sprint's computed velocity rate
- Current sprint (projected): use the average velocity rate from completed sprints

**Source:** `calculateVelocityRate()` and `calculateNetCapacityHours()` in `lib/metrics/trend-service.ts`

## Per-Workstream Prediction

Already computed by `buildTrendSeries()` when `workstreamId` is passed:

```typescript
const prediction: SprintPrediction = {
  velocity: averageVelocityRate * currentNetCapacity,
  mode: 'predicted',
  formula: 'average velocity rate × current sprint net capacity hours',
};
```

**Exposure path:** The API route currently computes `buildTrendSeries({ ..., workstreamId: s.workstreamId })` per workstream. The returned `prediction` just needs to be attached to the response.

## Bug Item Data Model

Leverages existing `WorkItem` model:

```prisma
model WorkItem {
  id               String    @id @default(cuid())
  adoId            Int
  title            String
  type             String    // 'Bug', 'User Story', 'Spike', 'Support', etc.
  state            String    // 'New', 'Active', 'Closed', 'Done', 'Resolved', etc.
  sprintId         String?
  workstreamId     String?
  // ... other fields
}
```

**Query:** Already fetched as `trendBugs` in the API route — extend select clause and attach to response.

**Closed detection:** DONE_STATES = ['Closed', 'Done', 'Resolved']

## Chart Technology

Using `@mantine/charts` (already a dependency, used in ProgramSummarySection):

- `LineChart` for velocity trend with prediction dashed line
- `referenceLines` prop for rolling average horizontal line
- `strokeDasharray: '5 5'` for prediction series
- `connectNulls={false}` to handle missing data points

## Testing Strategy

### Unit Tests
- API route: verify extended response shape (prediction + bugs)
- Adapter: verify velocity rate tile mapping, bug view model mapping, prediction mapping
- Trend service: verify existing prediction tests still pass

### Component Tests
- VelocityTrendChart: renders with data, empty state, reference line presence, prediction point
- SprintBugList: renders bugs grouped by sprint, strikethrough for closed, empty states
- WorkstreamHealthCard: 4 tiles rendered, chart present, bug list present

### Integration
- Full dashboard render: workstream cards display charts and bugs from real API data
- Verify velocity rate values match manual calculations
