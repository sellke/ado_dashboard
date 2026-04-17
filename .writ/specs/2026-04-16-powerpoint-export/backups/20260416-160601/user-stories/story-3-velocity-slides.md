# Story 3: Velocity Slides

**Status:** Not Started
**Priority:** High
**Dependencies:** Story 1 (Export Infrastructure)
**Effort:** S

## User Story

As a dashboard user,
I want each workstream's exported slides to include a Velocity slide with a trend chart,
So that stakeholders can see sprint-over-sprint velocity trends and current-sprint predictions in the presentation.

## Acceptance Criteria

**Given** a workstream has trend sprint data,
**When** I open its Velocity slide in the PPTX,
**Then** I see a line chart with sprint names on the x-axis and three series: actual velocity, current sprint, and rolling average.

**Given** the current sprint exists in the trend data,
**When** I look at the chart,
**Then** the current sprint is rendered as a separate data series (not mixed with actuals).

**Given** `trendSprints` is empty for a workstream,
**When** the velocity slide is built,
**Then** the slide renders "No trend data available" text instead of a chart — without throwing.

**Given** the export completes with 5 workstreams,
**When** I look at the PPTX,
**Then** there are 5 velocity slides, one per workstream, in the same order as `viewModel.workstreamCards`.

**Given** a velocity slide,
**When** I look at the right-hand panel,
**Then** I see a text block showing: current velocity value, rolling average, RAG status, and predicted next sprint velocity.

## Implementation Tasks

- [ ] Create `lib/export/slides/velocity.ts` — `buildVelocitySlide(prs, ws: WorkstreamCardViewModel): void`
- [ ] Build chart data: three series from `ws.trendSprints` — `Velocity (SP)` (actuals, null for current sprint), `Current Sprint` (null for non-current, value for current), `Rolling Avg` (velocityAvg per sprint)
- [ ] Add pptxgenjs `line` chart: x=0.3, y=0.8, w=8.5, h=5.5; x-axis labels = sprint names; `chartColors` for the three series (e.g. `['4c9be8', 'e67700', '868e96']`)
- [ ] Add slide title text box: "{WorkstreamName} — Velocity"
- [ ] Add metrics text block (right panel): x=9.0, y=0.8, w=4.0 — four lines: "Velocity: {value} SP", "Avg: {rawVelocityRate} SP", "RAG: {rag}", "Predicted: {prediction.velocity} SP"
- [ ] Handle null `prediction`: omit predicted line from text block if `ws.prediction === null`
- [ ] Handle empty `trendSprints`: skip chart, render "No trend data available" text at center of slide
- [ ] Write unit tests: full trendSprints → chart data has 3 series with correct null placement; empty trendSprints → no throw

## Technical Notes

- `WorkstreamCardViewModel` fields used: `workstreamName`, `trendSprints` (array of `TrendSprintViewModel`), `metrics` (array of `MetricTileViewModel` — velocity is first), `prediction`
- `TrendSprintViewModel` fields: `sprintName`, `isCurrent` (bool), `rawVelocity` (number | null), `velocityAvg` (number | null)
- pptxgenjs line chart with null values: pass `null` where a data point should be absent — pptxgenjs renders a gap. This is the correct way to split actual vs. current sprint series.
- Chart colors array index matches series order: [actuals, current, rolling avg]
- Velocity RAG comes from `ws.metrics.find(m => m.label === 'Velocity')?.rag` or from the first metric tile
- Predicted velocity: `ws.prediction?.rawVelocity ?? null` formatted as integer SP

## Context for Agents

- spec.md → ## Slide Specifications → Velocity
- technical-spec.md → Slide Implementations → velocity.ts
- `TrendSprintViewModel` in `lib/dashboard/types.ts`: sprintName, isCurrent, rawVelocity, velocityAvg, rawVelocityRate
- Metrics tile array order in WorkstreamCardViewModel.metrics: [Velocity, Velocity Rate, Overhead %, Carry-Over %]
- Current sprint in trendSprints: `trendSprints.find(s => s.isCurrent)`
- Slide layout: LAYOUT_WIDE (13.33" × 7.5") — chart takes left 2/3, metrics panel takes right 1/3

## Definition of Done

- [ ] `lib/export/slides/velocity.ts` exists with `buildVelocitySlide()` exported
- [ ] Three chart series built correctly (actuals null for current, current null for actuals, rolling avg for all)
- [ ] Empty `trendSprints` produces "No trend data available" text — no crash
- [ ] Metrics text block shows velocity value, avg, RAG, and (if available) predicted next sprint
- [ ] Unit tests pass for all acceptance criteria cases
