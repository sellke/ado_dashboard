# Metric Engine — Technical Specification

> Created: 2026-02-11
> Depends on: ADO Data Sync, Database Schema

## Architecture Overview

The metric engine is a server-side computation layer that transforms raw ADO work item data into actionable health metrics. It follows a pipeline pattern: Query → Calculate → Enrich (RAG + rolling) → Persist → Serve.

## Module Dependency Graph

```
app/api/metrics/route.ts ─── reads ──→ MetricSnapshot (DB)
                                            ↑ writes
app/api/metrics/compute/route.ts ──→ orchestrator.ts
                                         │
lib/sync/orchestrator.ts ─── hook ──→ orchestrator.ts
                                         │
                              ┌──────────┼──────────┐
                              ↓          ↓          ↓
                      calculators.ts  rolling.ts  rag.ts
                              │          │          │
                              └──────────┼──────────┘
                                         ↓
                                    snapshot.ts (upsert)
                                         │
                                    aggregator.ts (program-level)
```

## File Responsibilities

| File | Purpose | Pure? |
|---|---|---|
| `lib/metrics/types.ts` | TypeScript interfaces and type definitions | Yes |
| `lib/metrics/calculators.ts` | Core metric formulas (velocity, overhead, predictability, carry-over) | Yes |
| `lib/metrics/rag.ts` | RAG color assignment from ThresholdConfig | Yes (takes thresholds as arg) |
| `lib/metrics/rolling.ts` | Rolling average computation from prior snapshots | Yes |
| `lib/metrics/aggregator.ts` | Program-level weighted aggregation | Yes |
| `lib/metrics/snapshot.ts` | MetricSnapshot upsert (database writes) | No (DB) |
| `lib/metrics/orchestrator.ts` | Coordinates full computation pipeline | No (DB) |
| `app/api/metrics/route.ts` | GET handler — read and format snapshots | No (HTTP + DB) |
| `app/api/metrics/compute/route.ts` | POST handler — trigger computation | No (HTTP + DB) |

## Key Design Decisions

1. **Pure calculators:** All metric functions are pure — they take data as arguments and return results. No database access inside calculators. This makes them trivially testable.

2. **Snapshot persistence:** Results are stored in MetricSnapshot table (not computed on-the-fly for reads). This ensures dashboard reads are fast and metrics are historically auditable.

3. **Post-sync hook:** Metric computation is triggered after sync completion, not on a schedule. This guarantees metrics are always based on the latest data.

4. **Error isolation:** Metric computation failures don't fail the sync. Each workstream is computed independently. Errors are logged but non-fatal.

5. **Program aggregate on-the-fly:** Program-level metrics are computed from per-workstream MetricSnapshot records at read time, not stored. This avoids nullable foreign key complexity and ensures program metrics are always consistent with workstream data.

## Computation Sequence (per workstream)

```
1. workItems = prisma.workItem.findMany({ where: { sprintId, workstreamId } })
2. sprintWs = prisma.sprintWorkstream.findUnique({ where: { sprintId_workstreamId } })
3. velocity = calculateVelocity(workItems)
4. overhead = calculateOverhead(workItems, sprintWs)
5. { predictability, plannedPoints, completedPoints } = calculatePredictability(workItems)
6. { carryOverRate, carryOverItems, carryOverPoints } = calculateCarryOver(workItems)
7. priorSnapshots = prisma.metricSnapshot.findMany({ where: { workstreamId, sprint: { endDate: { lt: currentSprintStart } } }, orderBy: { sprint: { endDate: 'desc' } }, take: 4 })
8. rollingAvgs = calculateRollingAverages(priorSnapshots)
9. thresholds = prisma.thresholdConfig.findMany()
10. ragColors = assignAllRag(metrics, rollingAvgs, thresholds)
11. prisma.metricSnapshot.upsert({ where: { sprintId_workstreamId }, create/update: { ...all fields } })
```

## Error Handling Strategy

- **Missing SprintWorkstream:** overhead% returns null (logged as warning, not error)
- **No WorkItems for sprint+workstream:** All metrics return null or 0 as appropriate
- **Database error during upsert:** Logged, workstream skipped, other workstreams continue
- **ThresholdConfig missing for a metric:** RAG returns null for that metric
- **Division by zero:** Caught in calculators — return null instead of Infinity/NaN

## Testing Strategy

- **Unit tests:** All pure functions in calculators.ts, rag.ts, rolling.ts, aggregator.ts
- **Integration tests:** snapshot.ts and orchestrator.ts with test database
- **API tests:** Route handlers with mocked data
- **Validation test:** Compare computed metrics against 1 known historical sprint
