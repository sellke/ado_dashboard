---
# Phase 1D: Workstream Overhead — Technical Specification

> Spec: `../spec.md`
> Related stories: `../user-stories/`

## Architecture Overview

Phase 1D extends the existing metric pipeline (Phase 1A) and dashboard components (Phase 1B/1C) to surface overhead composition data per workstream. The change touches 4 layers: DB schema → metric engine → API → UI.

```
calculateOverhead() [calculators.ts]
  returns: { overheadHours, overheadPercent, ceremonyHours, bugHours, spikeHours, supportHours }
    ↓
orchestrator.ts
  upserts: MetricSnapshot (4 new breakdown columns)
    ↓
GET /api/metrics [route.ts]
  response: trend sprints + overheadComposition, workstreams + currentSprintOverheadItems
    ↓
adapter.ts
  maps: OverheadCompositionViewModel[], OverheadItemViewModel[]
    ↓
WorkstreamHealthCard
  └── OverheadBreakdownPanel
        ├── OverheadCompositionChart (stacked bar)
        └── CurrentSprintItemTables (bug + support lists)
```

## Database Changes

### MetricSnapshot — New Columns

```prisma
model MetricSnapshot {
  // ... existing fields ...
  ceremonyHours   Float?   // 10.25 × FTE count, from SprintWorkstream.ceremonyHours
  bugHours        Float?   // sum(completedWork ?? originalEstimate) for Bug items
  spikeHours      Float?   // sum(storyPoints × 1) for Spike items
  supportHours    Float?   // sum(completedWork ?? originalEstimate) for Support items
}
```

**Migration name:** `add_overhead_breakdown_to_metric_snapshots`

All columns nullable — existing rows will have NULL values; the chart handles nulls as 0.

## Metric Engine Changes

### `lib/metrics/types.ts`

```typescript
// Updated OverheadResult
export interface OverheadResult {
  overheadHours: number;
  overheadPercent: number | null;
  ceremonyHours: number;   // NEW
  bugHours: number;        // NEW
  spikeHours: number;      // NEW
  supportHours: number;    // NEW
}
```

### `lib/metrics/calculators.ts`

`calculateOverhead()` already computes `ceremonyHours`, `bugHours`, `spikeHours`, `supportHours` as intermediate values. The change is purely additive — return them in the result object.

```typescript
// No logic changes, only expand return:
return {
  overheadHours,
  overheadPercent: grossHours ? (overheadHours / grossHours) * 100 : null,
  ceremonyHours,   // already computed
  bugHours,        // already computed
  spikeHours,      // already computed
  supportHours,    // already computed
};
```

### `lib/metrics/orchestrator.ts`

Add to MetricSnapshot upsert `data`:
```typescript
ceremonyHours: overhead.ceremonyHours,
bugHours:      overhead.bugHours,
spikeHours:    overhead.spikeHours,
supportHours:  overhead.supportHours,
```

## API Changes

### Extended `trendSnapshots` Query

Add the four breakdown columns to the `select` in the existing `trendSnapshots` query:

```typescript
select: {
  sprintId: true,
  workstreamId: true,
  velocity: true,
  grossHours: true,
  overheadHours: true,
  overheadPercent: true,    // ADD
  ceremonyHours: true,      // ADD
  bugHours: true,           // ADD
  spikeHours: true,         // ADD
  supportHours: true,       // ADD
},
```

### New Support Items Query

```typescript
const trendSupportItems = await prisma.workItem.findMany({
  where: {
    type: 'Support',
    sprintId: { in: rollingSprintIds },
    ...wsFilter,
  },
  select: {
    sprintId: true,
    workstreamId: true,
    state: true,
    adoId: true,
    title: true,
    completedWork: true,
    originalEstimate: true,
  },
  orderBy: { adoId: 'asc' },
});
```

### `overheadComposition` on Trend Sprints

For each trend sprint in `formatted.trends.sprints`, add:

```typescript
overheadComposition: {
  ceremonyHours: snapshot?.ceremonyHours ?? null,
  bugHours:      snapshot?.bugHours ?? null,
  spikeHours:    snapshot?.spikeHours ?? null,
  supportHours:  snapshot?.supportHours ?? null,
  totalOverheadHours: snapshot?.overheadHours ?? null,
  overheadPercent:    snapshot?.overheadPercent ?? null,
}
```

### `currentSprintOverheadItems` on Workstreams

