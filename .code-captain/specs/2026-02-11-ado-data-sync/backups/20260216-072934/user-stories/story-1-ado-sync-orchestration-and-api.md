# Story 1: ADO Sync Orchestration and API Trigger

> **Status:** Done
> **Priority:** High
> **Dependencies:** None

## User Story

**As a** Scrum Master / operator
**I want to** trigger and monitor sync manually via an API endpoint
**So that** I can refresh rolling 5-sprint ADO data on demand and inspect run status and per-workstream summaries

## Contract Context

- **Manual API trigger** – No cron/scheduled runs; operator initiates sync via POST
- **Rolling 5-sprint sync scope** – Current sprint + 4 prior sprints
- **Moderate resilience** – Per-workstream isolation; one failure does not abort others
- **SyncLog lifecycle** – Record created at start, updated on completion with status and counts

## Acceptance Criteria

- [x] Given the API is available, when I POST to the sync endpoint, then sync runs and returns a summary (success, syncLogId, run status)
- [x] Given any sync run, when it starts, then a SyncLog record is created with status `Running`
- [x] Given a sync run completes (success or partial failure), when it finishes, then the SyncLog is updated with final status, counts, and any error summary
- [x] Given a sync run, when I inspect the response or SyncLog, then I can see per-workstream execution summary (fetched/created/updated counts per workstream)
- [x] Given a workstream fails during sync, when the error is handled, then the run continues for remaining workstreams and does not crash the entire process

## Implementation Tasks

- [x] 1.1 Add integration/API tests for sync endpoint: POST triggers run, returns summary shape, SyncLog created
- [x] 1.2 Create SyncLog model (if not present) or ensure schema supports status, startedAt, completedAt, itemsFetched, itemsCreated, itemsUpdated, errorMessage, perWorkstreamSummary
- [x] 1.3 Implement lib/sync/orchestrator.ts that creates SyncLog at start, invokes sync phases (iterations/work items/capacity stubs), updates SyncLog on completion
- [x] 1.4 Implement POST /api/sync/ado route: validate request, call orchestrator, return { success, syncLogId, summary }
- [x] 1.5 Add per-workstream try/catch isolation: wrap each workstream sync in its own try/catch, aggregate results, continue on failure
- [x] 1.6 Implement per-workstream execution summary structure and persist to SyncLog (JSON or structured fields)
- [x] 1.7 Verify: run sync via API, confirm SyncLog lifecycle, partial-failure scenario (mock one workstream failure), check summary includes per-workstream details

## Notes

- API route: POST /api/sync/ado (optional body: `{ syncType?: "Full" | "WorkItems" | "Iterations" | "Capacity" }`)
- Response shape: `{ success: boolean, syncLogId: string, summary: { status, workstreams: [...], totals: {...} } }`
- Sync phases (iterations, work items, capacity) may be stubbed in Story 1; full implementation in Stories 2–4
- Per-workstream summary: at minimum { workstreamId, status, itemsFetched, itemsCreated, itemsUpdated, error? }

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Code reviewed
- [x] Documentation updated (API contract, SyncLog schema)
