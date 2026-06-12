# Story 5 — Inclusion rules + velocity/rolling editors (Phase 2+3 UI)

> **Status:** Completed ✅
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

- [x] Write component tests for both tabs (toggle/edit, Save, validation)
- [x] Build the **Inclusion Rules** tab: matrix of category × work-item type checkboxes
- [x] Build the **Velocity & Rolling** tab: green floor, amber floor, rolling window inputs
- [x] Wire both tabs to their PUT endpoints + shared validation
- [x] Show which defaults map to current behavior (helper text) to reduce accidental drift
- [x] Verify a non-default edit changes engine output (integration with Story 2 refactor)

## Technical Notes

See `sub-specs/technical-spec.md` and `database-schema.md`. The inclusion matrix maps to
`MetricRuleConfig` rows; helper text should clarify that overhead per-type hour formulas
are fixed (only inclusion is toggled).

## Definition of Done

- [x] Both tabs functional, persist, and validate
- [x] Helper text documents default = current behavior
- [x] Edits demonstrably change engine output
- [x] ≥80% coverage on new component code

## Verification

- `pnpm exec jest __tests__/components/Dashboard/MetricConfigPanel.test.tsx __tests__/app/api/metrics/route.test.ts --runInBand`
- `pnpm exec jest __tests__/lib/metrics/rag.test.ts __tests__/lib/metrics/trend-service.test.ts --runInBand`

## Change Log

- Added Inclusion Rules editing with accessible category/type toggles and persistence through `PUT /api/metric-config/rules`.
- Added Velocity & Rolling editing with inline validation and persistence through `PUT /api/metric-config/engine`.
- Documented current-behavior defaults in the UI to avoid accidental calculation drift.

## Context for Agents

- Category × type matrix defaults are in `sub-specs/database-schema.md`.
- Velocity cutoff/rolling semantics: `ratio >= greenFloor → Green; >= amberFloor → Amber`.
- Reuse the panel shell + validators from Story 4 / Story 3.
