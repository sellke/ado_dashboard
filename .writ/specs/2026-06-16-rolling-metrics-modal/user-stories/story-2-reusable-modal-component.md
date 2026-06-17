# Story 2: Reusable Rolling Metric Modal

> **Status:** Complete
> **Priority:** High
> **Dependencies:** Story 1

## User Story

As a dashboard user, I want a clear modal showing the sprint-by-sprint details behind a metric, so
that I can understand the average without leaving the dashboard.

## Acceptance Criteria

1. **Given** modal-ready rows exist, **when** a supported metric opens the modal, **then** the modal
   shows the metric title, scope, summary value, rolling window label, and sprint rows.
2. **Given** there are no trend rows, **when** the modal opens, **then** it shows an explanatory
   empty state instead of a blank table.
3. **Given** one or more row values are null, **when** the modal renders, **then** those cells show
   `N/A` without hiding available rows.
4. **Given** a keyboard user opens and closes the modal, **when** focus moves through the modal,
   **then** Mantine modal focus management and close behavior work as expected.

## Implementation Tasks

- [x] Create `components/Dashboard/RollingMetricDetailModal.tsx`.
- [x] Define props around display-ready modal data rather than raw API response objects.
- [x] Render summary value, metric definition context, rolling window label, and sprint rows.
- [x] Add empty, partial-history, and null-value states.
- [x] Use a responsive layout that works for desktop tables and narrow modal widths.
- [x] Add React Testing Library tests for populated, empty, null, and keyboard close paths.
- [x] Confirmed no Storybook story was required for the local dashboard component pattern.

## Technical Notes

- Follow Mantine `Modal` usage in `CycleTimeBreakdown` and dashboard panels.
- Prefer `size="lg"` or `size="xl"` based on row density.
- Reuse `MetricDefinitionHint` where practical, but do not require hover-only content for the modal
  to be understandable.

## Context for Agents

- See `spec.md` -> `### Modal Content`.
- See `spec.md` -> `### State Catalog`.
- See `mockups/current/README.md` for current UI pattern references.

## Definition of Done

- [x] Modal component renders independently from program/workstream wiring.
- [x] Empty and null states are covered.
- [x] Keyboard and close behavior are covered.
- [x] The component does not perform metric calculations.
