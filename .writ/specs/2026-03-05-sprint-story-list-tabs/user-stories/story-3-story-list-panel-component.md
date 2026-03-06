# Story 3: Sprint Story List Panel Component

> **Status:** Complete
> **Priority:** High
> **Dependencies:** Story 2 (view model types)

## User Story

**As a** dashboard viewer
**I want to** see a tabbed panel showing stories grouped by status for each sprint
**So that** I can quickly understand what work is planned, in progress, and completed

## Acceptance Criteria

- [x] Mantine Tabs render one tab per sprint (up to 5)
- [x] Current sprint tab is selected by default
- [x] Stories are visually grouped by status section (Planned, Active, Resolved, Completed)
- [x] Each status section has a colored header matching its status
- [x] Story rows display title, assignee, story points, and state
- [x] Clicking a story row opens the ADO work item in a new tab
- [x] Empty sprint shows "No user stories in this sprint" message
- [x] Empty status groups are not rendered
- [x] Component handles loading state (optional skeleton)
- [x] Accessible: tabs use proper ARIA roles, links have descriptive labels

## Implementation Tasks

- [x] 3.1 Write component tests (tab rendering, default tab, story rows, ADO links, empty states, status grouping)
- [x] 3.2 Build SprintStoryListPanel with Mantine Tabs skeleton
- [x] 3.3 Implement status-grouped story list within each tab panel
- [x] 3.4 Add story row rendering with title, assignee, points, state badge
- [x] 3.5 Wire ADO deep links on row click (opens new tab)
- [x] 3.6 Add empty state handling (no stories, hidden empty groups)
- [x] 3.7 Verify all acceptance criteria against test results

## Notes

- Use Mantine `Tabs` component for sprint selection
- Status section colors: Planned=gray, Active=blue, Resolved=yellow, Completed=green (align with Mantine color tokens)
- Story rows should be compact — this panel sits inside a workstream card that already has a lot of content
- Consider collapsible status sections if the list gets long

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Code reviewed
- [x] Component renders correctly in Storybook (optional)
