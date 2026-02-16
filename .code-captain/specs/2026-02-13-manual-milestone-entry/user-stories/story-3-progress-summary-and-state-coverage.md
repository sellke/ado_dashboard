# Story 3: Progress Summary and State Coverage

> **Status:** Completed ✅
> **Priority:** Medium
> **Dependencies:** Story 1, Story 2

## User Story

**As a** Scrum Master / Program Lead
**I want to** see a progress summary with counts and completion percent derived from milestone statuses
**So that** I can quickly assess overall program milestone health without manual counting, while all UI and API states remain robust and regression-free.

## Acceptance Criteria

- [x] Given milestones exist with mixed statuses, when the milestone section renders, then summary counts (NotStarted, InProgress, Done) and completion percent (`done / total * 100`) are displayed ✅
- [x] Given zero milestones, when the section renders, then the summary shows zero counts and 0% completion without errors ✅
- [x] Given invalid or edge-case API inputs (invalid status, missing required fields, empty workstream), when requests are made, then appropriate 4xx responses and validation messages are returned ✅
- [x] Given Storybook runs the milestone panel stories, then all states (populated, empty, loading, error, mixed-status) are documented and viewable ✅
- [x] Given the full test suite runs, when no changes to existing dashboard logic are made, then all prior dashboard tests continue to pass ✅

## Implementation Tasks

- [x] 3.1 Write UI tests for milestone progress summary in `__tests__/components/Dashboard/MilestoneProgressSummary.test.tsx` — verify counts and percent for mixed statuses, empty list, and single-status scenarios ✅
- [x] 3.2 Write API edge-case tests in `__tests__/app/api/milestones/route.test.ts` and `__tests__/app/api/milestones/[id]/route.test.ts` — invalid status enum, missing required fields, non-existent workstreamId, malformed targetMonth; assert correct status codes and error payloads ✅
- [x] 3.3 Add Storybook stories for milestone panel states in `components/Dashboard/MilestonePanel.story.tsx` — PopulatedMixedStatus, PopulatedAllDone, Empty, Loading, Error; ensure state coverage for progress summary in each ✅
- [x] 3.4 Implement `MilestoneProgressSummary` component — derive counts from milestone list, compute `done / total * 100`, render counts and percent; integrate into `MilestonePanel` ✅
- [x] 3.5 Run full test suite (`pnpm test`) and verify no regressions — all existing dashboard and milestone tests pass ✅
- [x] 3.6 Manually verify dashboard renders correctly with milestone section in all states (Storybook and dev) ✅

## Notes

### Technical Considerations
- MVP progress tracking is status-only (NotStarted / InProgress / Done); no percentage field in schema.
- Summary counts and completion percent are derived in the UI from the `status` field of each milestone.
- Zero-division: when `total === 0`, display `0%` and handle gracefully.
- Follow existing dashboard state-coverage patterns from `story-4-dashboard-state-coverage-and-storybook` (2026-02-12).

### API Edge Cases
- Invalid `status` value (e.g. `"Invalid"`) → 400 with validation message
- Missing `title`, `workstreamId`, or `targetMonth` on POST → 400
- Non-existent `workstreamId` → 404 or 400 with "Workstream not found"
- Malformed `targetMonth` (non-ISO, invalid date) → 400

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] UI tests passing for progress summary ✅
- [x] API edge-case tests passing ✅
- [x] Storybook stories cover all milestone panel states ✅
- [x] No regressions in existing dashboard tests ✅
- [x] Code reviewed ✅
- [x] Documentation updated ✅
