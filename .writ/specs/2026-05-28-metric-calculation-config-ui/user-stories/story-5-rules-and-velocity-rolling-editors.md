# Story 5 — Inclusion rules + velocity/rolling editors (Phase 2+3 UI)

> **Status:** Not Started
> **Priority:** Medium
> **Dependencies:** Story 2, Story 4

## User Story

As a **dashboard user**, I want **to edit which work-item types count toward each metric
and tune the velocity RAG cutoffs and rolling window**, so that **I can fully control the
calculation rules from the UI**.

## Acceptance Criteria

1. **Given** the **Inclusion Rules** tab, **when** I toggle a work-item type for a category
   and Save, **then** it persists via `PUT /api/metric-config/rules`.
2. **Given** the **Velocity & Rolling** tab, **when** I set green/amber floors and the
   rolling window and Save, **then** they persist via `PUT /api/metric-config/engine`.
3. **Given** `velocityAmberFloor > velocityGreenFloor` or window `< 1`, **when** I Save,
   **then** inline validation blocks it.
4. **Given** valid saves, **when** I trigger a recompute (Story 6) or next sync, **then**
   metrics reflect the new rules/cutoffs.

## Implementation Tasks

- [ ] Write component tests for both tabs (toggle/edit, Save, validation)
- [ ] Build the **Inclusion Rules** tab: matrix of category × work-item type checkboxes
- [ ] Build the **Velocity & Rolling** tab: green floor, amber floor, rolling window inputs
- [ ] Wire both tabs to their PUT endpoints + shared validation
- [ ] Show which defaults map to current behavior (helper text) to reduce accidental drift
- [ ] Verify a non-default edit changes engine output (integration with Story 2 refactor)

## Technical Notes

See `sub-specs/technical-spec.md` and `database-schema.md`. The inclusion matrix maps to
`MetricRuleConfig` rows; helper text should clarify that overhead per-type hour formulas
are fixed (only inclusion is toggled).

## Definition of Done

- [ ] Both tabs functional, persist, and validate
- [ ] Helper text documents default = current behavior
- [ ] Edits demonstrably change engine output
- [ ] ≥80% coverage on new component code

## Context for Agents

- Category × type matrix defaults are in `sub-specs/database-schema.md`.
- Velocity cutoff/rolling semantics: `ratio >= greenFloor → Green; >= amberFloor → Amber`.
- Reuse the panel shell + validators from Story 4 / Story 3.
