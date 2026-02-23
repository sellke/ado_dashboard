# Story 1: Dashboard Data Contract and Shell

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** None

## User Story

**As a** program stakeholder  
**I want to** open a dashboard shell that fetches sprint metrics reliably  
**So that** I can view current program health without manual data assembly

## Acceptance Criteria

- [x] Given the dashboard page loads, when `GET /api/metrics` succeeds, then summary and workstream sections receive normalized data from a shared adapter. ✅
- [x] Given the API response includes null fields, when data is mapped, then null-safe values are preserved and no runtime error occurs. ✅
- [x] Given a request is in flight, when the shell renders, then loading placeholders are shown for summary and cards. ✅
- [x] Given the request fails, when the shell renders, then an error state with retry action is displayed. ✅

## Implementation Tasks

- [x] 1.1 Write tests for the dashboard data adapter and shell state transitions (loading, success, error, empty). ✅
- [x] 1.2 Create a dashboard data adapter module that maps `GET /api/metrics` response to UI-friendly view models. ✅
- [x] 1.3 Implement a dashboard shell container that coordinates fetch lifecycle and passes mapped props to child sections. ✅
- [x] 1.4 Add retry behavior and non-blocking error handling in the shell container. ✅
- [x] 1.5 Verify shell behavior with mocked API payloads representing null and mixed-RAG metric values. ✅

## Notes

- Keep adapter logic isolated to avoid metric transformations leaking into presentational components.
- Use existing app routing and server/client boundaries already present in the project.
- Follow-on sync-trigger UX is defined in Story 5 and should reuse this shell's fetch lifecycle hooks.

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Tests passing (100% — 23 new tests, 387 total) ✅
- [x] Code reviewed ✅
- [x] Documentation updated ✅
