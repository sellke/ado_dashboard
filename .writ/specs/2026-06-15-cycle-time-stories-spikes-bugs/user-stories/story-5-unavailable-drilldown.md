# Story 5: Drill Into Unavailable Cycle-Time Items

> **Status:** Completed ✅
> **Priority:** Medium
> **Dependencies:** Stories 3 and 4

## User Story

As a dashboard user, I want to click an unavailable cycle-time count and see the linked ADO items missing lifecycle data so that I can identify which stories, spikes, or bugs need data cleanup.

## Acceptance Criteria

- Given a cycle-time unavailable count is greater than zero, when the dashboard renders, then the unavailable badge is visibly interactive.
- Given the user opens an unavailable badge for User Stories, Spikes, or Bugs, when the drilldown loads, then a modal lists the affected ADO items for that type and scope.
- Given the unavailable badge is opened at program level, when the modal loads, then it includes unavailable items across the currently selected dashboard/workstream scope.
- Given the unavailable badge is opened for a workstream card, when the modal loads, then it includes only unavailable items for that workstream and type.
- Given an unavailable item appears in the modal, when the user views the row, then the ADO ID is linked to the corresponding ADO work item and the title is visible.
- Given the drilldown API fails or returns no items, when the modal renders, then it follows existing dashboard loading, empty, and error patterns.
- Given the modal item count is shown, when compared with the badge count, then the list count matches the aggregate unavailable count for the same type, window, and scope.

## Implementation Tasks

- [x] 🆕 Add a focused read endpoint for unavailable cycle-time items that reuses the configured cycle-time window and dashboard/workstream scope semantics.
- [x] 🆕 Return minimal item details: ADO ID, ADO link, title, type, and workstream context needed for program-level lists.
- [x] 🆕 Add API tests for program scope, workstream scope, type filtering, window matching, empty results, and unavailable-count parity.
- [x] 🆕 Extend dashboard view models or component props so unavailable badges can request the correct type and scope.
- [x] 🆕 Add a modal/list component for linked unavailable items using existing Mantine dashboard patterns.
- [x] 🆕 Make unavailable badges interactive only when the unavailable count is greater than zero.
- [x] 🆕 Add component tests for opening the modal, loading/error/empty states, ADO links, and all three cycle-time types.

## Technical Notes

- Prefer a lazy-loaded endpoint over embedding item lists in `GET /api/metrics`; the main metrics payload should stay aggregate-focused.
- The endpoint must match the same cycle-time window used by the aggregate badge count. Do not introduce a separate date interpretation.
- The endpoint should accept enough context to distinguish program-level and workstream-level drilldowns, plus the clicked work item type.
- ADO links should be built from existing configured org/project/work item ID data. Do not expose PATs or credential material.
- Keep the definition of unavailable unchanged: items in the cycle-time input scope with missing or invalid lifecycle dates.

## Definition of Done

- [x] Unavailable badges open a modal for User Stories, Spikes, and Bugs.
- [x] Modal rows show linked ADO IDs and titles.
- [x] Program and workstream drilldowns match their corresponding aggregate badge counts.
- [x] Lazy-load, empty, and error states are tested.
- [x] Existing cycle-time aggregate behavior remains unchanged.

## Context for Agents

- See `spec.md` -> `### API` and `### Dashboard UI`.
- Relevant files: `app/api/metrics/route.ts`, a new focused API route, `components/Dashboard/CycleTimeBreakdown.tsx`, `components/Dashboard/ProgramSummarySection.tsx`, `components/Dashboard/WorkstreamHealthCard.tsx`, `lib/dashboard/types.ts`, and related tests.
- Preserve completed Stories 1-4 unless a direct mismatch is found while implementing this drilldown.
