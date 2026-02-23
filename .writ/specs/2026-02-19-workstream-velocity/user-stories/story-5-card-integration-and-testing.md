# Story 5: Card Integration and Testing

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Stories 3, 4 (VelocityTrendChart + SprintBugList components)

## User Story

**As a** stakeholder viewing the dashboard
**I want to** see integrated workstream cards with velocity charts, prediction, and bug listings replacing the old text-based trends
**So that** I get a complete visual picture of each workstream's velocity health and bug load

## Acceptance Criteria

- [x] Given a workstream card, when rendered, then it shows 4 metric tiles in order: Velocity, Velocity Rate, Overhead %, Carry-Over % ✅
- [x] Given a workstream card with trend data, when rendered, then the old text-based sprint trend section is replaced by the VelocityTrendChart component ✅
- [x] Given a workstream card with bug data, when rendered, then the SprintBugList component appears below the velocity chart ✅
- [x] Given a workstream in the current sprint (projected mode), when rendered, then velocity and velocity rate tiles show "(Projected)" suffix ✅
- [x] Given a workstream with no trend data, when rendered, then the chart shows empty state and bug list is hidden ✅
- [x] Given the full dashboard loads, when all workstream cards render, then each card displays its own velocity chart and bug data independently ✅
- [x] Given the card is viewed on mobile (<768px), when rendered, then the chart and bug list stack vertically without overflow ✅

## Implementation Tasks

- [x] 5.1 Write integration tests for WorkstreamHealthCard with the new chart and bug list components ✅
- [x] 5.2 Update WorkstreamHealthCard to render 4 metric tiles (add velocity rate between velocity and overhead %) ✅
- [x] 5.3 Replace the text-based trend section (`trendSprints.map(...)` block) with the VelocityTrendChart component, passing trend data + prediction + rolling average ✅
- [x] 5.4 Add SprintBugList component below the chart, passing trend sprints with bug data ✅
- [x] 5.5 Wire prediction data from `WorkstreamCardViewModel.prediction` to the chart component ✅
- [x] 5.6 Handle edge cases: no prediction available, no trend sprints, card with only metric data ✅
- [x] 5.7 Verify responsive layout: chart and bug list render correctly at all breakpoints (mobile, tablet, desktop) ✅

## Notes

- The existing WorkstreamHealthCard renders metric tiles via `metrics.map()` — the velocity rate tile is added at the adapter level (Story 2), so no tile rendering logic changes needed in the component
- The text-based trend section currently lives in a `{trendSprints.length > 0 && (...)}` conditional block — replace its contents with VelocityTrendChart + SprintBugList
- Rolling average for the reference line can be computed from `trendSprints` raw velocity values or passed from the adapter
- Update `__fixtures__/dashboard-fixtures.ts` if fixtures need velocity rate + prediction + bug data for tests
- Existing WorkstreamHealthCard tests need updating to expect 4 tiles instead of 3

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] All unit and integration tests passing (102/102) ✅
- [x] WorkstreamHealthCard renders correctly with velocity chart + bug list ✅
- [x] No visual regressions in existing card metrics display ✅
- [x] Responsive layout verified at mobile/tablet/desktop breakpoints ✅
