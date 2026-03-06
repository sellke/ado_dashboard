# Story 3: Integrate Shared Sprint Selector into Dashboard

> **Status:** Done
> **Priority:** High
> **Dependencies:** Story 1, Story 2

## User Story

**As a** dashboard user
**I want to** select a sprint once and see all workstream cards update simultaneously
**So that** I can efficiently compare stories across workstreams without repetitive clicking

## Acceptance Criteria

- [ ] `WorkstreamCardsGrid` renders a `SprintTabSelector` above the workstream card grid
- [ ] Selecting a sprint in the shared selector updates all four workstream story lists
- [ ] The default selection is the current sprint (`isCurrent === true`), falling back to the first sprint
- [ ] Each workstream card shows its own stories for the selected sprint (not another workstream's)
- [ ] Per-card tab bars are fully removed — no duplicate sprint selectors
- [ ] Loading and error states for sprint stories still display correctly
- [ ] The sprint selector is hidden when sprint data is not yet loaded

## Implementation Tasks

- [ ] 3.1 Write integration tests: shared selector renders, tab change updates all cards, default is current sprint
- [ ] 3.2 Add `deriveSprintList` utility to extract unified sprint list from `sprintStoriesMap`
- [ ] 3.3 Add `useState<string>` to `WorkstreamCardsGrid` for `activeSprintId`, initialized to current sprint
- [ ] 3.4 Render `SprintTabSelector` in `WorkstreamCardsGrid` above the card grid
- [ ] 3.5 Update `WorkstreamHealthCard` props to accept and forward `activeSprintId`
- [ ] 3.6 Remove backward-compatible uncontrolled Tabs code from `SprintStoryListPanel` (cleanup from Story 1)
- [ ] 3.7 Verify all integration tests pass, no visual regressions

## Notes

- `deriveSprintList` can be a simple helper in `WorkstreamCardsGrid` or extracted to a utility file. Since all workstreams share the same 5-sprint window, extracting from the first non-empty workstream is sufficient.
- The `useState` initial value needs to be computed from sprint data, which arrives asynchronously. Use a `useEffect` to set the default when data first arrives, or compute it during render with a ref to track initialization.
- The sprint selector should only render when `sprintStoriesMap` has data and is not in a loading state.

## Definition of Done

- [ ] All tasks completed
- [ ] All acceptance criteria met
- [ ] Tests passing (unit + integration)
- [ ] Code reviewed
- [ ] No TypeScript errors
- [ ] Per-card tab bars fully removed
