# Story 3: Dashboard Tile Wiring and Regression Coverage

> **Status:** Complete
> **Priority:** Medium
> **Dependencies:** Story 1, Story 2

## User Story

As a dashboard user, I want supported metric tiles to reveal their rolling details directly from
the dashboard, so that I can investigate a metric without hunting through charts or code.

## Acceptance Criteria

1. **Given** the program summary renders supported metrics, **when** the user activates one, **then**
   the rolling metric modal opens with the correct program scope and metric data.
2. **Given** a workstream card renders velocity rate, overhead %, or carry-over %, **when** the user
   activates one, **then** the modal opens with that workstream's rolling metric data.
3. **Given** the workstream `Delivery/Bug` tile renders, **when** the user views the tile, **then** it
   does not show a drilldown affordance.
4. **Given** metric definition hints and RAG badges are present, **when** tile drilldown is added,
   **then** those existing controls remain accessible and usable.
5. **Given** existing dashboard tests run, **when** this feature is added, **then** current metric
   rendering and sprint tab behavior do not regress.

## Implementation Tasks

- [x] Add modal state and open/close handlers to `ProgramSummarySection`.
- [x] Add modal state and open/close handlers to `WorkstreamHealthCard`.
- [x] Add an accessible trigger or affordance for supported metric tiles/rows.
- [x] Ensure unsupported metrics remain visually static.
- [x] Preserve existing `MetricDefinitionHint` and `RagBadge` behavior.
- [x] Add component tests for program and workstream open paths.
- [x] Add regression tests for workstream `Delivery/Bug` exclusion and tooltip/RAG coexistence.

## Technical Notes

- Current program metrics are cards; current workstream metrics are compact rows. The affordance may
  need slightly different styling at each scope while using the same data model.
- Avoid making the whole row/card a nested interactive element if tooltip controls sit inside it.
- Existing selected-sprint overrides in `WorkstreamHealthCard` should keep working.

## Context for Agents

- See `spec.md` -> `### Accessibility and Interaction`.
- See `spec-lite.md` -> `For Review Agents` -> `Scope Guard`.
- Relevant tests likely live under `__tests__/components/Dashboard/`.

## Definition of Done

- [x] Supported tiles open the modal at both relevant scopes.
- [x] Program `Avg Total Delivery/Bug` opens the modal.
- [x] Workstream `Delivery/Bug` remains excluded.
- [x] Existing tooltips and badges still work.
- [x] Focused component tests pass.
