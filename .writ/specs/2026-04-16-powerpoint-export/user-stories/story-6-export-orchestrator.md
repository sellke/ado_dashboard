# Story 6: Export Orchestrator & End-to-End Wiring

**Status:** Completed ✅
**Priority:** High
**Dependencies:** Stories 2, 3, 4, 5, **7**
**Effort:** S

## User Story

As a dashboard user,
I want clicking "Export PPTX" to produce a complete, correctly ordered 21-slide presentation,
So that the exported file is ready to share with stakeholders without any manual editing.

## Acceptance Criteria

**Given** the dashboard is fully loaded with all 5 workstreams,
**When** I export the PPTX,
**Then** the file contains exactly **21 slides**: 1 Program Summary followed by **4 slides per workstream (Velocity → Bug Burndown → Overhead → Milestone)**, grouped by workstream.

**Given** the workstream order in the export,
**When** I examine the slide groups,
**Then** the workstreams appear in the same order as `viewModel.workstreamCards` (alphabetical by name: Action Tracker, KPI Services, Pitch Tracker, Streams, UCM).

**Given** I export on 2026-04-16,
**When** I look at the downloaded filename,
**Then** it is `LiveLink-Health-Report-2026-04-16.pptx`.

**Given** a workstream has no data,
**When** the export runs,
**Then** that workstream's 4 slides still appear — with placeholder text — and the total slide count remains **21**.

**Given** `handleExport` runs,
**When** the `ExportInput` is constructed,
**Then** `programTrendSprints` and `sprint5Prediction` are populated from `viewModel` (so Slide 1 charts can render).

**Given** the full export completes successfully,
**When** I time the operation,
**Then** it completes in under 5 seconds with dashboard data already loaded.

## Implementation Tasks

- [x] Update `lib/export/builder.ts` — implement `buildPresentation(PptxGenJS, input: ExportInput)`: set `prs.layout = 'LAYOUT_WIDE'`; call `buildProgramSummarySlide`; loop `input.workstreams`
- [x] Update `lib/export/index.ts` — export `buildPresentation` from `builder.ts` (replace the stub from Story 1)
- [x] Update `DashboardContainer.handleExport` — build the full `ExportInput` from state
- [x] Call `buildPresentation(PptxGenJS, input)` and then `prs.writeFile({ fileName: 'LiveLink-Health-Report-{YYYY-MM-DD}.pptx' })` with local date
- [x] Write integration-style unit test: `buildPresentation` with mock `ExportInput` produces the expected slide count
- [x] ⚠️ Update `builder.ts` per-workstream loop to call **four** builders in order: `buildVelocitySlide`, `buildBugBurndownSlide` 🆕, `buildOverheadSlide`, `buildMilestoneSlide`
- [x] ⚠️ Update slide-count assertion / comment in builder: `1 + (workstreams.length × 4)` total slides
- [x] 🆕 Update `handleExport` in `DashboardContainer.tsx` to include `programTrendSprints: viewModel.programTrendSprints` and `sprint5Prediction: viewModel.sprint5Prediction` in the `ExportInput`
- [x] ⚠️ Update integration test in `__tests__/lib/export/builder.test.ts`: expect `21` slides for 5-workstream mock input (was 16); assert per-workstream slide ordering is Velocity → Bug Burndown → Overhead → Milestone
- [x] 🆕 Add a `handleExport` unit/integration test (or update existing) to assert the built `ExportInput` contains `programTrendSprints` and `sprint5Prediction`

## Technical Notes

- Slide order is strictly: Program Summary → for each workstream **[Velocity, Bug Burndown, Overhead, Milestone]**. The `input.workstreams` array order dictates workstream order — no sorting in builder.
- `prs.writeFile({ fileName })` is the pptxgenjs method to trigger browser download in client mode. It returns a Promise — must be awaited.
- `ExportInput.rawWorkstreams` is available for slide builders that need raw API shapes (e.g. milestone filtering by `workstreamId`). `WorkstreamCardViewModel.workstreamId` is the same value — milestone filtering can use `ws.workstreamId` directly.
- Date for filename: `new Date().toISOString().slice(0, 10)` gives `YYYY-MM-DD` in UTC. Acceptable for this use case.
- If `rawMetrics === null`, pass safe defaults: `sprintName = 'Unknown Sprint'`, `computedAt = null`, `programMetrics = null`, `rawWorkstreams = []`. The workstream cards from `viewModel.workstreamCards` may still be populated from cached state — use what's available.
- **New fields in `ExportInput`:** `programTrendSprints: TrendSprintViewModel[]` (default `[]` if missing) and `sprint5Prediction` (default `null`). Both sourced from `viewModel` which is already in scope inside `handleExport`.
- The builder function receives the `PptxGenJS` constructor (dynamically imported) as its first argument so it remains testable without dynamic imports in unit tests.

## Context for Agents

- spec.md → ## 📋 Business Rules → Slide Ordering, Workstream Ordering, File Naming
- spec.md → ## 📋 Business Rules → Data Source
- technical-spec.md → Module Structure → builder.ts
- technical-spec.md → DashboardContainer.tsx Changes (full handleExport implementation)
- `ExportInput` type in `lib/export/types.ts` (updated for Story 7)
- `buildProgramSummarySlide`, `buildVelocitySlide`, `buildBugBurndownSlide`, `buildOverheadSlide`, `buildMilestoneSlide` from Stories 2, 3, 7, 4, 5
- Stories 2–5 and 7 must be merged/available before implementing this story's updated tasks

## Definition of Done

- [x] `buildPresentation()` is fully implemented (not a stub) and produces the expected slide count for 5 workstreams
- [x] `DashboardContainer.handleExport` passes the complete `ExportInput` built from React state
- [x] Downloaded filename follows convention `LiveLink-Health-Report-{YYYY-MM-DD}.pptx`
- [x] Workstream slides are grouped (per-workstream block), not sectioned
- [x] Export completes in < 5 seconds with data loaded (manual verification)
- [x] ⚠️ Per-workstream block order is **Velocity → Bug Burndown → Overhead → Milestone** (4 slides)
- [x] ⚠️ Integration test: `buildPresentation` with 5 workstreams produces **21** slides
- [x] 🆕 `ExportInput` built by `handleExport` includes `programTrendSprints` and `sprint5Prediction`
