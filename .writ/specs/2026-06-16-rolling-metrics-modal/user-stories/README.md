# Rolling Metrics Detail Modal Stories

> **Spec:** `.writ/specs/2026-06-16-rolling-metrics-modal/spec.md`
> **Status:** Complete

## Story Summary

| Story | Status | Priority | Dependencies | Tasks |
|---|---|---|---|---:|
| [Story 1: Data Contract and Adapter Mapping](story-1-data-contract-and-adapter.md) | Complete | High | None | 7 |
| [Story 2: Reusable Rolling Metric Modal](story-2-reusable-modal-component.md) | Complete | High | Story 1 | 7 |
| [Story 3: Dashboard Tile Wiring and Regression Coverage](story-3-dashboard-wiring-and-tests.md) | Complete | Medium | Story 1, Story 2 | 7 |

## Progress

- Stories complete: 3 / 3
- Tasks complete: 21 / 21
- Overall progress: 100%

## Dependency Notes

Story 1 comes first because the modal should render adapter-backed data, especially for
program-level `Avg Total Delivery/Bug`. Story 2 can then build against a stable display-data shape.
Story 3 wires the component into the dashboard and verifies no unsupported workstream delivery/bug
drilldown appears.

## Quick Start for Implementers

1. Start with Story 1 to establish the data contract and tests.
2. Build the modal in Story 2 using display-ready props.
3. Wire dashboard tiles in Story 3 and run the focused component suite.
