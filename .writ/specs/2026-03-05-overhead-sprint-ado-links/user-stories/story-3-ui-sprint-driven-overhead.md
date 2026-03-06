# Story 3: UI Components — Sprint-Driven Overhead Display with ADO Links

> **Status:** Complete
> **Priority:** High
> **Dependencies:** Story 2

## User Story

**As a** program dashboard user
**I want** the overhead items section to show bugs, spikes, and support for whichever sprint I select, with each item linking to its ADO work item
**So that** I can quickly review overhead work items across sprints and navigate directly to ADO for details

## Acceptance Criteria

- [x] Given the shared SprintTabSelector is set to Sprint 3, when I look at the Overhead section, then I see bugs, spikes, and support items for Sprint 3 (not the current sprint)
- [x] Given an overhead item is displayed, when I click on it, then a new browser tab opens to the ADO work item page
- [x] Given a sprint has no spike items, when the Spikes section renders, then it shows "No spike items" placeholder text
- [x] Given a closed bug item, when it renders, then it still shows line-through styling and dimmed color, plus it is a clickable link
- [x] Given the overhead section has data for any sprint, when `hasOverheadData` is evaluated, then the section renders (updated check uses new data shape)

## Implementation Tasks

- [x] 3.1 Update `components/Dashboard/WorkstreamHealthCard.tsx` — change the props passed to `OverheadBreakdownPanel`: replace `bugItems={currentSprintBugItems}` and `supportItems={currentSprintSupportItems}` with `overheadItemsBySprint={card.overheadItemsBySprint}` and `activeSprintId={activeSprintId}`. Update the `hasOverheadData` check to use the new `overheadItemsBySprint` array (e.g., check if any sprint has non-empty bug/spike/support arrays).
- [x] 3.2 Update `components/Dashboard/OverheadBreakdownPanel.tsx` — change props from `bugItems` / `supportItems` to `overheadItemsBySprint: OverheadSprintViewModel[]` and `activeSprintId: string`. Find the selected sprint: `const selected = overheadItemsBySprint.find(s => s.sprintId === activeSprintId)`. Pass `selected.bugs`, `selected.spikes`, `selected.support` to `CurrentSprintItemTables`.
- [x] 3.3 Update `components/Dashboard/CurrentSprintItemTables.tsx` — add `spikeItems: OverheadItemViewModel[]` prop. Render three sections: Bugs, Spikes, Support. In the `ItemList` sub-component, replace the `Text` element with Mantine `Anchor` — `<Anchor href={item.adoUrl} target="_blank" rel="noopener noreferrer">` wrapping the existing text content. Preserve `line-through` / `dimmed` styling for closed items and `truncate` / `size="xs"`.
- [x] 3.4 Update `__tests__/components/Dashboard/WorkstreamHealthCard.test.tsx` — update mock data to use `overheadItemsBySprint` instead of `currentSprintBugItems` / `currentSprintSupportItems`
- [x] 3.5 Update `__tests__/components/Dashboard/OverheadBreakdownPanel.test.tsx` — test sprint selection (pass multiple sprints, verify correct items render for `activeSprintId`), test fallback when sprint not found
- [x] 3.6 Update `__tests__/components/Dashboard/CurrentSprintItemTables.test.tsx` — test 3-section layout (Bugs, Spikes, Support), test clickable ADO links (`Anchor` elements with correct `href`), test empty states per category, test closed-item styling
- [x] 3.7 Run all component tests: `pnpm jest __tests__/components/Dashboard/OverheadBreakdownPanel.test.tsx __tests__/components/Dashboard/CurrentSprintItemTables.test.tsx __tests__/components/Dashboard/WorkstreamHealthCard.test.tsx`

## Notes

- The `activeSprintId` is already available in `WorkstreamHealthCard` props (passed from `WorkstreamCardsGrid` via the shared `SprintTabSelector`)
- Pattern to follow: `SprintStoryListPanel` receives `sprints[]` and `activeSprintId`, finds selected sprint via `.find(s => s.id === activeSprintId)`, renders content or "No stories" fallback
- Mantine `Anchor` component pattern from `SprintStoryListPanel`: `<Anchor href={story.adoUrl} target="_blank" size="xs" truncate>`
- Import `Anchor` from `@mantine/core`
- Spike items render between Bugs and Support sections (display order: Bugs, Spikes, Support)

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Visual verification: overhead items update when sprint tab changes
- [x] Links open correctly in new tab
- [x] Empty states display correctly
