# Story 1: Enrich API Trend Sprints with MetricSnapshot Data

> **Status:** Complete
> **Priority:** High
> **Dependencies:** None

## User Story

**As a** dashboard consumer (frontend)
**I want** each trend sprint in the API response to include rolling averages and detail values from MetricSnapshot
**So that** the UI can display per-sprint metrics without making additional API calls

## Acceptance Criteria

- [x] Given a workstream with 5 trend sprints, when the API response is returned, then each sprint object includes `velocityAvg`, `overheadPercentAvg`, `carryOverRateAvg` from its MetricSnapshot
- [x] Given a workstream with 5 trend sprints, when the API response is returned, then each sprint object includes `plannedPoints`, `completedPoints`, `carryOverPoints`, `grossHours` from its MetricSnapshot
- [x] Given a sprint with no MetricSnapshot record, when included in trends, then all new fields are null (not omitted)
- [x] Given the existing API contract, when enrichment is added, then all existing fields remain unchanged and backward compatible

## Implementation Tasks

- [x] 1.1 Write integration tests verifying enriched trend sprint fields from MetricSnapshot
- [x] 1.2 Query MetricSnapshot records for all sprints in the rolling window (batch query by sprintId + workstreamId)
- [x] 1.3 Merge snapshot fields into each trend sprint object in the API response builder
- [x] 1.4 Handle null/missing snapshots gracefully (all new fields default to null)
- [x] 1.5 Verify existing API tests still pass (backward compatibility)

## Notes

- The MetricSnapshot table uses a unique constraint on `[sprintId, workstreamId]`, so the batch query should be efficient
- Only add fields that the UI needs — velocityAvg, overheadPercentAvg, carryOverRateAvg (rolling avgs) and plannedPoints, completedPoints, carryOverPoints, grossHours (detail values)
- Do NOT add predictability-related fields (not displayed in the UI)
- The query should be a single Prisma `findMany` with a `where: { sprintId: { in: [...] }, workstreamId }` to avoid N+1

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Code reviewed
- [x] Existing API tests unbroken
