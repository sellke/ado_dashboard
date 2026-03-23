# Story 5: Bug Page Dashboard Filter

**Spec:** Dashboard Metrics Audit  
**Story:** 5 of 5

## Title

Bug Page Dashboard Filter

## Context

`BugReportContainer` at `/dashboard/bugs` currently fetches `/api/metrics` with no dashboard filter. This returns all 5 workstreams including Streams. The main dashboard at `/dashboard` filters to 4 workstreams (Action Tracker, Pitch Tracker, KPI Services, UCM) by passing `?dashboard=main`. The bug page should use the same filter.

## User Story

As a dashboard user viewing the bug report, I want bugs filtered to the same 4 workstreams as the main dashboard so that Streams bugs don't appear in the main program's bug report.

## Acceptance Criteria

1. Given the bug page loads, When it fetches metrics, Then it uses `?dashboard=main` to filter workstreams
2. Given the filter is applied, Then Streams workstream bugs do not appear in the bug report table
3. Given no bugs exist for the 4 filtered workstreams, Then the "No bugs found" empty state displays

## Implementation Tasks

- [x] Change fetch URL in `BugReportContainer.tsx` from `/api/metrics` to `/api/metrics?dashboard=main`
- [x] Verify Streams bugs no longer appear in the rendered table
- [x] Update component tests in `__tests__/components/Dashboard/BugReportContainer.test.tsx` if they mock the fetch URL

## Technical Notes

- This is a one-line URL change
- The `/api/metrics` endpoint already supports the `dashboard` query param — it resolves the dashboard config and filters by workstream names
- No API changes needed

## Dependencies

None

## Priority

Low (consistency fix)

## Status

> Status: Complete

## Definition of Done

- [x] Bug page fetches with `?dashboard=main`
- [x] Streams bugs excluded from the report
- [x] Empty state works correctly when no bugs match
- [x] Tests updated if needed
