# Program Dashboard UI Specification (Lite)

> Source: `spec.md`
> Purpose: Compact AI context
> Created: 2026-02-12
> Last Updated: 2026-02-16
> Contract Locked: Yes

## Core Objective

Deliver a Mantine dashboard that shows program-level and workstream-level health, plus sprint trends (4 actual sprints and Sprint 5 velocity prediction), using backend-computed metrics from `GET /api/metrics`.

## Must-Have UI

- Program summary section with sprint metadata and 4 core metrics
- Trend display for Sprint 1-4:
  - velocity
  - velocity rate
  - active bugs
  - bugs closed
- Sprint 5 predicted velocity (predicted label required)
- Four workstream health cards with sprint-scoped trend values
- Single `Sync Now` action that triggers full ADO refresh on click
- Automatic metrics refetch after sync completion
- Loading, empty, error, and null-value handling

## Locked Metric Rules

- `velocityRate = doneLikeStoryPoints / netCapacityHours`
- `netCapacityHours = totalHours - overhead - bugHours - spikeHours - supportHours`
- Sprint 5 prediction: `avg(velocityRate) * currentSprintNetCapacityHours`
- Bug counts are sprint-scoped and require sprint assignment:
  - closed: `Closed|Done|Resolved`
  - active: non-done-like states

## Data Contract

- Source endpoint: `GET /api/metrics` (extended payload blocks for trend and bug series)
- Trigger endpoint: `POST /api/sync/ado` (full sync only for dashboard action)
- Existing response fields stay compatible; new trend fields are additive
- Null-safe rendering required for all metric fields

## Story Breakdown

1. Dashboard data contract and shell (baseline complete)
2. Program summary section (baseline complete)
3. Workstream health cards (baseline complete)
4. State coverage, Storybook, and tests (baseline complete)
5. Dashboard sync trigger and automatic refresh (baseline complete)
6. Metric calculation service/layer + trend API extensions (new)
7. Trend and bug metrics UI integration (new)

## Quality Gates

- Unit tests for velocity-rate, net-capacity, bug counts, and Sprint 5 prediction logic
- API tests for additive trend payload contract
- Component/integration tests for full, partial, and missing trend states
- Storybook stories for trend-rich and partial-data scenarios
