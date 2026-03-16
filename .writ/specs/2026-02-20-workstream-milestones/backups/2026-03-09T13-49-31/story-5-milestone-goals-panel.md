# Story 5: MilestoneGoalsPanel Component

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Story 4

## User Story

**As a** dashboard user
**I want** to see each workstream's monthly goal Features displayed with burnup charts grouped by month
**So that** I can understand milestone progress at a glance without navigating to ADO

## Acceptance Criteria

- [x] Given a workstream with 2 current-month and 1 past-month milestones, when `MilestoneGoalsPanel` renders, then current month group appears first with a highlighted header, past month group appears below ✅
- [x] Given a `FeatureMilestoneCard` for a milestone with burnup data, when rendered, then the `BurnupChart` shows cumulative completed SP vs. total SP per sprint ✅
- [x] Given a Feature with `totalPoints=0`, when `FeatureMilestoneCard` renders, then "No story points tracked" placeholder is shown instead of the chart ✅
- [x] Given `loading=true`, when `MilestoneGoalsPanel` renders, then skeleton states are shown ✅
- [x] Given `milestoneGroups=[]`, when `MilestoneGoalsPanel` renders, then "No monthly goal Features found for this workstream" empty state is shown ✅
- [x] Given a completed milestone (`isComplete=true`), when `FeatureMilestoneCard` renders, then the card has a visually distinct completed style ✅

## Implementation Tasks

- [x] 5.1 Write tests for `BurnupChart` — renders chart with correct series, empty state, single data point ✅
- [x] 5.2 Write tests for `FeatureMilestoneCard` — displays title, SP counts, formatted percent, ADO ID badge, empty chart state, completed style ✅
- [x] 5.3 Write tests for `MilestoneGoalsPanel` — month grouping order, current month highlight, loading state, empty state ✅
- [x] 5.4 Create `components/Dashboard/BurnupChart.tsx` — Mantine `AreaChart` with "Completed SP" (solid) and "Target SP" (dashed reference line at totalSP); height ~160px; empty state returns null ✅
- [x] 5.5 Create `components/Dashboard/FeatureMilestoneCard.tsx` — Paper card with title, ADO ID badge, SP counts, percent, `BurnupChart`; completed variant with green border ✅
- [x] 5.6 Create `components/Dashboard/MilestoneGoalsPanel.tsx` — Stack of month groups; current month group uses accent background; each group header shows month label + group completion %; Skeleton loading state ✅
- [x] 5.7 Verify acceptance criteria met with visual inspection in Storybook or browser; all component tests pass ✅

## Notes

- `BurnupChart` series config:
  - `{ name: 'completedSP', label: 'Completed SP', color: 'teal.6' }`
  - `{ name: 'totalSP', label: 'Target SP', color: 'gray.4', strokeDasharray: '4 2' }`
- Use Mantine `AreaChart` from `@mantine/charts` (consistent with existing `VelocityTrendChart`)
- `FeatureMilestoneCard` layout: `Paper withBorder p="sm"` → `Group justify="space-between"` for title+badge / SP counts → `BurnupChart`
- `MilestoneGoalsPanel` month group header: `Text fw={700}` + `Badge` with group completion percent + current month indicator
- Past month groups: collapsed by default using Mantine `Collapse` or `Accordion`
- Consistent with existing `OverheadBreakdownPanel` and `WorkstreamHealthCard` visual patterns

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Tests passing (27/27 new, 164/164 regression) ✅
- [x] Code reviewed ✅
- [x] Documentation updated ✅
