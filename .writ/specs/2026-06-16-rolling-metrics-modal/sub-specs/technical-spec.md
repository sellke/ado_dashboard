# Technical Spec: Rolling Metrics Detail Modal

> **Parent Spec:** `.writ/specs/2026-06-16-rolling-metrics-modal/spec.md`
> **Stories:** Story 1, Story 2, Story 3

## Overview

This feature adds a reusable dashboard modal for explaining rolling metrics. The modal should use
dashboard view-model data, not component-side metric math. The only expected data gap is
program-level per-sprint delivery-to-bug data for `Avg Total Delivery/Bug`.

## Architecture

```text
GET /api/metrics
  -> lib/metrics/* builds trend data
  -> lib/dashboard/adapter.ts maps display-ready modal rows
  -> ProgramSummarySection / WorkstreamHealthCard pass selected metric data
  -> RollingMetricDetailModal renders summary + sprint rows
```

## Data Model

Add a small display-data shape to `lib/dashboard/types.ts`. Names can vary, but the model should
carry this information:

- Metric identifier and display label.
- Scope label and scope type (`program` or `workstream`).
- Summary value displayed on the tile.
- Optional RAG status and tooltip text source.
- Rolling window label.
- Sprint rows with sprint id/name, display value, raw value, and optional rolling average display.

For existing metrics:

- Velocity rate can use `rawVelocityRate` and/or `velocityAvg` depending on whether the row needs
  actual sprint value, rolling average, or both.
- Overhead % can use `rawOverheadPercent` and `overheadPercentAvg`.
- Carry-over % can use `rawCarryOverRate` and `carryOverRateAvg`.

For program `Avg Total Delivery/Bug`:

- Add API and view-model fields for per-sprint delivery-to-bug ratio if absent.
- Preserve existing aggregate display and RAG semantics from the completed delivery-to-bug spec.
- Do not create workstream delivery-to-bug modal data in v1.

## Component Design

### `RollingMetricDetailModal`

Expected responsibilities:

- Render a Mantine `Modal`.
- Render title, scope label, summary value, rolling window label, and metric definition context.
- Render sprint rows using display-ready values.
- Render empty/partial/null states.
- Avoid fetching or calculating metric values.

### Tile Affordance

Program tiles and workstream metric rows have different layouts. The implementation may use a
shared helper component or a small local affordance in each file, but it must satisfy:

- Keyboard reachable.
- Clear accessible label such as `View rolling details for Avg Total Delivery/Bug`.
- No nested interactive conflicts with tooltip icons or RAG badges.
- Unsupported metrics render without an affordance.

## Error & Rescue Map

| Operation | What Can Fail | Planned Handling | Test Strategy |
|---|---|---|---|
| Build modal data | Trend sprints absent | Return empty row list and modal empty state | Adapter unit test |
| Build modal data | Metric value null | Display `N/A`, preserve raw null | Adapter unit test |
| Build delivery-to-bug rows | Bug hours are zero | Use existing zero-bug display/RAG rules | Adapter/API test |
| Build delivery-to-bug rows | API lacks per-sprint ratio | Add additive API fields; do not derive ambiguous values in component | Route/adapter test |
| Open modal | Tooltip/RAG controls conflict with trigger | Use explicit trigger or non-nested interactive layout | Component interaction test |
| Render modal | Narrow viewport table overflows | Allow scroll or stacked layout | Component/layout assertion where practical |

## Shadow Paths

| Flow | Happy Path | Nil Input | Empty Input | Upstream Error |
|---|---|---|---|---|
| Program velocity rate | Modal shows sprint rows and average | Null values show `N/A` | No trends -> empty state | Existing dashboard error state |
| Program delivery-to-bug | Modal shows program-only ratio rows | Missing ratio shows `N/A` | No trends -> empty state | Existing dashboard error state |
| Workstream supported metric | Modal shows selected workstream rows | Null row values show `N/A` | No trends -> empty state | Existing dashboard error state |
| Workstream delivery-to-bug | No modal affordance rendered | N/A | N/A | N/A |

## Interaction Edge Cases

| Edge Case | Planned Handling |
|---|---|
| Keyboard activation | Trigger opens modal with Enter/Space via native button semantics |
| Escape key | Mantine modal closes and returns focus according to library behavior |
| Tooltip inside tile | Tooltip remains independently focusable/clickable |
| Partial sprint window | Show available rows only; do not pad |
| Selected previous sprint | Respect existing trend window and selected-sprint behavior |

## Testing Plan

- Adapter tests for modal row construction and formatting.
- API route tests only if new response fields are added for delivery-to-bug trend rows.
- Component tests for modal render states and keyboard interactions.
- Regression tests confirming workstream `Delivery/Bug` has no drilldown trigger.

## Non-Goals

- No metric calculation changes.
- No RAG threshold changes.
- No database schema changes.
- No workstream delivery-to-bug drilldown in v1.
