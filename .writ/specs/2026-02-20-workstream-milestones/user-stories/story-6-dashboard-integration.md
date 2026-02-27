# Story 6: Dashboard Integration

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Story 5

## User Story

**As a** dashboard user
**I want** the workstream section to show the new ADO-driven milestone goals panel (and no longer show the manual milestone table)
**So that** monthly goal progress is automatically kept current from ADO without manual updates

## Acceptance Criteria

- [ ] Given the dashboard loads, when `WorkstreamHealthCard` renders, then `MilestoneGoalsPanel` appears (not the old `MilestonePanel`)
- [ ] Given the dashboard page, when it fetches data, then it calls the updated `GET /api/milestones` and passes the `programRollup` to `ProgramSummarySection`
- [ ] Given `DashboardContainer`, when it receives the API response, then it passes `milestoneGroups` through to each `WorkstreamCardViewModel` via the adapter
- [ ] Given `MilestonePanel` and `MilestoneFormModal`, when the dashboard renders, then neither component is imported or rendered (they remain in the codebase but are unused)
- [ ] Given the full page render, when viewed in the browser, then the milestones section shows correct ADO-sourced goal data

## Implementation Tasks

- [x] 6.1 Write an integration test: dashboard render with milestone data flows through to `MilestoneGoalsPanel` (mock API response)
- [x] 6.2 Update `app/dashboard/page.tsx`: add `GET /api/milestones` fetch alongside existing metrics fetch; pass response to `DashboardContainer`
- [x] 6.3 Update `components/Dashboard/DashboardContainer.tsx`: accept `milestonesData` prop (new `ApiMilestonesResponse` type); pass it to adapter and to `WorkstreamHealthCard`
- [x] 6.4 Update `components/Dashboard/WorkstreamHealthCard.tsx`: replace `<MilestonePanel>` with `<MilestoneGoalsPanel milestoneGroups={card.milestoneGroups} />`
- [x] 6.5 Update `ProgramSummarySection` (or its data feed): pass `programRollup` from milestones API response to the program summary component (wires into 1B deliverable)
- [x] 6.6 Verify full end-to-end render: dashboard loads, milestones section shows correct data, no console errors, no TypeScript errors

## Notes

- The existing `MilestonePanel`, `MilestoneFormModal`, `MilestoneStatusBadge`, `MilestoneProgressSummary` components are NOT deleted — they're simply no longer imported in the main dashboard flow (kept for potential reuse or admin views)
- `DashboardContainer` currently accepts `ApiResponse` from `lib/dashboard/types.ts` — extend to also accept `milestonesData: ApiMilestonesResponse | null`
- `app/dashboard/page.tsx` should fetch milestones in parallel with metrics using `Promise.all`
- Loading and error states: milestones API failure should show error in `MilestoneGoalsPanel` but not block the rest of the dashboard
- The `programRollup` integration with `ProgramSummarySection` is a stub in this story — just ensure the data is plumbed through (full 1B integration handled in Phase 1B spec)

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing (767/767)
- [x] Code reviewed
- [x] Documentation updated
