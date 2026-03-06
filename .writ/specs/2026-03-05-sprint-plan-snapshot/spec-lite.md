# Sprint Plan Snapshot — Condensed Spec

> For AI context windows. See `spec.md` for full details.

## What

Capture work item assignments per sprint during each sync cycle so carry-over % is accurate for completed sprints, even after ADO moves incomplete items to the next sprint.

## Why

After a sprint closes, ADO moves incomplete items to the next sprint. The `WorkItem.sprintId` changes, so the old sprint only contains completed items. This makes carry-over appear as 0% for every completed sprint.

## Key Design Decisions

1. **New `SprintPlanSnapshot` table** — `(sprintId, workstreamId, adoId)` unique key, stores `storyPoints`, `state`, `type` at capture time
2. **Capture during metric compute** — in `computeWorkstreamMetrics()`, upsert snapshot rows when `isCurrentSprint` is true; skip for completed sprints
3. **Carry-over from snapshot** — for completed sprints, `calculateCarryOver` uses snapshot rows instead of live `WorkItem` rows
4. **Remove carry-over items count** — only show carry-over points and carry-over % in the UI
5. **No scheduler** — piggybacks on existing sync → compute pipeline

## Carry-Over Formula (Completed Sprints)

```
plannedSP     = SUM(snapshot.storyPoints)
completedSP   = SUM(snapshot.storyPoints) WHERE state IN ('Closed','Done','Resolved')
carryOverSP   = plannedSP - completedSP
carryOverRate = carryOverSP / plannedSP × 100
```

## Stories

1. **Schema + migration** — `SprintPlanSnapshot` model, Prisma migration
2. **Snapshot capture** — write snapshot rows in `computeWorkstreamMetrics()` for current sprint
3. **Calculator + API** — use snapshot data for completed sprint carry-over, update API route
4. **Adapter + UI** — remove `carryOverItems`, update detail display

## Files Touched

- `prisma/schema.prisma`, `lib/metrics/snapshot.ts`, `lib/metrics/calculators.ts`, `lib/metrics/types.ts`
- `app/api/metrics/route.ts`, `lib/dashboard/types.ts`, `lib/dashboard/adapter.ts`
- `components/Dashboard/WorkstreamHealthCard.tsx`