```typescript
currentSprintOverheadItems: {
  bugs: trendBugs
    .filter(b => b.sprintId === sprintId && b.workstreamId === ws.workstreamId)
    .map(b => ({
      adoId: b.adoId,
      title: b.title,
      state: b.state,
      hours: b.completedWork ?? b.originalEstimate ?? null,
    })),
  support: trendSupportItems
    .filter(s => s.sprintId === sprintId && s.workstreamId === ws.workstreamId)
    .map(s => ({
      adoId: s.adoId,
      title: s.title,
      state: s.state,
      hours: s.completedWork ?? s.originalEstimate ?? null,
    })),
}
```

## New Dashboard Types

```typescript
// lib/dashboard/types.ts additions

export interface ApiOverheadComposition {
  ceremonyHours: number | null;
  bugHours: number | null;
  spikeHours: number | null;
  supportHours: number | null;
  totalOverheadHours: number | null;
  overheadPercent: number | null;
}

export interface ApiOverheadItem {
  adoId: number;
  title: string;
  state: string;
  hours: number | null;
}

// Extend ApiTrendSprint:
overheadComposition?: ApiOverheadComposition;

// Extend ApiWorkstream:
currentSprintOverheadItems?: {
  bugs: ApiOverheadItem[];
  support: ApiOverheadItem[];
};

export interface OverheadCompositionViewModel {
  sprintName: string;
  ceremonyHours: number;  // null → 0 in adapter
  bugHours: number;
  spikeHours: number;
  supportHours: number;
  overheadPercent: string;  // formatted "32.5%"
}

export interface OverheadItemViewModel {
  adoId: string;      // "#12345"
  title: string;
  state: string;
  hours: string;      // "4.5 hrs" or "N/A"
  isClosed: boolean;
}

// Extend WorkstreamCardViewModel:
overheadComposition: OverheadCompositionViewModel[];
currentSprintBugItems: OverheadItemViewModel[];
currentSprintSupportItems: OverheadItemViewModel[];
```

## New Components

### `OverheadCompositionChart.tsx`

```typescript
interface OverheadCompositionChartProps {
  composition: OverheadCompositionViewModel[];
}

// Mantine BarChart config:
const SERIES = [
  { name: 'Ceremony', color: 'blue' },
  { name: 'Bugs',     color: 'red' },
  { name: 'Spikes',   color: 'orange' },
  { name: 'Support',  color: 'yellow' },
];

// Data mapping:
// composition.map(c => ({
//   sprint: c.sprintName,
//   Ceremony: c.ceremonyHours,
//   Bugs: c.bugHours,
//   Spikes: c.spikeHours,
//   Support: c.supportHours,
// }))
```

### `CurrentSprintItemTables.tsx`

```typescript
interface CurrentSprintItemTablesProps {
  bugItems: OverheadItemViewModel[];
  supportItems: OverheadItemViewModel[];
}
// Renders two labeled sections; closed items use td="line-through" c="dimmed"
// Format: #{adoId} — {title} ({hours}) [{state}]
```

### `OverheadBreakdownPanel.tsx`

```typescript
interface OverheadBreakdownPanelProps {
  composition: OverheadCompositionViewModel[];
  bugItems: OverheadItemViewModel[];
  supportItems: OverheadItemViewModel[];
}
// data-testid="overhead-breakdown-panel"
// Section header: "OVERHEAD BREAKDOWN" (text xs dimmed uppercase)
// Contains: OverheadCompositionChart + CurrentSprintItemTables
```

## Dependencies

| Dependency | Purpose |
|---|---|
| `@mantine/charts` | Already installed — `BarChart` with `type="stacked"` |
| `@mantine/core` | Already installed — Box, Text, Stack |
| `prisma` | Schema migration for new columns |

No new npm packages required.

## Test Coverage Plan

| File | Tests |
|---|---|
| `lib/metrics/calculators.test.ts` | Extend existing `calculateOverhead` tests to assert breakdown fields |
| `lib/metrics/orchestrator.test.ts` | Assert breakdown fields are persisted to MetricSnapshot |
| `app/api/metrics/route.test.ts` | Assert `overheadComposition` on trend sprints and `currentSprintOverheadItems` on workstreams |
| `lib/dashboard/adapter.test.ts` | `mapOverheadComposition`, `mapOverheadItem`, extended view model mapping |
| `components/Dashboard/OverheadCompositionChart.test.tsx` | Render, empty state, series count |
| `components/Dashboard/CurrentSprintItemTables.test.tsx` | Render, closed state, empty states |
| `components/Dashboard/OverheadBreakdownPanel.test.tsx` | Renders children, conditional |
| `components/Dashboard/WorkstreamHealthCard.test.tsx` | Panel presence with overhead fixture data |
