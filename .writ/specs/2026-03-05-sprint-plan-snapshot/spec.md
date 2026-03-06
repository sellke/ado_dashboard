# Sprint Plan Snapshot Specification

> Created: 2026-03-05
> Status: Complete
> Contract Locked: ✅

## Contract Summary

**Deliverable:** Sprint Plan Snapshot system that captures work item assignments during each sync cycle, enabling accurate carry-over % calculation for completed sprints even after ADO reassigns incomplete items to the next sprint.

**Must Include:** Automatic snapshot capture during the existing sync pipeline — no separate scheduler, no manual intervention.

**Hardest Constraint:** The snapshot must be captured *before* ADO moves items post-sprint-close, meaning it relies on the last sync during the active sprint being the definitive record.

**Success Criteria:**

- Completed sprints show accurate planned SP (including items that later moved away)
- Carry-over % = (points that moved away) / (original planned SP) × 100
- Carry-over items count is removed from the detail section
- No changes needed to the sync schedule or manual user actions

**Scope Boundaries:**

- **Included:** New `SprintPlanSnapshot` table, snapshot capture in sync pipeline, updated carry-over calculator, updated API route detail section, updated adapter/UI
- **Excluded:** Real-time mid-sprint carry-over tracking, historical backfill of past sprints, changes to how ADO moves items, any new scheduler or cron infrastructure

## Background

### The Problem

The dashboard workstream cards show carry-over metrics that don't match reality:

1. **Completed stories stay** in the sprint where they were completed — their `sprintId` remains unchanged
2. **Incomplete stories get moved** to the next sprint in ADO — the sync reassigns their `sprintId`
3. After a sprint closes, `WorkItem` rows only contain items that completed there — carried-over items have already moved

This means `calculateCarryOver()` sees 0 carry-over for completed sprints (all remaining items are Done), and inflated ~100% carry-over for in-progress sprints (most items aren't Done yet).

### The Solution

Capture a snapshot of all work items assigned to each sprint during every sync cycle. The snapshot updates throughout the sprint's lifetime. After the sprint ends, it's never overwritten — the last captured state becomes the definitive "end of sprint" record.

The carry-over calculator then uses snapshot data for completed sprints:

- **Planned SP** = sum of all snapshot rows' story points
- **Completed SP** = snapshot rows in Done/Closed/Resolved states
- **Carry-over SP** = planned − completed
- **Carry-over %** = carry-over SP / planned SP × 100

## Detailed Requirements

### 1. SprintPlanSnapshot Table

A new Prisma model that records the set of work items assigned to a sprint at compute time:

- Keyed by `(sprintId, workstreamId, adoId)` — one row per work item per sprint per workstream
- Stores `storyPoints`, `state`, and `type` at capture time
- Updated (upserted) on every metric compute for the current sprint only
- Never updated for completed sprints — the last snapshot is the definitive record

### 2. Snapshot Capture in Metric Computation

Inside `computeWorkstreamMetrics()` (`lib/metrics/snapshot.ts`), after fetching work items:

- If the sprint is the current sprint (`isCurrentSprint`), upsert snapshot rows
- If the sprint is completed, skip snapshot writes (preserve historical state)
- Snapshot capture is non-fatal — errors don't block metric computation

### 3. Updated Carry-Over Calculation

`calculateCarryOver()` (`lib/metrics/calculators.ts`) needs a new mode:

- **Current behavior (for current sprint):** Calculate from live `WorkItem` rows (unchanged)
- **New behavior (for completed sprints):** Calculate from `SprintPlanSnapshot` rows
- The orchestrator/snapshot module chooses which data source to pass based on `isCurrentSprint`

### 4. API Route Changes

In `app/api/metrics/route.ts`:

- For completed sprints in the prior-detail path, use snapshot-based carry-over data
- Remove `carryOverItems` from the detail response (keep `carryOverPoints` and add snapshot-based `carryOverRate`)
- The bug fix from today (pulling carry-over rate from prior sprint) integrates naturally — the prior sprint now has accurate snapshot-based data

### 5. Adapter and UI Changes

- Remove `carryOverItems` from the detail view model in `lib/dashboard/types.ts`
- Update `lib/dashboard/adapter.ts` to stop formatting `carryOverItems`
- Update `WorkstreamHealthCard.tsx` to remove the "X items" display, keeping "X pts" and the carry-over % metric tile

## Implementation Approach

### No New Scheduler

The snapshot piggybacks on the existing sync → compute pipeline:

1. User clicks "Sync Now" or sync runs
2. `runSync()` fetches latest data from ADO
3. `computeAllMetrics()` runs for each sprint in the rolling window
4. During compute, `computeWorkstreamMetrics()` captures the snapshot for the current sprint
5. After the sprint ends, the snapshot is frozen — never overwritten

### Risk Mitigation

- **Stale snapshot:** If no sync runs between the last day of a sprint and when ADO moves items, the snapshot may not reflect final state. Mitigation: syncs run frequently during active sprints, and the last sync captures the most recent state.
- **Large table:** One row per work item per sprint per workstream. With ~4 workstreams, ~5 rolling sprints, and ~20-40 items per workstream, this is ~400-800 rows max in the rolling window. Negligible.
- **Migration:** Adding a new table is non-destructive. No existing data is modified.

## Files Affected

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `SprintPlanSnapshot` model |
| `lib/metrics/snapshot.ts` | Add snapshot capture logic |
| `lib/metrics/calculators.ts` | Update `calculateCarryOver` to accept snapshot data |
| `lib/metrics/types.ts` | Add `SprintPlanSnapshotInput` type |
| `app/api/metrics/route.ts` | Query snapshot for completed sprint detail, remove `carryOverItems` |
| `lib/dashboard/types.ts` | Remove `carryOverItems` from detail types |
| `lib/dashboard/adapter.ts` | Stop mapping `carryOverItems` |
| `components/Dashboard/WorkstreamHealthCard.tsx` | Remove carry-over items display |
