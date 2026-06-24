# Story 4: Show Cycle Time on the Dashboard

> **Status:** Completed ✅
> **Priority:** Medium
> **Dependencies:** Story 3

## User Story

As a program stakeholder, I want program-level and workstream-level cycle-time summaries on the dashboard so that I can see whether stories, spikes, or bugs are flowing slowly.

## Acceptance Criteria

- Given cycle-time data exists, when the dashboard loads, then program-level total and average cycle time appear by User Story, Spike, and Bug.
- Given workstream cycle-time data exists, when a workstream card renders, then it shows the same by-type breakdown for that workstream.
- Given no available completed items exist for a type, when the UI renders, then it shows `N/A` or equivalent empty formatting instead of `0` average.
- Given unavailable lifecycle data exists, when cycle-time metrics render, then the unavailable count is visible near the affected type or scope.
- Given metrics fetch fails, when the dashboard renders, then existing dashboard error behavior remains unchanged.

## Implementation Tasks

- [x] Extend dashboard API/view-model types with cycle-time program and workstream data.
- [x] Map raw API cycle-time payloads in `lib/dashboard/adapter.ts`.
- [x] Add or extend dashboard components for program-level cycle-time summary.
- [x] Add per-workstream cycle-time breakdown in `WorkstreamHealthCard` or a focused child component.
- [x] Add metric definition or tooltip copy explaining business-day cycle time and unavailable counts.
- [x] Add adapter and component tests for populated, empty, and unavailable-data states.
- [x] Review visual consistency against existing metric tiles, cards, badges, and tooltips.

## Technical Notes

- Follow existing Mantine dashboard patterns: `Card`, `Stack`, `Group`, `Text`, `Badge`, and tooltip helpers.
- The UI should compare types clearly without requiring a new chart type in v1.
- Use existing loading and error states from the dashboard shell rather than adding separate fetch lifecycles.

## Definition of Done

- [x] Program summary includes cycle-time breakdown.
- [x] Workstream cards include cycle-time breakdown.
- [x] `N/A` and unavailable counts render correctly.
- [x] Component and adapter tests cover the new presentation.

## Context for Agents

- See `spec.md` -> `### Dashboard UI`.
- Relevant files: `components/Dashboard/ProgramSummarySection.tsx`, `components/Dashboard/WorkstreamHealthCard.tsx`, `lib/dashboard/adapter.ts`, `lib/dashboard/types.ts`.
- Visual reference: match current dashboard card, metric tile, and tooltip patterns; see `mockups/current/README.md`.

---

## What Was Built

**Implementation Date:** 2026-06-15

### Files Created

1. **`components/Dashboard/CycleTimeBreakdown.tsx`**
   - Reusable Mantine card for program and workstream by-type cycle-time breakdowns.

### Files Modified

- **`lib/dashboard/types.ts`**
  - Added API and view-model cycle-time types for program and workstream payloads.
- **`lib/dashboard/adapter.ts`**
  - Maps raw cycle-time API data into formatted labels for totals, averages, completed counts, and unavailable counts.
- **`components/Dashboard/ProgramSummarySection.tsx`**
  - Renders program-level cycle-time breakdown after the existing program metric tiles.
- **`components/Dashboard/WorkstreamHealthCard.tsx`**
  - Renders per-workstream cycle-time breakdown in the expanded card details.
- **Dashboard tests and fixtures**
  - Covered adapter mapping, program rendering, workstream rendering, `N/A` averages, unavailable badges, and existing shell error/null behavior.

### Implementation Decisions

1. **Reusable presentation block** — Used one `CycleTimeBreakdown` component for program and workstream scopes to keep visual language consistent.
2. **Dedicated cycle-time view model** — Kept grouped by-type cycle-time data separate from RAG metric tiles because it contains totals, averages, counts, and unavailable-data badges.
3. **Backward-compatible rendering** — Workstream cycle-time is optional in the view model so older fixtures/export paths that do not yet include cycle-time data do not crash.

### Test Results

**Verification:** `pnpm run typecheck`; dashboard adapter/component focused suites
- ✅ TypeScript typecheck passed.
- ✅ Story 4 focused dashboard suites passed: 148/148 tests.
- ✅ Post-review adapter polish test passed: 84/84 adapter tests.

### Review Outcome

**Result:** PASS

- **Iteration count:** 1 review iteration
- **Drift:** Low
- **Security:** Low risk
- **Boundary Compliance:** Story 4 changes stayed within dashboard types, adapter, presentation components, fixtures, and focused tests.

### Deviations from Spec

None

## Visual References

> **2026-06-19 design pass:** Tile integration wireframes — refactor nested `CycleTimeBreakdown` card to match sprint metric tile patterns.

- **Primary layout (program):** `../mockups/program-summary-cycle-time-integration.excalidraw` — cycle time as second tile row, no wrapper card
- **Mobile layout:** `../mockups/program-summary-cycle-time-mobile.excalidraw` — 1-column stack matching sprint tiles
- **Workstream card:** `../mockups/workstream-card-cycle-time-integration.excalidraw` — inline rows instead of nested card
- **Component states:** `../mockups/cycle-time-tile-states.excalidraw` — populated, N/A, partial unavailable
- **Design notes:** Cards use 8px border-radius (`radius="md"`), 16px padding (`p="md"`), 16px grid gap (`spacing="md"`); unavailable badge mirrors RAG placement
- **Catalog:** `../mockups/README.md` and `../mockups/component-inventory.md`

### Tile Integration Polish (2026-06-19)

Refactored `CycleTimeBreakdown` with `variant="tiles"` (program summary) and `variant="rows"` (workstream cards). Program level uses individual metric tiles matching sprint tiles; workstream level uses inline rows with divider instead of nested card.
