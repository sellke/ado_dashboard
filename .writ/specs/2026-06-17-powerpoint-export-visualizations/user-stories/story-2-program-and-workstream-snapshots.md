# Story 2: Program and Workstream Snapshot Slides

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Story 1

## User Story

As a stakeholder viewing the exported deck, I want a concise program snapshot and compact workstream snapshot slides so that I can understand dashboard health before reading detailed metric slides.

## Acceptance Criteria

1. **Given** full dashboard data, **when** the deck opens, **then** the first layered section summarizes program health, metric status, trend context, and caveats.
2. **Given** scoped workstreams, **when** snapshot slides render, **then** every visible workstream appears in order with key metric values and status cues.
3. **Given** many scoped workstreams, **when** one slide cannot remain readable, **then** snapshot cards paginate or split without breaking footer counts.
4. **Given** partial data, **when** snapshots render, **then** null and missing values are labeled as `N/A` or caveats instead of zeros.

## Implementation Tasks

- [ ] Add tests for program snapshot data mapping and missing-data caveats.
- [ ] Add tests for workstream snapshot pagination/card layout decisions.
- [ ] Create a program health snapshot slide builder using native pptx shapes/text.
- [ ] Create one or more workstream snapshot slide builders using compact native cards.
- [ ] Add RAG/status distribution and top caveat rendering where data supports it.
- [ ] Integrate snapshot slide descriptors into the slide plan.
- [ ] Manually export a deck and confirm snapshots are readable in PowerPoint.

## Technical Notes

- Prefer native pptx summaries over Recharts capture for snapshot slides.
- Keep cards concise: workstream name, 3-5 key metrics, status cue, and primary caveat.
- Use MDT theme tokens and shared footer/title helpers.

## Context for Agents

- Read `sub-specs/ui-wireframes.md` -> `Program Health Snapshot` and `Workstream Snapshot`.
- Read `components/Dashboard/ProgramSummarySection.tsx` and `components/Dashboard/WorkstreamHealthCard.tsx` for current visual/content patterns.
- Read `lib/dashboard/types.ts` for `DashboardViewModel`, `MetricTileViewModel`, and `WorkstreamCardViewModel`.

## Definition of Done

- [ ] Program snapshot slide renders full, nil, and partial states.
- [ ] Workstream snapshot slides include all scoped workstreams.
- [ ] Snapshot slides use shared MDT slide frame/chrome.
- [ ] Long workstream names and labels remain presentation-readable.
- [ ] Tests cover snapshot mapping and pagination behavior.
