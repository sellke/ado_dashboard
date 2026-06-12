# Story 3 — Workstream & Program Tiles

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Story 2

## User Story

As a **program lead reading the dashboard**,
I want **a "Delivery/Bug" tile on each workstream card and an "Avg Total Delivery/Bug" tile in the program top-line**,
so that **I can see, at a glance and RAG-coded, how much delivery output we get per unit of bug-fixing effort**.

## Acceptance Criteria

1. **Given** a workstream with a finite ratio, **when** the card renders, **then** a "Delivery/Bug"
   tile shows the value to 2 decimals with the correct `RagBadge` and a `MetricDefinitionHint`.
2. **Given** `bugHours = 0` with delivery > 0, **when** the tile renders, **then** it shows `—` with
   a Green badge; **given** `0/0` or no data, **then** `—` / `N/A` respectively with no badge.
3. **Given** the program summary, **when** it renders, **then** an "Avg Total Delivery/Bug" tile
   appears alongside "Avg Total Velocity Rate" with value + RAG + tooltip.
4. **Given** the definition tooltip, **when** opened, **then** it states the 1 SP = 1 hr convention,
   sum-then-divide aggregation, the `—`-when-no-bugs rule, and the RAG bands (higher = healthier).
5. **Given** the existing tiles, **when** the new tile is added, **then** their values, order
   (aside from the new insertion), and formatting are unchanged.

## Implementation Tasks

- [x] Extend `__tests__/lib/dashboard/adapter.test.ts` for the new card + program tiles (finite,
      zero-bug `—`+Green, `0/0`/no-data, RAG mapping, 2-dp format).
- [x] Extend `__tests__/components/Dashboard/WorkstreamHealthCard.test.tsx` (and program summary
      test) to assert the tile, badge, and definition hint render.
- [x] In `lib/dashboard/adapter.ts`: insert the "Delivery/Bug" workstream tile (next to "Velocity
      Rate") and the "Avg Total Delivery/Bug" program tile, with `metricId: 'deliveryToBugRatio'`,
      `toRagStatus` mapping, and the `—`/`N/A` display rules.
- [x] Add any needed view-model fields to `lib/dashboard/types.ts` (read path matching Story 2's
      carrier field).
- [x] Verify `WorkstreamHealthCard.tsx` renders the new tile generically (RagBadge +
      MetricDefinitionHint via `getRagTooltip('deliveryToBugRatio')`); adjust only if needed.
- [x] Update fixtures (`__tests__/components/Dashboard/__fixtures__/dashboard-fixtures.ts`) to
      include the new fields.
- [x] Run adapter + component test suites; confirm green.

## Technical Notes

- The metric list and program tile row already render generically — prefer threading the tile
  through the existing map rather than special-casing the component.
- Display rule precedence: finite → `value`; `null` + Green RAG → `—`; `null` + no RAG → `N/A`.
- Reuse `formatMetricValue`/existing 2-dp formatting helpers in `adapter.ts`.

## Definition of Done

- [x] New + existing adapter and component tests pass.
- [x] Both tiles render correctly for all Business Rules rows.
- [x] Tooltip copy matches `definitions.ts` (Story 1) and the contract.
- [x] No visual/data regression to existing tiles.

## Context for Agents

- **Precedent:** "Velocity Rate" tile splice + "Avg Total Velocity Rate" program tile in
  `lib/dashboard/adapter.ts`; generic tile render in `components/Dashboard/WorkstreamHealthCard.tsx`.
- **Display rules:** spec.md → ## 📋 Business Rules (display column) + ## 🎯 Experience Design.
- **Tooltip source:** `lib/metrics/definitions.ts` (`deliveryToBugRatio`, added in Story 1).
- **Shadow paths:** technical-spec.md → ## Shadow Paths (WS card tile row).

---

## What Was Built

**Implementation Date:** 2026-06-04

### Files Modified

- **`lib/dashboard/adapter.ts`**
  - Added the workstream "Delivery/Bug" tile and program "Avg Total Delivery/Bug" tile with finite, zero-bug, and missing-data formatting.
- **`lib/dashboard/types.ts`**
  - Reused the Story 2 API fields without adding new view-model shape.
- **Dashboard fixture and component tests**
  - Updated shared fixtures, adapter expectations, metric ID guards, workstream card tests, and program summary tests.

### Implementation Decisions

1. **Generic rendering path preserved** — no structural change was needed in `WorkstreamHealthCard.tsx`; the tile flows through existing `MetricDefinitionHint` and `RagBadge` handling.
2. **Display formatter keeps unit empty** — the ratio displays as a plain comparable number, with `—` reserved for null ratio plus Green zero-bug RAG.

### Test Results

**Verification:** Passed
- `pnpm jest __tests__/lib/dashboard/adapter.test.ts __tests__/lib/dashboard/adapter-metric-ids.test.ts __tests__/components/Dashboard/WorkstreamHealthCard.test.tsx __tests__/components/Dashboard/ProgramSummarySection.test.tsx --runInBand`

### Review Outcome

**Result:** PASS

- **Iteration count:** 1 iteration
- **Drift:** None
- **Security:** Clean
- **Boundary Compliance:** Story 3 changes stayed within dashboard adapter, types, fixtures, and targeted component tests.

### Deviations from Spec

None
