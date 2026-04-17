# Story 2: Program Summary Slide

**Status:** Not Started
**Priority:** High
**Dependencies:** Story 1 (Export Infrastructure)
**Effort:** S

## User Story

As a dashboard user,
I want the exported PPTX to open with a Program Health Summary slide,
So that stakeholders immediately see the top-level KPI health at a glance.

## Acceptance Criteria

**Given** the export runs with full program metrics loaded,
**When** I open the exported PPTX,
**Then** the first slide is titled "Program Health Summary — {sprintName}" and contains 5 metric tiles with RAG color fills.

**Given** a metric has a Green RAG status,
**When** I look at its tile on the slide,
**Then** the tile background is filled with `#2f9e44`.

**Given** `programRollup` is null,
**When** the Program Summary slide is built,
**Then** the two milestone tiles display "–" without throwing an error.

**Given** `programMetrics` is null,
**When** the Program Summary slide is built,
**Then** the slide renders a single "No data available" text box without throwing.

**Given** the export completes,
**When** I look at the bottom of the Program Summary slide,
**Then** a footer shows "Generated {YYYY-MM-DD} | Last computed: {computedAt}".

## Implementation Tasks

- [ ] Create `lib/export/slides/program-summary.ts` — `buildProgramSummarySlide(prs, input: ExportInput): void`
- [ ] Implement 5 metric tiles as colored rectangles (pptxgenjs `addShape` + `addText`): x positions at 0.3, 2.9, 5.5, 8.1, 10.7; each 2.4" wide × 2.2" tall; y=1.0 — label (top), value (center, 28pt bold), rolling avg (bottom, 10pt)
- [ ] Source metrics 1–3 (Velocity, Overhead %, Carry-Over %) from `input.programMetrics` array; tile fill from `ragColor(metric.rag)`
- [ ] Source metric 4 (Monthly Milestone %) from `input.programRollup.currentMonthCompletionPercent` formatted as "%", or "–"; fill `#868e96`
- [ ] Source metric 5 (Quarterly Progress) from `input.programRollup.quarterlyMilestones.complete + " / " + total`, or "–"; fill `#868e96`
- [ ] Add slide title text box: x=0.3, y=0.2, w=12.7, h=0.6 — "Program Health Summary — {sprintName}"
- [ ] Add footer text box: y=6.9, h=0.4 — "Generated {date} | Last computed: {computedAt}" — handle null computedAt gracefully
- [ ] Wire `buildProgramSummarySlide` into `lib/export/builder.ts` (or `lib/export/index.ts` stub from Story 1)
- [ ] Write unit tests: full data → 5 tiles; null programMetrics → no throw; null programRollup → "–" tiles

## Technical Notes

- Slide layout is `LAYOUT_WIDE` (13.33" × 7.5") — set in `builder.ts` when Presentation is created
- pptxgenjs `addShape` for colored rectangles: `slide.addShape(prs.ShapeType.rect, { x, y, w, h, fill: { color: ragColor(rag) } })`
- `addText` for text overlay: `slide.addText(text, { x, y, w, h, align: 'center', color: 'FFFFFF', bold: true })`
- Rolling avg label: use `metric.avgLabel` from `MetricTileViewModel` if available, else `metric.rawValue`
- Text color on all metric tiles should be white (`FFFFFF`) for legibility against all RAG colors
- Null guard: `if (!input.programMetrics) { slide.addText('No data available', { x: 0.3, y: 3.0, ... }); return; }`

## Context for Agents

- spec.md → ## Slide Specifications → Slide 1: Program Summary
- technical-spec.md → Slide Implementations → program-summary.ts
- RAG colors: Green `2f9e44` · Amber `e67700` · Red `c92a2a` · null/milestone tiles `868e96` (no `#` in pptxgenjs)
- `MetricTileViewModel` fields: `label`, `value` (formatted string), `rawValue`, `unit`, `rag`, `avgLabel`
- `ApiProgramMilestoneRollup` fields: `currentMonthCompletionPercent`, `quarterlyMilestones.complete`, `quarterlyMilestones.total`
- Program metrics order in array: [Velocity, Overhead %, Carry-Over %, ...] — match tile positions 1–3

## Definition of Done

- [ ] `lib/export/slides/program-summary.ts` exists with `buildProgramSummarySlide()` exported
- [ ] Function is wired into the export builder — Program Summary is slide 1 in output
- [ ] All 5 metric tiles render with correct RAG fills and white text
- [ ] Null inputs (null programMetrics, null programRollup) produce no runtime errors
- [ ] Unit tests pass for all acceptance criteria cases
