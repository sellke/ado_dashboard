# Story 2: Program Summary Slide

**Status:** Reopened (2026-04-16) — original 5-tile layout complete; adding program velocity + bug burndown charts below tiles
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

**Given** `programTrendSprints` is populated,
**When** I look at the Program Summary slide,
**Then** I see a program velocity line chart on the bottom-left and a program bug burndown stacked bar chart (Open red + Closed green) on the bottom-right, below the KPI tile row.

**Given** `programTrendSprints === []`,
**When** the Program Summary slide is built,
**Then** both charts are omitted and a single "No program trend data available" text appears in their place — without throwing; KPI tiles and footer still render.

**Given** `sprint5Prediction === null`,
**When** the velocity chart is built,
**Then** the chart renders without the `Forecasted` overlay series — no crash.

## Implementation Tasks

- [x] Create `lib/export/slides/program-summary.ts` — `buildProgramSummarySlide(prs, input: ExportInput): void`
- [x] ⚠️ Implement 5 metric tiles as colored rectangles — **shrink tile height from 2.2" to 1.7"** to make room for charts; x positions at 0.3, 2.9, 5.5, 8.1, 10.7; y=1.0, h=1.7; label (top), value (center, 24pt bold), rolling avg (bottom, 10pt)
- [x] Source metrics 1–3 (Velocity, Overhead %, Carry-Over %) from `input.programMetrics` array; tile fill from `ragColor(metric.rag)`
- [x] Source metric 4 (Monthly Milestone %) from `input.programRollup.currentMonthCompletionPercent` formatted as "%", or "–"; fill `#868e96`
- [x] Source metric 5 (Quarterly Progress) from `input.programRollup.quarterlyMilestones.complete + " / " + total`, or "–"; fill `#868e96`
- [x] Add slide title text box: x=0.3, y=0.2, w=12.7, h=0.6 — "Program Health Summary — {sprintName}"
- [x] Add footer text box: y=6.9, h=0.4 — "Generated {date} | Last computed: {computedAt}" — handle null computedAt gracefully
- [x] Wire `buildProgramSummarySlide` into `lib/export/builder.ts`
- [x] Write unit tests: full data → 5 tiles; null programMetrics → no throw; null programRollup → "–" tiles
- [ ] 🆕 Build **program velocity line chart** at x=0.3, y=3.0, w=6.2, h=3.7 — two series:
  - `Completed Points` = `programTrendSprints.map(s => s.rawVelocity ?? 0)` with `null` at current-sprint index when a forecast exists
  - `Forecasted` = single non-null point at the current-sprint index equal to `sprint5Prediction?.rawVelocity`; dashed line style (`chartColors: ['4c9be8', '9fc5eb']`)
  - Reference line at mean of completed-sprint `rawVelocity` values (helper: `averageVelocity(programTrendSprints)`)
  - X-axis labels: `programTrendSprints.map(s => s.sprintName.replace(/^Sprint\s*/i, ''))`
- [ ] 🆕 Build **program bug burndown stacked bar chart** at x=6.8, y=3.0, w=6.2, h=3.7:
  - Series `Open (New/Active)` = `programTrendSprints.map(s => s.rawActiveBugs)`, color `c92a2a`
  - Series `Closed (Resolved/Testing/Closed)` = `programTrendSprints.map(s => s.rawBugsClosed)`, color `2f9e44`
  - `barGrouping: 'stacked'`; same x-axis labels as velocity chart
- [ ] 🆕 Handle `programTrendSprints.length === 0` — skip both charts, render "No program trend data available" text at x=0.3, y=3.5, w=12.7, h=1.0
- [ ] 🆕 Handle `sprint5Prediction === null` — velocity chart renders with only the `Completed Points` series + reference line
- [ ] 🆕 Add unit tests: `programTrendSprints` populated → both charts render; empty `programTrendSprints` → placeholder, no throw; null `sprint5Prediction` → velocity chart has 1 series

## Technical Notes

- Slide layout is `LAYOUT_WIDE` (13.33" × 7.5") — set in `builder.ts` when Presentation is created
- pptxgenjs `addShape` for colored rectangles: `slide.addShape(prs.ShapeType.rect, { x, y, w, h, fill: { color: ragColor(rag) } })`
- `addText` for text overlay: `slide.addText(text, { x, y, w, h, align: 'center', color: 'FFFFFF', bold: true })`
- Rolling avg label: use `metric.avgLabel` from `MetricTileViewModel` if available, else `metric.rawValue`
- Text color on all metric tiles should be white (`FFFFFF`) for legibility against all RAG colors
- Null guard: `if (!input.programMetrics) { slide.addText('No data available', { x: 0.3, y: 1.0, ... }); return; }` — tiles and charts both skip; footer still renders
- **Tile compression:** the reduced 1.7" tile height still fits label (10pt) + value (24pt bold) + avg label (10pt) with ~6pt inter-line padding. Value font drops from 28pt to 24pt to accommodate.
- **Chart data parity with dashboard:** the dashboard's `ProgramSummarySection` builds the same two charts from `programTrendSprints` + `sprint5Prediction`. Use the same series construction so the PPTX mirrors what users see on screen. See `components/Dashboard/ProgramSummarySection.tsx` `buildVelocityChartData()` and `buildBugChartData()` for the reference logic.
- **pptxgenjs stacked bar values** must be non-null numbers (pptxgenjs does not handle null gracefully in bar series). Use `rawActiveBugs ?? 0`, `rawBugsClosed ?? 0` (both fields are `number` not `number | null` so no coercion is strictly required).

## Context for Agents

- spec.md → ## Slide Specifications → Slide 1: Program Summary (charts section)
- technical-spec.md → Slide Implementations → program-summary.ts
- RAG / chart colors: Green `2f9e44` · Amber `e67700` · Red `c92a2a` · null/milestone tiles `868e96` · bug burndown: Open `c92a2a`, Closed `2f9e44` (no `#` in pptxgenjs)
- `MetricTileViewModel` fields: `label`, `value` (formatted string), `rawValue`, `unit`, `rag`, `avgLabel`
- `ApiProgramMilestoneRollup` fields: `currentMonthCompletionPercent`, `quarterlyMilestones.complete`, `quarterlyMilestones.total`
- `TrendSprintViewModel` fields used here: `sprintName`, `isCurrent`, `rawVelocity`, `rawActiveBugs`, `rawBugsClosed`
- Program metrics order in array: [Velocity, Overhead %, Carry-Over %, ...] — match tile positions 1–3
- Reference dashboard chart logic: `components/Dashboard/ProgramSummarySection.tsx`

## Definition of Done

- [x] `lib/export/slides/program-summary.ts` exists with `buildProgramSummarySlide()` exported
- [x] Function is wired into the export builder — Program Summary is slide 1 in output
- [x] All 5 metric tiles render with correct RAG fills and white text (now at compressed h=1.7")
- [x] Null inputs (null programMetrics, null programRollup) produce no runtime errors
- [ ] 🆕 Program velocity line chart renders with Completed + Forecasted series (plus reference line)
- [ ] 🆕 Program bug burndown stacked bar chart renders with Open (red) + Closed (green) series
- [ ] 🆕 Empty `programTrendSprints` → placeholder text, both charts omitted, no crash
- [ ] 🆕 Null `sprint5Prediction` → velocity chart renders with 1 series, no crash
- [ ] Unit tests pass for all acceptance criteria cases (original + new)
