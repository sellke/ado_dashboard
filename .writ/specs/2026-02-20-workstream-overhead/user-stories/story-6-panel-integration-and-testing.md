---
# Story 6: OverheadBreakdownPanel & Card Integration

> **Status:** Completed ✅
> **Priority:** Medium
> **Dependencies:** Story 4 (OverheadCompositionChart), Story 5 (CurrentSprintItemTables)

## User Story

**As a** stakeholder viewing the dashboard,
**I want** the overhead breakdown to appear inline in each workstream card below the velocity section,
**So that** I can see overhead composition and item detail without navigating away or expanding anything.

## Acceptance Criteria

- [x] Given a workstream card with overhead data, when the dashboard renders, then `OverheadBreakdownPanel` appears below the velocity/bug list section
- [x] Given `OverheadBreakdownPanel`, when it renders, then it shows a section header ("Overhead Breakdown"), the composition chart, and the item tables
- [x] Given a workstream with no composition data and no items, when the panel is conditionally rendered, then it is not shown
- [x] Given the full card renders, when tested end-to-end, then all child components render without errors and match snapshot/fixture data
- [x] Given the `WorkstreamHealthCard` integration test, when overhead data is present, then `data-testid="overhead-breakdown-panel"` is present in the output

## Implementation Tasks

- [x] 6.1 Create `components/Dashboard/OverheadBreakdownPanel.tsx` as an umbrella component accepting `composition: OverheadCompositionViewModel[]`, `bugItems: OverheadItemViewModel[]`, `supportItems: OverheadItemViewModel[]`
- [x] 6.2 Render a divider + "Overhead Breakdown" section header label in the panel (`Text size="xs" c="dimmed" tt="uppercase"`)
- [x] 6.3 Render `OverheadCompositionChart` and `CurrentSprintItemTables` within the panel; add `data-testid="overhead-breakdown-panel"`
- [x] 6.4 Update `components/Dashboard/WorkstreamHealthCard.tsx` to import and conditionally render `OverheadBreakdownPanel` below the existing `SprintBugList` section (show when `card.overheadComposition.length > 0` or items exist)
- [x] 6.5 Write unit tests for `OverheadBreakdownPanel` (renders chart + tables, conditional rendering logic)
- [x] 6.6 Update `WorkstreamHealthCard` integration test (`__tests__/components/Dashboard/WorkstreamHealthCard.test.tsx`) to include overhead fixture data and assert panel presence
- [x] 6.7 Verify full dashboard integration test passes with overhead data in fixtures

## Notes

- Conditional render logic in `WorkstreamHealthCard`: `if (card.overheadComposition.length > 0 || card.currentSprintBugItems.length > 0 || card.currentSprintSupportItems.length > 0)`
- The panel is always visible (no collapsible) — placement is below the velocity chart and sprint bug list sections
- The panel follows the existing section divider pattern in `WorkstreamHealthCard` (Stack + borderTop)
- Keep `OverheadBreakdownPanel` purely presentational — it just composes the two sub-components

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing (unit + integration)
- [x] Code reviewed
- [x] Full dashboard renders without errors with overhead data
