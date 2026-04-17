# Story 5: Milestone Slides

**Status:** Not Started
**Priority:** High
**Dependencies:** Story 1 (Export Infrastructure)
**Effort:** S

## User Story

As a dashboard user,
I want each workstream's exported slides to include a Milestone slide showing burnup progress,
So that stakeholders can see how each workstream is tracking against its monthly milestone goals.

## Acceptance Criteria

**Given** a workstream has milestone goals with burnup data,
**When** I open its Milestone slide in the PPTX,
**Then** I see a line chart per milestone showing cumulative completed SP vs. total SP target across sprints.

**Given** a milestone has `percentComplete` data,
**When** I look at the slide,
**Then** each milestone section shows a "% complete" label.

**Given** a workstream has no milestones (`milestones.filter(m => m.workstreamId === ws.workstreamId).length === 0`),
**When** the milestone slide is built,
**Then** the slide renders "Milestone data unavailable for this workstream" text — without throwing.

**Given** a milestone exists but has empty `burnupData`,
**When** the milestone slide is built,
**Then** that milestone renders as a text-only label with its title and % complete — no chart — without throwing.

**Given** a workstream has more than 3 milestones,
**When** the milestone slide is built,
**Then** the first 3 milestones render with charts; additional milestones are listed as text labels with % complete only.

## Implementation Tasks

- [ ] Create `lib/export/slides/milestone.ts` — `buildMilestoneSlide(prs, ws: WorkstreamCardViewModel, milestones: ApiMilestoneWithProgress[]): void`
- [ ] Filter milestones to this workstream: `const wsMilestones = milestones.filter(m => m.workstreamId === ws.workstreamId)`
- [ ] Handle empty `wsMilestones`: render "Milestone data unavailable for this workstream" placeholder text and return
- [ ] For each milestone (up to 3): build pptxgenjs `line` chart with 2 series — `Completed SP` (cumulativeCompletedSP per burnupPoint) and `Target SP` (totalSP — flat line at milestone's totalPoints); stacked vertically on slide
- [ ] Layout for up to 3 charts stacked: chart heights of ~1.8" each at y positions 0.8, 2.8, 4.8; title per milestone at top of each chart section
- [ ] Handle `burnupData.length === 0` for a milestone: render text label only — "{milestone.title}: {percentComplete}% complete"
- [ ] For milestones beyond index 2: add text-only entries "· {title}: {percentComplete}% complete" in a list at bottom of slide
- [ ] Add slide title: "{WorkstreamName} — Milestones"
- [ ] Write unit tests: milestones with data → 2-series chart per milestone; empty milestones → no throw; empty burnupData → text-only label; > 3 milestones → only first 3 get charts

## Technical Notes

- `ApiMilestoneWithProgress` fields: `workstreamId`, `title`, `percentComplete` (number | null), `totalPoints`, `completedPoints`, `burnupData` (array of `{ sprintName, sprintId, cumulativeCompletedSP, totalSP }`)
- `WorkstreamCardViewModel.workstreamId` matches `ApiMilestoneWithProgress.workstreamId`
- Two chart series per milestone: `Completed SP` uses `burnupData.map(p => p.cumulativeCompletedSP)`; `Target SP` is a flat line using `burnupData.map(() => milestone.totalPoints)`
- `percentComplete` is `number | null` — format as `Math.round(percentComplete) + '%'` or "–" if null
- Slide layout is LAYOUT_WIDE (13.33" × 7.5") — with 3 stacked charts, each chart is ~1.8" tall
- Known data quality issue: `adp-milestones-panel` spec is Not Started — workstreamId matching may return 0 milestones for many workstreams. The empty-state placeholder handles this gracefully.

## Context for Agents

- spec.md → ## Slide Specifications → Milestone
- spec.md → ## 📋 Business Rules → Empty/Missing Data Handling (milestone rows)
- technical-spec.md → Slide Implementations → milestone.ts
- `ApiMilestoneWithProgress` in `lib/milestones/types.ts`
- `ApiBurnupPoint` in `lib/milestones/types.ts`: sprintName, sprintId, cumulativeCompletedSP, totalSP
- workstreamId from `WorkstreamCardViewModel` matches `ApiMilestoneWithProgress.workstreamId`

## Definition of Done

- [ ] `lib/export/slides/milestone.ts` exists with `buildMilestoneSlide()` exported
- [ ] Empty milestones for workstream → "Milestone data unavailable" placeholder, no crash
- [ ] Empty burnupData → text-only label with % complete, no crash
- [ ] First 3 milestones get line charts; additional milestones are text-only
- [ ] Each chart has 2 series: Completed SP (actual burnup) and Target SP (flat line)
- [ ] Unit tests pass for all acceptance criteria cases
