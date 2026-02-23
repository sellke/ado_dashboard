# Story 4: Capacity Sync, Resilience, and Validation

> **Status:** Completed
> **Priority:** Medium
> **Dependencies:** Story 1, Story 2, Story 3

## User Story

**As a** Scrum Master / operator
**I want to** have capacity auto-populated from ADO with resilient behavior and clear validation
**So that** sprint workstream capacity reflects ADO data while preserving manual overrides, and failures in one workstream do not block others

## Acceptance Criteria

- [x] Given ADO team capacity is available, when capacity sync runs, then team capacity is fetched and aggregated into `SprintWorkstream` fields (`grossHours` minimum; `ptoHours`, `ceremonyHours`, `fteCount` as applicable)
- [x] Given a `SprintWorkstream` has `capacityLocked = true`, when capacity sync runs, then that workstream's capacity fields are not overwritten
- [x] Given one workstream fails during capacity fetch (e.g., ADO timeout), when sync runs, then other workstreams continue processing and complete successfully
- [x] Given sync completes (success or partial), when SyncLog is written, then it captures retries, failures, and aggregate counts (e.g., workstreams succeeded/failed, retry attempts)

## Implementation Tasks

- [x] 4.1 Write unit tests for capacity aggregation logic and manual-override preservation (skip/call with mock data)
- [x] 4.2 Create `lib/sync/capacity.ts` with per-workstream capacity fetch and aggregation into `SprintWorkstream` fields
- [x] 4.3 Implement `capacityLocked` guard: skip upsert of capacity fields when `capacityLocked` is true for a `SprintWorkstream`
- [x] 4.4 Add per-workstream isolation: wrap each workstream's capacity fetch in try/catch; log failure and continue with others
- [x] 4.5 Integrate retry logic (from ADO client) for transient failures; record retry count and final outcome per workstream
- [x] 4.6 Extend SyncLog updates to include capacity-specific summary (workstreams succeeded/failed, retries, aggregate counts)
- [x] 4.7 Verification: run full sync with capacity; confirm manual overrides preserved and partial failures isolated

## Notes

- ADO `getTeamCapacity` returns activities with `capacityPerDay`; aggregate across activities to derive `grossHours` (and optionally `ptoHours`, `ceremonyHours`)
- `capacityLocked` is the authoritative flag for manual override—never overwrite when true
- Per-workstream isolation aligns with spec: "Failure in one workstream doesn't abort others"
- SyncLog may need additional fields or JSON blob for capacity-specific audit (retries, per-workstream status) if not covered by existing `errorMessage` and counts

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing (89 tests, 100% pass rate)
- [x] Code reviewed (review agent passed)
- [x] Documentation updated (capacity sync behavior, override rules)
