# Dashboard Metrics Audit — Spec Lite

> For AI context windows. See `spec.md` for full details.

## What

Fix metric data sources, rework milestone display, improve layout, add chart, scope bug page. 5 stories from a section-by-section dashboard audit.

## Key Changes

| ID | Change | Files |
|---|---|---|
| W2/W3 | Overhead % and Carry-Over % tiles show **selected sprint's actual value** (not rolling avg) when sprint tab changes | `types.ts`, `adapter.ts`, `WorkstreamHealthCard.tsx` |
| W1 | Workstream cards grid: 4-col → **2-col** | `WorkstreamCardsGrid.tsx` |
| W4 | Wire existing `OverheadCompositionChart` (stacked bar) into `OverheadBreakdownPanel` alongside line chart | `OverheadBreakdownPanel.tsx`, `WorkstreamHealthCard.tsx` |
| P2 | Milestone section: replace count cards with **quarterly-grouped, per-Feature, per-workstream** story counts + % in progress / % completed | `milestones/route.ts`, `milestones/types.ts`, `dashboard/types.ts`, `adapter.ts`, `ProgramSummarySection.tsx`, new `MilestoneQuarterlyPanel.tsx` |
| B1 | Bug page: add `dashboard=main` filter to exclude Streams | `BugReportContainer.tsx` |

## Data Flow Changes

**W2/W3:** Add `rawOverheadPercent` and `rawCarryOverRate` to `TrendSprintViewModel`. Map from existing `overheadComposition.overheadPercent` and derive from `carryOverPoints / plannedPoints`. `WorkstreamHealthCard` uses these actual values (not `*Avg`) when overriding for selected sprint.

**P2:** Extend `GET /api/milestones` to include per-workstream child story breakdown (total, inProgress, completed counts). Group milestones by `quarter` tag. New `MilestoneQuarterlyPanel` component replaces count-card display.

## Stories

1. Sprint-actual Overhead % and Carry-Over % — types, adapter, card override
2. 2-column layout — grid change
3. Overhead composition chart — wire existing component
4. Milestone section rework — API, types, adapter, new component
5. Bug page filter — fetch URL change

## Out of Scope

Predictability metric, PowerPoint export, Phase 2 transcripts, new routes, Aging WIP, Scope Creep Index.
