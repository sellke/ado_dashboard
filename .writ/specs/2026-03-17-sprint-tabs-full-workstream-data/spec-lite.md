# Sprint Tabs Full Workstream Data — Spec Lite

> For AI context windows. See `spec.md` for full details.

## What

Make all workstream card sections respond to sprint tab selection. Currently only story list and overhead items update; metrics row, detail block, and velocity chart ignore `activeSprintId`.

## Key Decisions

- **Data strategy:** Enrich existing API `trends.sprints` with MetricSnapshot fields (no new endpoints, no refetch)
- **Metrics row:** Shows rolling averages as-of selected sprint (Avg Velocity, Overhead %, Carry-Over %)
- **Velocity Rate:** Shows actual value for selected sprint (no rolling avg for this metric)
- **Detail block:** Shows selected sprint's actual planned/completed/carry-over points
- **Velocity chart:** Highlights selected sprint with visual indicator (larger dot)
- **Default:** Current sprint on load (unchanged)

## API Enrichment

Add to each `trends.sprints[]` object from `MetricSnapshot`:
- `velocityAvg`, `overheadPercentAvg`, `carryOverRateAvg` (rolling averages as-of sprint)
- `plannedPoints`, `completedPoints`, `carryOverPoints`, `grossHours` (detail values)

## Component Changes

| Component | Change |
|---|---|
| `app/api/metrics/route.ts` | Enrich trend sprints with MetricSnapshot fields |
| `lib/dashboard/types.ts` | Extend `ApiTrendSprint`, `TrendSprintViewModel` |
| `lib/dashboard/adapter.ts` | Map new trend sprint fields |
| `WorkstreamHealthCard` | Extract metrics/detail from matching trend sprint by `activeSprintId` |
| `VelocityTrendChart` | Accept `activeSprintId`, highlight selected sprint |

## Data Flow

```
GET /api/metrics → enriched trends.sprints[] (includes snapshot data)
→ adapter → enriched TrendSprintViewModel[]
→ WorkstreamHealthCard finds matching sprint by activeSprintId
→ Metrics row: rolling avgs from matched sprint
→ Detail block: actual values from matched sprint
→ VelocityTrendChart: highlight selected sprint dot
```

## Stories

1. **API enrichment** — add MetricSnapshot fields to trend sprints
2. **Types + adapter** — extend types, map new fields
3. **Metrics row scoping** — WorkstreamHealthCard extracts metrics from active sprint
4. **Detail block scoping** — detail values from active sprint
5. **Velocity chart highlight** — VelocityTrendChart highlights selected sprint

## Out of Scope

New API endpoints, refetch on tab change, predictability metric, global state.
