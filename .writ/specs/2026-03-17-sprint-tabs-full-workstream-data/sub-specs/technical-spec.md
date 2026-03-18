# Technical Specification: Sprint Tabs Full Workstream Data

> Created: 2026-03-17
> Spec: `.writ/specs/2026-03-17-sprint-tabs-full-workstream-data/spec.md`

## Architecture Overview

### Data Flow (After Change)

```
MetricSnapshot table
  ↓ (batch query during API response building)
GET /api/metrics response
  → workstreams[].trends.sprints[] now includes:
    - velocityAvg, overheadPercentAvg, carryOverRateAvg (rolling avgs)
    - plannedPoints, completedPoints, carryOverPoints, grossHours (detail)
  ↓
adapter.ts mapTrendSprint()
  → TrendSprintViewModel includes new numeric fields
  ↓
WorkstreamHealthCard
  → finds matching trend sprint by activeSprintId
  → overrides metrics row tiles with rolling avgs from matched sprint
  → overrides detail block with actual values from matched sprint
  ↓
VelocityTrendChart
  → receives activeSprintId
  → highlights matching data point
```

## API Changes

### Enriched Trend Sprint Object

New fields added to each object in `workstreams[].trends.sprints[]`:

| Field | Type | Source | Purpose |
|---|---|---|---|
| `velocityAvg` | `number \| null` | `MetricSnapshot.velocityAvg` | Rolling avg velocity as-of sprint |
| `overheadPercentAvg` | `number \| null` | `MetricSnapshot.overheadPercentAvg` | Rolling avg overhead as-of sprint |
| `carryOverRateAvg` | `number \| null` | `MetricSnapshot.carryOverRateAvg` | Rolling avg carry-over as-of sprint |
| `plannedPoints` | `number \| null` | `MetricSnapshot.plannedPoints` | Detail: planned points |
| `completedPoints` | `number \| null` | `MetricSnapshot.completedPoints` | Detail: completed points |
| `carryOverPoints` | `number \| null` | `MetricSnapshot.carryOverPoints` | Detail: carry-over points |
| `grossHours` | `number \| null` | `MetricSnapshot.grossHours` | Detail: gross hours |

### Query Strategy

Single batch query per workstream:

```typescript
const snapshots = await prisma.metricSnapshot.findMany({
  where: {
    sprintId: { in: rollingSprintIds },
    workstreamId: ws.workstreamId,
  },
  select: {
    sprintId: true,
    velocityAvg: true,
    overheadPercentAvg: true,
    carryOverRateAvg: true,
    plannedPoints: true,
    completedPoints: true,
    carryOverPoints: true,
    grossHours: true,
  },
});
```

Create a Map<sprintId, snapshot> and merge into each trend sprint object. Fields default to null when no snapshot exists.

## Type Changes

### `lib/dashboard/types.ts`

```typescript
// Extend ApiTrendSprint
interface ApiTrendSprint {
  // ... existing fields unchanged ...
  
  // New: per-sprint rolling averages from MetricSnapshot
  velocityAvg?: number | null;
  overheadPercentAvg?: number | null;
  carryOverRateAvg?: number | null;
  
  // New: per-sprint detail from MetricSnapshot
  plannedPoints?: number | null;
  completedPoints?: number | null;
  carryOverPoints?: number | null;
  grossHours?: number | null;
}

// Extend TrendSprintViewModel
interface TrendSprintViewModel {
  // ... existing fields unchanged ...
  
  // New: raw rolling averages (number | null, not formatted)
  velocityAvg: number | null;
  overheadPercentAvg: number | null;
  carryOverRateAvg: number | null;
  
  // New: raw detail values (number | null)
  plannedPoints: number | null;
  completedPoints: number | null;
  carryOverPoints: number | null;
  grossHours: number | null;
}
```

## Component Changes

### WorkstreamHealthCard

```
Props: card, activeSprintId (already received)

Logic:
1. Find matched = card.trendSprints.find(s => s.sprintId === activeSprintId)
2. If matched AND matched !== current sprint:
   a. Override metrics row:
      - "Avg Velocity" → formatMetricValue(matched.velocityAvg, 'pts')
      - "Velocity Rate" → formatVelocityRate(matched.rawVelocityRate)
      - "Overhead %" → formatCarryOverRate(matched.overheadPercentAvg)
      - "Carry-Over %" → formatCarryOverRate(matched.carryOverRateAvg)
      - Hide avg sublabels (rolling avg IS the primary value)
   b. Override detail block:
      - plannedPoints → String(matched.plannedPoints ?? 'N/A')
      - completedPoints → String(matched.completedPoints ?? 'N/A')
      - carryOverPoints → String(matched.carryOverPoints ?? 'N/A')
      - detailSprintLabel → matched.sprintName
3. If no match or current sprint → keep existing behavior unchanged
```

### VelocityTrendChart

```
New prop: activeSprintId?: string

Logic:
- Use Recharts dot customization to render the active sprint's dot 
  with a larger radius (r=6 vs default r=3) or different fill
- Match by comparing data point's sprintId with activeSprintId
```

## Error & Rescue Map

| Operation | What Can Fail | Planned Handling | Test Strategy |
|---|---|---|---|
| MetricSnapshot batch query | DB unavailable | Trend sprints returned without enrichment (existing fields only) | Integration test with empty snapshot result |
| Snapshot missing for sprint | No MetricSnapshot row | All new fields null | Unit test with null snapshot |
| activeSprintId has no matching trend | Sprint ID stale or invalid | Fallback to default behavior | Unit test with mismatched ID |

## Shadow Paths

| Flow | Happy Path | Missing Data | Invalid State |
|---|---|---|---|
| Sprint tab click | Metrics + detail update from trend data | Show N/A for missing fields | Fallback to current sprint behavior |
| Chart highlight | Selected dot highlighted | No matching data point | No highlight shown (chart unchanged) |
| Initial load | Current sprint selected | No snapshots yet | Default metrics/detail shown |

## Interaction Edge Cases

| Edge Case | Planned Handling |
|---|---|
| Rapid tab switching | No debounce needed — data is pre-loaded, extraction is synchronous |
| Tab selection before data loads | activeSprintId set but trendSprints empty — fallback to default |
| Rolling window shorter than 5 sprints | Fewer tabs shown, enrichment still works for available sprints |
| Sprint exists in tab selector but not in trendSprints | Metrics/detail keep default values; only story list updates |

## Files Modified

| File | Change Type | Estimated LOC |
|---|---|---|
| `app/api/metrics/route.ts` | Modified | +30 (snapshot query + merge) |
| `lib/dashboard/types.ts` | Modified | +14 (new fields on 2 interfaces) |
| `lib/dashboard/adapter.ts` | Modified | +10 (pass-through in mapTrendSprint) |
| `components/Dashboard/WorkstreamHealthCard.tsx` | Modified | +40 (extraction logic + overrides) |
| `components/Dashboard/VelocityTrendChart.tsx` | Modified | +15 (activeSprintId prop + dot customization) |

## Testing Strategy

| Layer | Test Type | Coverage |
|---|---|---|
| API enrichment | Integration test | Verify snapshot fields present in response |
| Adapter mapping | Unit test | Verify new fields mapped correctly, null handling |
| WorkstreamHealthCard | Component test | Verify metrics/detail override on sprint change |
| VelocityTrendChart | Component test | Verify highlight renders for active sprint |
| End-to-end | Manual | Click through sprint tabs, verify all sections update |
