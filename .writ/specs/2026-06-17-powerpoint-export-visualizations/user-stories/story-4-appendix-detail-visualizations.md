# Story 4: Appendix Detail Visualizations

> **Status:** Completed ✅
> **Priority:** Medium
> **Dependencies:** Stories 1, 2, and 3

## User Story

As a stakeholder who needs evidence behind the summary, I want appendix-style slides for rolling metrics, cycle time, milestones, and partial-data caveats so that I can explain the health narrative without opening the dashboard.

## Acceptance Criteria

1. **Given** rolling metric rows are available, **when** appendix slides render, **then** supported metrics show per-sprint values and rolling context with nulls labeled clearly.
2. **Given** cycle-time data exists, **when** appendix slides render, **then** User Story, Spike, and Bug averages plus unavailable counts are visible for relevant scopes.
3. **Given** milestone rollup or milestone records are sparse, **when** appendix/context slides render, **then** sparse-data impact is clearly labeled.
4. **Given** no useful appendix data exists for a section, **when** the deck is generated, **then** the section is omitted or replaced by one concise empty-state slide.

## Implementation Tasks

- [ ] Add tests for rolling metric appendix mapping and null row display.
- [ ] Add tests for cycle-time appendix mapping, including unavailable counts.
- [ ] Add tests for milestone/context caveats and empty appendix sections.
- [ ] Build rolling metric appendix slide(s) using display-ready rows.
- [ ] Build cycle-time appendix slide(s) with type rows and unavailable-data notes.
- [ ] Build milestone/data coverage appendix slide(s) for rollup and partial-data impact.
- [ ] Integrate appendix descriptors into the slide plan with conditional inclusion.

## Technical Notes

- Use table-like native pptx shapes for appendix evidence.
- Rolling metric appendix should consume data from the rolling metrics modal/view-model work rather than recomputing values.
- Cycle-time unavailable item lists remain live-dashboard drilldowns; the deck summarizes counts and impact only.

## Context for Agents

- Read `.writ/specs/2026-06-16-rolling-metrics-modal/spec.md` for rolling metric rules and program-only delivery-to-bug scope.
- Read `.writ/specs/2026-06-15-cycle-time-stories-spikes-bugs/spec-lite.md` for cycle-time unavailable semantics.
- Read `sub-specs/ui-wireframes.md` -> `Rolling Metrics Appendix`, `Cycle-Time Appendix`, and `Milestone / Partial Data Appendix`.
- Read `lib/dashboard/adapter.ts` and `lib/dashboard/types.ts` for available view-model fields.

## Definition of Done

- [ ] Rolling metric appendix renders supported metric evidence or empty state.
- [ ] Cycle-time appendix renders averages and unavailable-data caveats.
- [ ] Milestone/data coverage appendix renders rollup context or sparse-data notes.
- [ ] Appendix sections are conditionally included without breaking page numbering.
- [ ] Tests cover full, partial, empty, and null appendix data paths.
