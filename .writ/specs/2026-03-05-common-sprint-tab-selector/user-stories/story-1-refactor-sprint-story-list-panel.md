# Story 1: Refactor SprintStoryListPanel to Controlled Mode

> **Status:** Done
> **Priority:** High
> **Dependencies:** None

## User Story

**As a** developer
**I want to** refactor SprintStoryListPanel to accept a controlled `activeSprintId` prop
**So that** a parent component can drive which sprint's stories are displayed

## Acceptance Criteria

- [ ] SprintStoryListPanel accepts an `activeSprintId: string` prop
- [ ] When `activeSprintId` is provided, the component renders only that sprint's stories (no tab bar)
- [ ] When no matching sprint is found for the given ID, an empty/fallback state is shown
- [ ] Status group sections (Planned, Active, Resolved, Completed) still render correctly for the selected sprint
- [ ] Story rows still link to ADO and show all fields (title, assignee, points, state)

## Implementation Tasks

- [ ] 1.1 Update tests for SprintStoryListPanel to cover controlled `activeSprintId` prop behavior
- [ ] 1.2 Add `activeSprintId: string` to SprintStoryListPanel props interface
- [ ] 1.3 Remove internal Mantine Tabs wrapper (`Tabs`, `Tabs.List`, `Tabs.Tab`, `Tabs.Panel`) when `activeSprintId` is provided
- [ ] 1.4 Filter `sprints` array to find the sprint matching `activeSprintId` and render its `statusGroups`
- [ ] 1.5 Handle edge case: no matching sprint found (render empty state or message)
- [ ] 1.6 Verify all existing tests pass and new controlled-mode tests pass

## Notes

- The loading and error states should still work as before (they're independent of tab selection).
- The internal `StatusSection` and `StoryRow` sub-components don't need changes — they render from `StatusGroupViewModel` data.
- Keep the component's existing uncontrolled behavior working as a fallback if `activeSprintId` is not provided (backward compatibility during migration). This can be removed in Story 3.

## Definition of Done

- [ ] All tasks completed
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed
- [ ] No TypeScript errors
