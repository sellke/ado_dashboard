# Story 2: Create SprintTabSelector Component

> **Status:** Done
> **Priority:** High
> **Dependencies:** None (can run parallel to Story 1)

## User Story

**As a** dashboard user
**I want to** see a single sprint selector above the workstream cards
**So that** I can switch the sprint view for all workstreams with one click

## Acceptance Criteria

- [ ] A new `SprintTabSelector` component exists at `components/Dashboard/SprintTabSelector.tsx`
- [ ] It renders Mantine Tabs with one tab per sprint, using `variant="outline"`
- [ ] Each tab shows the sprint name and a badge with the total story count
- [ ] The current sprint tab has visual distinction (e.g., "(current)" label or different badge color)
- [ ] The component is fully controlled via `activeSprintId` and `onSprintChange` props
- [ ] Loading and empty states are handled gracefully (no sprints = no selector rendered)

## Implementation Tasks

- [ ] 2.1 Write tests for SprintTabSelector covering rendering, selection, badges, current sprint indicator, and empty state
- [ ] 2.2 Create `SprintTabSelector` component with props: `sprints`, `activeSprintId`, `onSprintChange`
- [ ] 2.3 Render Mantine `Tabs` with controlled `value`/`onChange`, `variant="outline"`
- [ ] 2.4 Add story-count `Badge` to each tab and mark the current sprint
- [ ] 2.5 Handle edge cases: empty sprint list, loading state, single sprint
- [ ] 2.6 Verify all tests pass and component renders correctly in isolation

## Notes

- This component is purely presentational + controlled. No data fetching or internal state.
- The sprint list will be derived by the parent (`WorkstreamCardsGrid`) from `sprintStoriesMap`.
- Badge styling should match the existing pattern in `SprintStoryListPanel` (small, rounded, muted color).
- Consider adding a Storybook story for this component (optional, not blocking).

## Definition of Done

- [ ] All tasks completed
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed
- [ ] No TypeScript errors
