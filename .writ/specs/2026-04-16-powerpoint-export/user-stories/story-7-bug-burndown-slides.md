# Story 7: Bug Burndown Slides 🆕

**Status:** Completed ✅
**Priority:** High
**Dependencies:** Story 1 (Export Infrastructure)
**Effort:** S

## User Story

As a dashboard user,
I want each workstream's exported slides to include a Bug Burndown slide showing Open vs. Closed bug counts per sprint,
So that stakeholders can see how each workstream's bug backlog is trending alongside its velocity and overhead.

## Acceptance Criteria

**Given** a workstream has trend data with bug counts,
**When** I open its Bug Burndown slide in the PPTX,
**Then** I see a stacked bar chart with sprint names on the x-axis and two series: `Open (New/Active)` in red and `Closed (Resolved/Testing/Closed)` in green.

**Given** the export completes with 5 workstreams,
**When** I count the Bug Burndown slides,
**Then** there are 5 bug burndown slides — one per workstream — each titled "{WorkstreamName} — Bug Burndown".

**Given** a Bug Burndown slide,
**When** I look at the right-hand panel,
**Then** I see a text block with: current-sprint Open count, current-sprint Closed count, 4-sprint Open total, 4-sprint Closed total.

**Given** `trendSprints` is empty for a workstream,
**When** the bug burndown slide is built,
**Then** the slide renders "No bug data available" text instead of a chart — without throwing.

**Given** a workstream has all-zero bug counts across trend sprints,
**When** the bug burndown slide is built,
**Then** the stacked bar chart still renders (all bars zero-height) — without throwing.

**Given** the workstream has no current sprint (all sprints are historical),
**When** the metrics text block is built,
**Then** the current-sprint lines display "–" for Open and Closed — without throwing.

## Implementation Tasks

- [x] Create `lib/export/slides/bug-burndown.ts` — export `buildBugBurndownSlide(prs, ws: WorkstreamCardViewModel): void`
- [x] Build chart data: labels = `ws.trendSprints.map(s => s.sprintName)`; two series:
  - `Open (New/Active)` — `ws.trendSprints.map(s => s.rawActiveBugs)`
  - `Closed (Resolved/Testing/Closed)` — `ws.trendSprints.map(s => s.rawBugsClosed)`
- [x] Add pptxgenjs `bar` chart with `barGrouping: 'stacked'` at x=0.3, y=0.8, w=8.5, h=5.5; `chartColors: ['c92a2a', '2f9e44']`
- [x] Add slide title text box: x=0.3, y=0.2, w=12.7, h=0.6 — "{WorkstreamName} — Bug Burndown"
- [x] Add metrics text block (right panel): x=9.0, y=0.8, w=4.0 — four lines:
  - `Open (current): {currentSprint.rawActiveBugs | '–'}`
  - `Closed (current): {currentSprint.rawBugsClosed | '–'}`
  - `Open total (trend): {sum of rawActiveBugs}`
  - `Closed total (trend): {sum of rawBugsClosed}`
- [x] Handle empty `trendSprints`: skip chart and metrics, render "No bug data available" centered text
- [x] Handle missing current sprint: metrics block shows "–" for current-sprint lines; totals always render
- [x] Wire `buildBugBurndownSlide` into `lib/export/builder.ts` per-workstream loop, between `buildVelocitySlide` and `buildOverheadSlide`
- [x] Write unit tests in `__tests__/lib/export/slides.test.ts` (or new `bug-burndown.test.ts`):
  - Full `trendSprints` → chart has 2 series with correct values and colors
  - Empty `trendSprints` → renders placeholder text, no throw
  - All-zero bug counts → chart still renders, no throw
  - No `isCurrent` sprint → metrics block shows "–" for current lines

## Technical Notes

- `TrendSprintViewModel` fields used: `sprintName`, `isCurrent`, `rawActiveBugs` (number, not nullable), `rawBugsClosed` (number, not nullable)
- The stacked bar representation matches the dashboard's `Bug Burndown` chart in `ProgramSummarySection` (program) and `WorkstreamHealthCard` (per-workstream). The name "burndown" is colloquial — the chart is a composition of Open vs. Closed counts, not a true burndown line.
- Bug-related colors should match the existing RAG palette intentionally: Open → Red (`c92a2a`, same as RAG Red), Closed → Green (`2f9e44`, same as RAG Green). Keeps the deck's palette consistent.
- Chart colors array: `chartColors: ['c92a2a', '2f9e44']` — order matches series order (Open first, Closed second)
- Current-sprint lookup: `const currentSprint = ws.trendSprints.find(s => s.isCurrent);` — guard for `undefined`
- Summation: `ws.trendSprints.reduce((sum, s) => sum + s.rawActiveBugs, 0)` — both fields are required numbers; no null coercion needed

## Context for Agents

- spec.md → ## Slide Specifications → Slide 3+ (per workstream): Bug Burndown
- technical-spec.md → Slide Implementations → bug-burndown.ts
- `TrendSprintViewModel` in `lib/dashboard/types.ts` (see `rawActiveBugs`, `rawBugsClosed`, `isCurrent`)
- Reference dashboard chart logic: `components/Dashboard/WorkstreamHealthCard.tsx` `buildBugChartData()`
- Reference dashboard chart logic (program-level): `components/Dashboard/ProgramSummarySection.tsx` `buildBugChartData()`
- Slide layout: LAYOUT_WIDE — chart takes left 2/3 (w=8.5), metrics text takes right 1/3 (w=4.0)

## Definition of Done

- [x] `lib/export/slides/bug-burndown.ts` exists with `buildBugBurndownSlide()` exported
- [x] Stacked bar chart has exactly 2 series (Open red, Closed green) per sprint
- [x] Metrics text block shows current-sprint Open/Closed counts and 4-sprint totals
- [x] Empty `trendSprints` produces "No bug data available" text — no crash
- [x] All-zero bug counts still render the chart — no crash
- [x] Missing current sprint in `trendSprints` → metrics block falls back to "–" for current-sprint lines — no crash
- [x] Unit tests pass for all acceptance criteria cases
- [x] Wired into `builder.ts` per-workstream loop in the correct ordinal position (between Velocity and Overhead)
