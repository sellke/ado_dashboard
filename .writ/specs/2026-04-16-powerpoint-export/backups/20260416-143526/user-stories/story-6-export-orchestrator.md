# Story 6: Export Orchestrator & End-to-End Wiring

**Status:** Not Started
**Priority:** High
**Dependencies:** Stories 2, 3, 4, 5
**Effort:** S

## User Story

As a dashboard user,
I want clicking "Export PPTX" to produce a complete, correctly ordered 16-slide presentation,
So that the exported file is ready to share with stakeholders without any manual editing.

## Acceptance Criteria

**Given** the dashboard is fully loaded with all 5 workstreams,
**When** I export the PPTX,
**Then** the file contains exactly 16 slides: 1 Program Summary followed by 3 slides per workstream (Velocity → Overhead → Milestone), grouped by workstream.

**Given** the workstream order in the export,
**When** I examine the slide groups,
**Then** the workstreams appear in the same order as `viewModel.workstreamCards` (alphabetical by name: Action Tracker, KPI Services, Pitch Tracker, Streams, UCM).

**Given** I export on 2026-04-16,
**When** I look at the downloaded filename,
**Then** it is `LiveLink-Health-Report-2026-04-16.pptx`.

**Given** a workstream has no data,
**When** the export runs,
**Then** that workstream's 3 slides still appear — with placeholder text — and the total slide count remains 16.

**Given** the full export completes successfully,
**When** I time the operation,
**Then** it completes in under 5 seconds with dashboard data already loaded.

## Implementation Tasks

- [ ] Update `lib/export/builder.ts` — implement `buildPresentation(PptxGenJS, input: ExportInput)`: set `prs.layout = 'LAYOUT_WIDE'`; call `buildProgramSummarySlide`; loop `input.workstreams` and call `buildVelocitySlide`, `buildOverheadSlide`, `buildMilestoneSlide` for each
- [ ] Update `lib/export/index.ts` — export `buildPresentation` from `builder.ts` (replace the stub from Story 1)
- [ ] Update `DashboardContainer.handleExport` — build the full `ExportInput` from state: `sprintName` from `rawMetrics.sprint.name`, `computedAt` from `rawMetrics.computedAt`, `programMetrics` from `viewModel.programMetrics`, `programRollup`, `workstreams` from `viewModel.workstreamCards`, `rawWorkstreams` from `rawMetrics.workstreams`, `milestones`
- [ ] Call `buildPresentation(PptxGenJS, input)` and then `prs.writeFile({ fileName: 'LiveLink-Health-Report-{YYYY-MM-DD}.pptx' })` with local date
- [ ] Verify slide count: add a dev-mode assertion or comment in builder confirming 1 + (workstreams.length × 3) total slides
- [ ] Write integration-style unit test: call `buildPresentation` with mock `ExportInput` (5 workstreams, full data) and assert the returned prs has 16 slide objects

## Technical Notes

- Slide order is strictly: Program Summary → for each workstream [Velocity, Overhead, Milestone]. The `input.workstreams` array order dictates workstream order — no sorting in builder.
- `prs.writeFile({ fileName })` is the pptxgenjs method to trigger browser download in client mode. It returns a Promise — must be awaited.
- `ExportInput.rawWorkstreams` is available for slide builders that need raw API shapes (e.g. milestone filtering by `workstreamId`). But `WorkstreamCardViewModel.workstreamId` is the same value — milestone filtering can use `ws.workstreamId` directly.
- Date for filename: `new Date().toISOString().slice(0, 10)` gives `YYYY-MM-DD` in UTC. Acceptable for this use case.
- If `rawMetrics === null`, pass safe defaults: `sprintName = 'Unknown Sprint'`, `computedAt = null`, `programMetrics = null`, `rawWorkstreams = []`. The workstream cards from `viewModel.workstreamCards` may still be populated from cached state — use what's available.
- The builder function receives the `PptxGenJS` constructor (dynamically imported) as its first argument so it remains testable without dynamic imports in unit tests.

## Context for Agents

- spec.md → ## 📋 Business Rules → Slide Ordering, Workstream Ordering, File Naming
- spec.md → ## 📋 Business Rules → Data Source
- technical-spec.md → Module Structure → builder.ts
- technical-spec.md → DashboardContainer.tsx Changes (full handleExport implementation)
- `ExportInput` type in `lib/export/types.ts` (from Story 1)
- `buildProgramSummarySlide`, `buildVelocitySlide`, `buildOverheadSlide`, `buildMilestoneSlide` from Stories 2–5
- Stories 2–5 must be merged/available before implementing this story

## Definition of Done

- [ ] `buildPresentation()` is fully implemented (not a stub) and produces 16 slides for 5 workstreams
- [ ] `DashboardContainer.handleExport` passes the complete `ExportInput` built from React state
- [ ] Downloaded filename follows convention `LiveLink-Health-Report-{YYYY-MM-DD}.pptx`
- [ ] Workstream slides are grouped (Velocity → Overhead → Milestone per workstream) not sectioned
- [ ] Integration test: `buildPresentation` with 5 workstreams produces 16 slides
- [ ] Export completes in < 5 seconds with data loaded (manual verification)
