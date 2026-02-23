---
# Story 5: Current Sprint Item Tables Component

> **Status:** Completed ✅
> **Priority:** Medium
> **Dependencies:** Story 3 (types must be defined)

## User Story

**As a** stakeholder reviewing overhead,
**I want** to see a list of bug and support work items with their hours for the current sprint,
**So that** I can identify which specific items are contributing most to overhead.

## Acceptance Criteria

- [x] Given bug items for the current sprint, when the table renders, then each row shows `#adoId — Title (X hrs) [State]` ✅
- [x] Given support items for the current sprint, when the table renders, then the same format is used in a separate "Support" section ✅
- [x] Given a closed bug item (`isClosed: true`), when rendered, then the text is struck through and dimmed ✅
- [x] Given zero bug items, when rendered, then "No bug items" empty state is shown ✅
- [x] Given zero support items, when rendered, then "No support items" empty state is shown ✅
- [x] Given both arrays are empty, when rendered, then both empty states are shown (component still renders, does not return null) ✅

## Implementation Tasks

- [x] 5.1 Write unit tests for `CurrentSprintItemTables` (renders bugs, renders support, handles closed state, handles empty arrays) ✅
- [x] 5.2 Create `components/Dashboard/CurrentSprintItemTables.tsx` accepting `bugItems: OverheadItemViewModel[]` and `supportItems: OverheadItemViewModel[]` ✅
- [x] 5.3 Render "Bugs" section header (`Text size="xs" fw={500}`) followed by bug item list — use `data-testid="bug-items"` ✅
- [x] 5.4 Render "Support" section header followed by support item list — use `data-testid="support-items"` ✅
- [x] 5.5 Per item: render `#{adoId} — {title} ({hours}) [{state}]` with `td="line-through"` and `c="dimmed"` for closed items (consistent with `SprintBugList` styling) ✅
- [x] 5.6 Empty states: "No bug items" / "No support items" as dimmed `Text size="xs"` ✅

## Notes

- Style is intentionally consistent with the existing `SprintBugList` component in Phase 1C
- Unlike `SprintBugList` (which shows items across all rolling sprints), this component shows only the current sprint — no sprint grouping needed
- `OverheadItemViewModel.adoId` is already formatted as `"#12345"` by the adapter — don't prefix again
- Use `Box`, `Text`, `Stack` from Mantine — no table component needed; a list layout is sufficient
- Component always renders (never returns null) — the parent `OverheadBreakdownPanel` decides whether to show the section

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Tests passing (9/9) ✅
- [x] Code reviewed ✅
- [x] Renders correctly with both populated and empty data ✅
