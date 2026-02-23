# Story 7: Trend and Bug Metrics UI Integration

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Story 2, Story 3, Story 4, Story 6

## User Story

**As a** product and engineering lead  
**I want to** see sprint trends and bug movement directly in dashboard views  
**So that** I can assess delivery trajectory and quality signals quickly

## Acceptance Criteria

- [x] Given trend data is available, when the Program Summary renders, then Sprint 1-4 velocity, velocity rate, active bugs, and bugs closed are visible. ✅
- [x] Given prediction data is available, when Program Summary renders, then Sprint 5 predicted velocity is shown with clear predicted labeling. ✅
- [x] Given trend data is available for a workstream, when its card renders, then per-sprint values for velocity, velocity rate, active bugs, and bugs closed are visible and readable. ✅
- [x] Given trend fields are partially null, when sections render, then `N/A` placeholders are shown without layout breakage. ✅
- [x] Given existing sync and state handling is used, when dashboard transitions states, then trend UI remains consistent with loading/empty/error/sync feedback behavior. ✅

## Implementation Tasks

- [x] 7.1 Extend dashboard UI types and adapter mappings for trend and bug metric series. ✅
- [x] 7.2 Update `ProgramSummarySection` to render Sprint 1-4 trend rows and Sprint 5 predicted velocity. ✅
- [x] 7.3 Update `WorkstreamHealthCard` to render per-sprint velocity, velocity rate, active bugs, and bugs closed. ✅
- [x] 7.4 Add/refresh component tests for full trend, partial trend, and missing trend states. ✅
- [x] 7.5 Add/refresh Storybook stories for trend-rich and partial-data snapshots. ✅
- [x] 7.6 Validate visual density and legibility at stakeholder demo viewport sizes. ✅

## Notes

- Keep trend display compact and export-friendly.
- Preserve existing metric tiles and RAG visual language while introducing trend rows.

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Tests passing (100%) ✅
- [x] Code reviewed ✅
- [x] Documentation updated ✅
