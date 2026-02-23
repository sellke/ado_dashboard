# Story 3: Work Item Ingestion and Type Mapping

> **Status:** Completed
> **Priority:** High
> **Dependencies:** Story 1, Story 2

## User Story

**As a** Scrum Master / operator
**I want to** sync approved ADO work item types into local storage
**So that** dashboard and metric calculations are based on complete and correctly typed workstream data

## Acceptance Criteria

- [x] Given ADO returns work items for selected sprints and workstreams, when sync runs, then only approved types are persisted (`Feature`, `User Story`, `Bug`, `Spike`, `Support`)
- [x] Given synced work items include area and iteration paths, when records are written, then each item is linked to the correct local workstream and sprint
- [x] Given a work item with existing `adoId` already exists, when sync runs again without revision changes, then no duplicate record is created
- [x] Given a work item revision changes in ADO, when sync runs, then the local record is updated with latest mutable fields
- [x] Given unsupported work item types are returned, when sync runs, then they are skipped and counted in sync diagnostics

## Implementation Tasks

- [x] 3.1 Write unit tests for type mapping, workstream resolution by area path, and upsert idempotency by `adoId`
- [x] 3.2 Implement approved-type filter and mapping (`Feature`, `User Story`, `Bug`, `Spike`, `Support` -> Prisma enum)
- [x] 3.3 Implement work item fetch for rolling 5 sprints per workstream using iteration-aware queries
- [x] 3.4 Implement `WorkItem` upsert by `adoId` with revision-aware update checks
- [x] 3.5 Implement workstream/sprint linkage resolution from ADO `System.AreaPath` and `System.IterationPath`
- [x] 3.6 Add sync counters for fetched/created/updated/skipped items and pass to run summary + `SyncLog`
- [x] 3.7 Verify with at least one known sprint that persisted items and type distribution match ADO source data

## Notes

- Use local `Workstream.adoAreaPath` values as authoritative matching anchors.
- Use ADO iteration path as canonical for sprint mapping (not seed display names).
- Skip and log unsupported item types instead of failing the whole workstream.
- Preserve text and identity fields (`assignedTo`, tags, dates) needed by downstream analytics.

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing (51 unit + integration tests, 72 total across sync suite)
- [x] Code reviewed
- [x] Documentation updated

## Implementation Summary

### Files Created

- `lib/sync/mappers.ts` - ADO to Prisma type mapping, field extraction, approved-type filter
- `lib/sync/work-items.ts` - WIQL query builder, upsert logic, workstream/sprint resolution, sync orchestration per workstream
- `__tests__/lib/sync/work-items.test.ts` - 51 tests covering mappers, resolution, upsert, and full sync flow

### Files Modified

- `lib/sync/ado-client.ts` - Added `fetchWorkItemIdsByWiql()` and `fetchWorkItemsBatch()` with batching (200 IDs/request)
- `lib/sync/types.ts` - Added `itemsSkipped` to `WorkstreamSyncResult` and `PerWorkstreamSummary`
- `lib/sync/orchestrator.ts` - Replaced stub with real work item sync, added sprint context passing and WorkItems-only DB lookup
