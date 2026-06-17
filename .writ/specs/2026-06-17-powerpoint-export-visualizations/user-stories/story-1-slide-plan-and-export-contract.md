# Story 1: Slide Plan and Export Contract

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** None

## User Story

As a dashboard exporter, I want the PowerPoint deck generated from an explicit slide plan and export visualization contract so that new layered sections can be added without breaking slide order, footer counts, or existing export behavior.

## Acceptance Criteria

1. **Given** any scoped workstream count, **when** the export deck is built, **then** the slide plan determines ordered sections and the correct total slide count before slide builders run.
2. **Given** existing dashboard/export input, **when** new visualization fields are absent, **then** the deck still builds with placeholders rather than crashing.
3. **Given** the MDT slide skill and current export code disagree on canvas sizing, **when** implementation starts, **then** the chosen canvas/layout strategy is explicit and consistently applied.
4. **Given** snapshot and appendix slides need metric context, **when** export input is assembled, **then** slide builders receive display-ready values and caveats without recalculating metric rules.

## Implementation Tasks

- [ ] Add tests for slide-plan generation with zero, one, and many workstreams.
- [ ] Define slide descriptor/section types and a slide-plan builder under `lib/export`.
- [ ] Extend `ExportInput` types with optional visualization summary, snapshot, appendix, and caveat fields.
- [ ] Add or update export adapter helpers to map dashboard view models into display-ready export fields.
- [ ] Make and document the export canvas/layout decision in code comments or technical notes.
- [ ] Wire `buildPresentation` to consume the slide plan while preserving existing slide behavior.
- [ ] Verify footer page numbers and total slide count come from the slide plan.

## Technical Notes

- See `sub-specs/technical-spec.md` for the slide-plan shape and layout decision.
- See `sub-specs/api-spec.md` for the additive export data contract.
- Keep old minimal `ExportInput` compatible during the transition.

## Context for Agents

- Read `spec.md` -> `Implementation Approach`.
- Read `sub-specs/technical-spec.md` -> `Proposed Design` and `Error & Rescue Map`.
- Read `lib/export/builder.ts`, `lib/export/types.ts`, `lib/export/slide-frame.ts`, and `lib/export/mdt-theme.ts`.
- Review `.cursor/skills/mdt_slides.md` before changing canvas or theme constants.

## Definition of Done

- [ ] Slide plan exists and is covered by focused tests.
- [ ] Export input accepts new optional visualization fields.
- [ ] Footer/page numbering works for dynamic slide counts.
- [ ] Existing export behavior still compiles and builds.
- [ ] Layout/canvas decision is explicit and not mixed across new slides.
