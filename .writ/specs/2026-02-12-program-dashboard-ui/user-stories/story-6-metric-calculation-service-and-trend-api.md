# Story 6: Metric Calculation Service and Trend API

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Story 1

## User Story

**As a** dashboard stakeholder  
**I want to** trust sprint-trend and bug metrics as backend-computed values  
**So that** UI decisions are based on consistent and auditable formulas

## Acceptance Criteria

- [x] Given the trend metric service runs, when Sprint 1-4 values are computed, then velocity, velocity rate, active bugs, and bugs closed are returned per sprint and per workstream. ✅
- [x] Given velocity rate is computed, when net capacity hours are available, then `velocityRate = doneLikeStoryPoints / netCapacityHours` is applied consistently. ✅
- [x] Given net capacity is computed, when work types are processed, then total hours minus overhead, bug hours, spike hours, and support hours is used with existing derivation rules. ✅
- [x] Given Sprint 5 prediction is requested, when current sprint net capacity exists, then predicted velocity is returned as `average velocity rate × current sprint net capacity hours`. ✅
- [x] Given bug counts are computed, when bugs are not assigned to the target sprint, then they are excluded from both active and closed counts. ✅
- [x] Given bug counts are computed, when a bug is in `New` or `Active` state and assigned to the sprint, then it is counted as an active bug. ✅
- [x] Given bug counts are computed, when a bug is in `Resolved`, `Testing`, or `Closed` state with `changedDate` within the sprint window, then it is counted as a closed bug. ✅
- [x] Given a bug is in a state outside both open (`New|Active`) and resolved (`Resolved|Testing|Closed`) sets, then it is excluded from both counts. ✅

## Implementation Tasks

- [x] 6.1 Create or extend a dedicated metric calculation service/layer for sprint trend and bug metrics. ✅
- [x] 6.2 Add velocity-rate and net-capacity calculation functions with explicit handling for zero or null denominators. ✅
- [x] 6.3 Add sprint-scoped bug metric functions for `activeBugs` and `bugsClosed` using done-like state mapping. ✅ (Still valid)
- [x] 6.3a Replace done-like state mapping with explicit `BUG_OPEN_STATES = ['New', 'Active']` and `BUG_RESOLVED_STATES = ['Resolved', 'Testing', 'Closed']`. Change `activeBugs` from catch-all remainder to explicit filter on open states. Keep `changedDate` within-sprint constraint for resolved bugs. ✅
- [x] 6.4 Extend `GET /api/metrics` response contract with additive trend and prediction blocks (no breaking shape changes). ✅
- [x] 6.5 Write unit and route tests for formulas, sprint assignment filtering, and edge cases. ✅ (Still valid)
- [x] 6.5a Update trend-service unit tests: verify `Testing` state counts as resolved; verify bugs outside both state sets are excluded from both counts; verify `New`/`Active` are explicitly matched for open bucket. ✅
- [x] 6.6 Document formula definitions and payload schema in sub-specs. ✅

## Notes

- Bug state classification uses explicit sets: open = `New|Active`, resolved = `Resolved|Testing|Closed`.
- `Done` state does not apply to bugs in this ADO configuration and is excluded from bug classification.
- Trend and bug metrics should reuse existing work-item and capacity sources to avoid duplicate logic.
- The `changedDate` within-sprint constraint is preserved for the resolved bucket.

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Tests passing ✅
- [x] Code reviewed ✅
- [x] Documentation updated ✅
