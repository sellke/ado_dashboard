# Story 3: Existing Slide Readability Pass

> **Status:** Completed ✅
> **Priority:** Medium
> **Dependencies:** Story 1

## User Story

As a stakeholder reading existing exported detail slides, I want chart labels, legends, status panels, and placeholders to be clear at presentation scale so that the deck communicates metric context without live-dashboard interaction.

## Acceptance Criteria

1. **Given** existing program summary and workstream detail slides, **when** exported, **then** labels, legends, titles, status cues, and metric panels are readable in PowerPoint.
2. **Given** chart capture fails for one chart, **when** the deck is generated, **then** that slide shows a readable placeholder and the deck still downloads.
3. **Given** trend, overhead, bug, or milestone data is missing, **when** a detail slide renders, **then** the empty-state copy explains what is unavailable.
4. **Given** footer and title frame helpers exist, **when** existing slides are updated, **then** every slide still uses consistent MDT chrome.

## Implementation Tasks

- [ ] Add or update tests for existing slide placeholder behavior.
- [ ] Review `program-summary`, `velocity`, `bug-burndown`, `overhead`, and `milestone` slide builders for readability gaps.
- [ ] Improve label sizes, legend placement, metric panel wording, and placeholder copy where needed.
- [ ] Add a shared placeholder/caveat helper if duplicated copy or styling appears across slide builders.
- [ ] Ensure each updated slide still consumes slide-plan context for footer/page totals.
- [ ] Mock chart capture failure and verify deck generation continues.
- [ ] Manually compare an exported deck before/after for readability and MDT chrome.

## Technical Notes

- This story should not add new metric calculations.
- Embedded Recharts PNG colors do not need a full MDT recolor unless readability requires a targeted change.
- Existing chart capture strategy remains serial.

## Context for Agents

- Read `lib/export/slides/program-summary.tsx`, `velocity.tsx`, `bug-burndown.tsx`, `overhead.tsx`, and `milestone.tsx`.
- Read `sub-specs/ui-wireframes.md` -> `Existing Detail Slides`.
- Read `.writ/specs/2026-04-16-powerpoint-export/spec.md` and `.writ/specs/2026-04-17-mdt-slides-format-export/spec.md` for prior constraints.

## Definition of Done

- [ ] Existing slides remain in the deck and are presentation-readable.
- [ ] Missing-data and chart-failure placeholders are consistent.
- [ ] Footer/page numbering remains correct.
- [ ] No metric math moves into slide code.
- [ ] Tests and manual export review cover the changed slides.
