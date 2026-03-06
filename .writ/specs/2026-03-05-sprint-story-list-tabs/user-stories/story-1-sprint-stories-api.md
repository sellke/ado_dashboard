# Story 1: Sprint Stories API Endpoint

> **Status:** Complete
> **Priority:** High
> **Dependencies:** None

## User Story

**As a** dashboard viewer
**I want to** fetch User Stories grouped by sprint and status for a given workstream
**So that** the frontend can display a sprint-level story breakdown

## Acceptance Criteria

- [x] GET /api/sprints/stories?workstreamId={id} returns stories grouped by sprint
- [x] Only UserStory type work items are included
- [x] Stories are grouped into 4 status buckets (Planned, Active, Resolved, Completed)
- [x] Removed/unknown states are excluded from response
- [x] Sprints are ordered most recent first
- [x] Current sprint is flagged with isCurrent: true
- [x] Returns empty sprints array when workstreamId has no data
- [x] Returns 400 when workstreamId is missing

## Implementation Tasks

- [x] 1.1 Write API route tests (happy path, filtering, status mapping, error cases, empty states)
- [x] 1.2 Create status mapping utility (ADO state → display group)
- [x] 1.3 Implement GET /api/sprints/stories route with Prisma query
- [x] 1.4 Add rolling 5-sprint window filtering (reuse or adapt from trend-service)
- [x] 1.5 Add current sprint detection logic
- [x] 1.6 Verify all acceptance criteria against test results

## Notes

- Reuse the rolling sprint window approach from `lib/metrics/trend-service.ts` rather than reimplementing
- Status mapping should be a standalone utility for reuse in the adapter layer
- Consider creating a shared `lib/sprints/status-mapping.ts` module

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Code reviewed
- [x] API response shape documented
