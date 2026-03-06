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

## Implementation Tasks

- [x] 6.1 Create or extend a dedicated metric calculation service/layer for sprint trend and bug metrics. ✅
- [x] 6.2 Add velocity-rate and net-capacity calculation functions with explicit handling for zero or null denominators. ✅
- [x] 6.3 Add sprint-scoped bug metric functions for `activeBugs` and `bugsClosed` using done-like state mapping. ✅
- [x] 6.4 Extend `GET /api/metrics` response contract with additive trend and prediction blocks (no breaking shape changes). ✅
- [x] 6.5 Write unit and route tests for formulas, sprint assignment filtering, and edge cases. ✅
- [x] 6.6 Document formula definitions and payload schema in sub-specs. ✅

## Notes

- Done-like states remain `Closed`, `Done`, and `Resolved`.
- Trend and bug metrics should reuse existing work-item and capacity sources to avoid duplicate logic.

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Tests passing ✅
- [x] Code reviewed ✅
- [x] Documentation updated ✅
