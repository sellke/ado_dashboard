# Story 2: Testing Status Group — UI & Test Updates

> **Status:** Complete
> **Priority:** High
> **Dependencies:** Story 1

## User Story

**As a** dashboard viewer
**I want to** see User Stories in `Testing` state rendered in their own labeled section with a distinct color between Active and Resolved
**So that** I can quickly identify work in QA without confusing it with active development or resolved items

## Acceptance Criteria

- [x] Given sprint data containing Testing stories, when the Sprint Stories panel renders, then a "Testing" section appears between Active and Resolved
- [x] Given the Testing section, when rendered, then section header and count badge use Mantine color `cyan`
- [x] Given story row badges, when a story has `statusGroup: 'Testing'`, then the story points badge uses `cyan`
- [x] Given the adapter processes mixed status groups, when statusGroups are built, then order is Planned → Active → Testing → Resolved → Completed
- [x] Given a sprint with no Testing stories, when the panel renders, then no Testing section is shown
- [x] Given bug trend and burndown tests, when the full test suite runs, then no regressions in bug Testing-as-closed behavior

## Implementation Tasks

- [x] 2.1 Write component test for Testing section rendering and color in `SprintStoryListPanel.test.tsx`
- [x] 2.2 Add `Testing: 'cyan'` to `STATUS_COLOR` in `components/Dashboard/SprintStoryListPanel.tsx`
- [x] 2.3 Update adapter ordering test in `__tests__/lib/dashboard/sprint-stories-adapter.test.ts` to include Testing in correct position
- [x] 2.4 Update panel status-group-order test (if present) to include Testing between Active and Resolved
- [x] 2.5 Run full related test suite plus bug trend regression tests
- [x] 2.6 Verify acceptance criteria are met

## Notes

- `STATUS_COLOR` is typed as `Record<StatusGroup, string>` — Story 1's type extension will cause a compile error until this story adds the Testing entry
- Color choice `cyan` is intentional: distinct from Active (`blue`), Resolved (`yellow`), Completed (`green`), and avoids RYG status semantics per design system
- `WorkstreamCardsGrid.test.tsx` uses generic status group factories — likely no changes needed unless compile errors surface

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Code reviewed
- [x] Bug metrics regression tests unchanged

## Context for Agents

- **Error map rows:** [Panel render, Adapter group ordering] — technical-spec.md → Error & Rescue Map
- **Shadow paths:** [View sprint with Testing stories, Empty Testing group hidden] — technical-spec.md → Shadow Paths
- **Business rules:** [Empty groups hidden, Lifecycle ordering] — spec.md → Business Rules
- **Experience:** [Testing section between Active and Resolved, cyan badges, empty Testing hidden] — spec.md → Experience Design → Visual Treatment
