# Story 4: Sprint Bug List Component

> **Status:** Completed ✅
> **Priority:** Medium
> **Dependencies:** Story 2 (types and adapter)

## User Story

**As a** stakeholder viewing workstream health
**I want to** see which bugs were pulled into each sprint with closed bugs visually distinguished
**So that** I can understand bug load per sprint and track closure progress

## Acceptance Criteria

- [x] Given a sprint with 3 bugs (1 closed, 2 open), when the bug list renders, then the closed bug appears with strikethrough text and the 2 open bugs appear in normal text ✅
- [x] Given a bug item, when rendered, then it shows the ADO ID as "#12345" prefix followed by the bug title ✅
- [x] Given a sprint with zero bugs, when the bug list renders, then "No bugs" is displayed for that sprint ✅
- [x] Given 4 sprints in the trend window, when the component renders, then bugs are grouped under sprint name headers ✅
- [x] Given the component is within a workstream card, when rendered, then it doesn't visually overwhelm the card (compact styling) ✅

## Implementation Tasks

- [x] 4.1 Write component tests for SprintBugList: renders bugs grouped by sprint, strikethrough for closed, empty state per sprint, empty state for all sprints ✅
- [x] 4.2 Create `components/Dashboard/SprintBugList.tsx` with props interface accepting trend sprints with bug data ✅
- [x] 4.3 Render sprint groupings with sprint name as section header (Text size="xs", fw={500}) ✅
- [x] 4.4 Render individual bugs: "#adoId — title" with `text-decoration: line-through` and dimmed color for closed bugs ✅
- [x] 4.5 Handle edge cases: no sprints, sprints with no bugs, very long bug titles (text truncation with ellipsis) ✅

## Notes

- Closed bug detection: `isClosed` boolean is pre-computed by the adapter (Story 2) using DONE_STATES check
- ADO ID formatting: `#${adoId}` — adoId is stored as string in the view model
- Styling: use Mantine `Text` component with `td="line-through"` prop for closed bugs and `c="dimmed"` for visual de-emphasis
- Keep the list compact: `size="xs"` for all text, minimal gap between items
- If a workstream has many bugs per sprint, consider max-height with overflow scroll (but unlikely in practice — typically 0-5 bugs per sprint)

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Component tests passing ✅
- [x] Strikethrough styling verified for closed bugs ✅
