# Story 1: Data Contract and Adapter Mapping

> **Status:** Complete
> **Priority:** High
> **Dependencies:** None

## User Story

As a dashboard user, I want rolling metric drilldowns to use trustworthy dashboard data, so that
the modal values match the tiles and trend window instead of recalculating differently in the UI.

## Acceptance Criteria

1. **Given** the metrics API returns trend sprints, **when** the adapter builds the dashboard view
   model, **then** supported metrics have modal-ready sprint rows with formatted and raw values.
2. **Given** program metrics include `Avg Total Delivery/Bug`, **when** modal data is prepared,
   **then** program-level delivery-to-bug rows have an explicit source and use existing zero-bug
   semantics.
3. **Given** a workstream has a `Delivery/Bug` tile, **when** modal data is prepared, **then** no
   delivery-to-bug drilldown is generated for that workstream tile.
4. **Given** a metric value is missing, **when** it is mapped for the modal, **then** the display
   value is `N/A` and the raw value remains null.

## Implementation Tasks

- [x] Add or extend dashboard types for modal-ready rolling metric rows and metric identifiers.
- [x] Extend `ApiTrendSprint` and `TrendSprintViewModel` only as needed for program delivery-to-bug.
- [x] Map velocity rate, overhead %, carry-over %, and program delivery-to-bug rows in
      `lib/dashboard/adapter.ts`.
- [x] Add additive metrics API/service fields if program delivery-to-bug rows are not already
      available in the response.
- [x] Preserve existing tile shapes and formatting helpers.
- [x] Add adapter/API tests for modal row mapping, null handling, and program-only delivery-to-bug.
- [x] Run focused test coverage for dashboard adapter and metrics route changes.

## Technical Notes

- Do not put metric math in React components.
- Use existing formatting helpers where possible: `formatVelocityRate`, `formatPercent`, and
  delivery-to-bug display behavior.
- Program delivery-to-bug should follow the completed
  `.writ/specs/2026-06-04-delivery-to-bug-ratio-metric/spec.md` rules.

## Context for Agents

- See `spec.md` -> `## Detailed Requirements` -> `### Supported Metrics`.
- See `spec.md` -> `## Implementation Approach`.
- Relevant files: `lib/dashboard/types.ts`, `lib/dashboard/adapter.ts`, `app/api/metrics/route.ts`,
  and metric trend service files if API additions are required.

## Definition of Done

- [x] Modal-ready data is available without component-side recalculation.
- [x] Program delivery-to-bug drilldown data is explicit.
- [x] Workstream delivery-to-bug remains excluded.
- [x] Tests cover happy, null, and program-only paths.
