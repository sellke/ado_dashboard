# Story 1: SprintPlanSnapshot Schema and Migration

> **Status:** Complete
> **Priority:** High
> **Dependencies:** None

## User Story

**As a** metric computation system
**I want to** have a database table that records work item assignments per sprint at compute time
**So that** carry-over calculations can reference historical data even after ADO moves items between sprints

## Acceptance Criteria

- [ ] Given a Prisma schema, when the migration runs, then a `sprint_plan_snapshots` table exists with columns: `id`, `sprintId`, `workstreamId`, `adoId`, `storyPoints`, `state`, `type`, `capturedAt`, `createdAt`, `updatedAt`
- [ ] Given the table, when two rows with the same `(sprintId, workstreamId, adoId)` are inserted, then a unique constraint violation occurs
- [ ] Given the table, when a Sprint or Workstream is deleted, then related snapshot rows are cascade-deleted
- [ ] Given the table, when queried by `(sprintId, workstreamId)`, then an index supports efficient lookups

## Implementation Tasks

- [ ] 1.1 Add `SprintPlanSnapshot` model to `prisma/schema.prisma` with fields: `id` (cuid), `sprintId`, `workstreamId`, `adoId` (Int), `storyPoints` (Float?), `state` (String), `type` (String), `capturedAt` (DateTime), `createdAt`, `updatedAt`; unique constraint on `[sprintId, workstreamId, adoId]`; cascade deletes on Sprint and Workstream relations; index on `[sprintId, workstreamId]`; map to `sprint_plan_snapshots`
- [ ] 1.2 Run `pnpm prisma migrate dev --name add-sprint-plan-snapshot` to generate and apply the migration
- [ ] 1.3 Run `pnpm prisma generate` to update the Prisma client
- [ ] 1.4 Add `SprintPlanSnapshotInput` type to `lib/metrics/types.ts` — a minimal shape for calculator functions: `{ storyPoints: number | null; state: string; type: string }`
- [ ] 1.5 Verify the migration applies cleanly and the table exists with correct columns and constraints

## Notes

- The `adoId` field is NOT globally unique here (unlike `WorkItem.adoId`) — it's unique per sprint+workstream combination. The same ADO work item can appear in multiple sprint snapshots if it's reassigned.
- `type` stores the WorkItemType (Story, Bug, Spike, Support) for potential future filtering.
- `capturedAt` records when the snapshot was taken; `createdAt`/`updatedAt` are standard Prisma audit fields.

## Definition of Done

- [ ] All tasks completed
- [ ] All acceptance criteria met
- [ ] Migration applies cleanly on a fresh database
- [ ] Prisma client generates without errors
- [ ] Types exported and importable
