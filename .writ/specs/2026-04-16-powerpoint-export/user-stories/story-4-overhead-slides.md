# Story 4: Overhead Slides

**Status:** Completed ✅
**Priority:** High
**Dependencies:** Story 1 (Export Infrastructure)
**Effort:** S

## User Story

As a dashboard user,
I want each workstream's exported slides to include an Overhead slide with a composition chart,
So that stakeholders can see how overhead hours are distributed (Meetings, Bugs, Spikes, Support) across sprints.

## Acceptance Criteria

**Given** a workstream has overhead composition data,
**When** I open its Overhead slide in the PPTX,
**Then** I see a stacked bar chart with sprint names on the x-axis and four stacked series: Meetings, Bugs, Spikes, Support.

**Given** the export completes with 5 workstreams,
**When** I count the overhead slides,
**Then** there are 5 overhead slides — one per workstream — each titled "{WorkstreamName} — Overhead".

**Given** an Overhead slide,
**When** I look at the right-hand panel,
**Then** I see a text block showing: current Overhead % and rolling average Overhead %.

**Given** `overheadComposition` is empty for a workstream,
**When** the overhead slide is built,
**Then** the slide renders "No overhead data available" text instead of a chart — without throwing.

## Implementation Tasks

- [x] Create `lib/export/slides/overhead.ts` — `buildOverheadSlide(prs, ws: WorkstreamCardViewModel): void`
- [x] Build stacked bar chart data from `ws.overheadComposition`: x-axis labels = `sprintName`; 4 series: `Meetings` (ceremonyHours), `Bugs` (bugHours), `Spikes` (spikeHours), `Support` (supportHours)
- [x] Add pptxgenjs `bar` chart with `barGrouping: 'stacked'`: x=0.3, y=0.8, w=8.5, h=5.5; assign distinct chart colors per series (e.g. blue, red, orange, teal)
- [x] Add slide title: "{WorkstreamName} — Overhead"
- [x] Add metrics text block (right panel): x=9.0, y=0.8, w=4.0 — "Overhead %: {value}" and "Rolling Avg: {avg}"
- [x] Handle empty `overheadComposition`: skip chart, render "No overhead data available" center text
- [x] Write unit tests: full overheadComposition → 4 series built correctly; empty overheadComposition → no throw

## Technical Notes

- `WorkstreamCardViewModel.overheadComposition` is `OverheadCompositionViewModel[]` with fields: `sprintName`, `ceremonyHours`, `bugHours`, `spikeHours`, `supportHours`, `overheadPercent` (formatted string)
- The overhead % metric tile is the third in the `ws.metrics` array (index 2): label "Overhead %", `value` (formatted string), `rawValue` (number | null), `avgLabel`
- pptxgenjs stacked bar: pass `chartData` as array of `{ name, labels, values }` objects — one per series
- Rolling avg: use `avgLabel` from the overhead metric tile if available (`ws.metrics[2]?.avgLabel`)
- `overheadPercent` on `OverheadCompositionViewModel` is a pre-formatted string like "23.4%" — use as-is in text blocks

## Context for Agents

- spec.md → ## Slide Specifications → Overhead
- technical-spec.md → Slide Implementations → overhead.ts
- `OverheadCompositionViewModel` in `lib/dashboard/types.ts`: sprintName, ceremonyHours, bugHours, spikeHours, supportHours, overheadPercent
- Metrics tile order in `WorkstreamCardViewModel.metrics`: [Velocity, Velocity Rate, Overhead %, Carry-Over %]
- Slide layout: LAYOUT_WIDE — chart takes left 2/3, metrics text takes right 1/3

## Definition of Done

- [x] `lib/export/slides/overhead.ts` exists with `buildOverheadSlide()` exported
- [x] Stacked bar chart has 4 series (Meetings, Bugs, Spikes, Support) per sprint
- [x] Metrics text block shows overhead % and rolling average
- [x] Empty `overheadComposition` produces "No overhead data available" text — no crash
- [x] Unit tests pass for all acceptance criteria cases
