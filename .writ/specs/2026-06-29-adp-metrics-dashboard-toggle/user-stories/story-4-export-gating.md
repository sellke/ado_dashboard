# Story 4: Export Gating and Integration Tests

> **Status:** Not Started
> **Priority:** Normal
> **Dependencies:** Story 1, Story 3

## User Story

**As a** dashboard user exporting a PowerPoint report
**I want to** exclude ADP milestone slides and tiles when ADP metrics are turned off
**So that** exports match what I see on the dashboard after reload

## Acceptance Criteria

- [ ] **Given** ADP is excluded and I reload the dashboard, **when** I export PowerPoint, **then** the deck contains no `workstream-milestone` slides and no milestone context appendix slides.
- [ ] **Given** ADP is excluded, **when** the program summary slide is built, **then** Monthly Milestone and Quarterly Progress tiles are omitted (first three program metric tiles remain).
- [ ] **Given** ADP is included and milestone data exists, **when** I export, **then** export behavior matches pre-feature output (milestone slides/tiles present).
- [ ] **Given** ADP is excluded, **when** `buildSlidePlan` runs, **then** milestone slide kinds are excluded even if stale milestone arrays exist in memory.
- [ ] **Given** integration tests cover the full toggle flow, **when** ADP is toggled off → reload → export, **then** assertions pass for fetch skip and export content.

## Implementation Tasks

- [ ] 4.1 Write unit tests for `buildSlidePlan` excluding milestone kinds when `includeAdpMetrics: false`.
- [ ] 4.2 Write unit tests for program-summary `buildTiles` omitting milestone tiles when ADP excluded.
- [ ] 4.3 Add `includeAdpMetrics` to `ExportInput` or `SlidePlanBuildOptions`; thread from `DashboardContainer.handleExport`.
- [ ] 4.4 Update `lib/export/slide-plan.ts` to skip `workstream-milestone` and milestone appendix when excluded.
- [ ] 4.5 Update `lib/export/slides/program-summary.tsx` `buildTiles` to skip rollup tiles when excluded.
- [ ] 4.6 Update `lib/export/adapter.ts` / `enrichExportInput` to null milestone export fields when excluded.
- [ ] 4.7 Add integration test: config false → no milestone fetch → export deck without ADP content.

## Technical Notes

- Export uses config loaded on dashboard mount (same reload semantics as Story 3).
- When excluded, pass empty milestones and null rollup to export even if state retained from prior session before reload fix — guard at export time.
- Do not change ADO sync or `/api/milestones` route.

## Context for Agents

- **Export modules:** `lib/export/slide-plan.ts`, `slides/program-summary.tsx`, `adapter.ts`, `types.ts`
- **Program summary tiles:** `buildTiles` appends Monthly Milestone + Quarterly Progress from `programRollup` — `lib/export/slides/program-summary.tsx`
- **Slide kinds to gate:** `workstream-milestone`, `milestone-context-appendix` — `lib/export/slide-plan.ts`
- **Business rules:** Export matches dashboard ADP visibility — `spec.md` → Business Rules
- **Shadow path:** [Export ADP off] — `sub-specs/technical-spec.md`
- **Files:** export modules, `DashboardContainer.tsx`, `__tests__/lib/export/`

## Definition of Done

- [ ] All implementation tasks completed
- [ ] All acceptance criteria met
- [ ] Export unit tests passing
- [ ] Integration test documents end-to-end toggle + export behavior
