# Story 1: Testing Status Group — Mapping & API Layer

> **Status:** Complete
> **Priority:** High
> **Dependencies:** None

## User Story

**As a** dashboard viewer
**I want to** User Stories in ADO `Testing` state included in sprint story API responses under a dedicated `Testing` status group
**So that** QA-stage work is no longer invisible in sprint metrics

## Acceptance Criteria

- [x] Given a User Story in ADO `Testing` state, when the sprint stories API is called, then the story is returned with `statusGroup: 'Testing'`
- [x] Given `STATUS_GROUP_ORDER`, when inspected, then order is Planned → Active → Testing → Resolved → Completed
- [x] Given a story in `Removed` or unknown state, when mapped, then `mapStateToStatusGroup` returns `null` (unchanged)
- [x] Given existing ADO states (New, Approved, Committed, Active, Resolved, Closed), when mapped, then group assignments are unchanged
- [x] Given bug-related code paths using `BUG_RESOLVED_STATES`, when tests run, then Testing bugs still count as closed (no changes to metrics types)

## Implementation Tasks

- [x] 1.1 Write unit tests in `__tests__/lib/sprints/status-mapping.test.ts` for Testing mapping and STATUS_GROUP_ORDER
- [x] 1.2 Extend `StatusGroup` type, `STATUS_MAP`, and `STATUS_GROUP_ORDER` in `lib/sprints/status-mapping.ts`
- [x] 1.3 Add Testing work item to `maps all ADO states to correct status groups` test in `__tests__/app/api/sprints/stories/route.test.ts`
- [x] 1.4 Verify TypeScript compiles — any `Record<StatusGroup, ...>` maps will flag missing Testing entries
- [x] 1.5 Run status-mapping and sprint stories API tests
- [x] 1.6 Verify acceptance criteria are met

## Notes

- `app/api/sprints/stories/route.ts` filters via `mapStateToStatusGroup()` — no route logic changes expected once mapping is updated
- `app/api/milestones/route.ts` also imports the mapper but is **out of scope** — Testing will map to `'Testing'` but milestone filters only check Active/Resolved/Completed, so behavior stays the same
- This story does not touch UI — Story 2 handles panel colors and remaining test updates

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Code reviewed
- [x] No changes to bug metrics modules

## Context for Agents

- **Error map rows:** [Map ADO state to group] — technical-spec.md → Error & Rescue Map
- **Shadow paths:** [API fetch stories] — technical-spec.md → Shadow Paths
- **Business rules:** [User Story scope only, Lifecycle ordering, Excluded states unchanged] — spec.md → Business Rules
- **Experience:** [Happy path — Testing stories in API response] — spec.md → Experience Design → Happy Path
