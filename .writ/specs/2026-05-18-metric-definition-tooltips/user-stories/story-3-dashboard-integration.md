# Story 3: Dashboard Integration

> **Status:** Complete
> **Priority:** High
> **Dependencies:** Story 2
> **Spec:** `.writ/specs/2026-05-18-metric-definition-tooltips/spec.md`

---

## User Story

**As a** dashboard user reviewing program and workstream metrics,
**I want** definition tooltips on metric labels and chart headers plus RAG explanations on workstream badges,
**So that** I can understand what each displayed number means and how it is calculated without reading source code.

---

## Acceptance Criteria

- [ ] Given program summary tiles are rendered with `metricId` on each `programMetrics` entry, when the user hovers or keyboard-focuses the info icon beside a tile label, then a multiline tooltip shows the definition and calculation for that metric (all four program tiles: Avg Total Velocity, Avg Total Velocity Rate, Avg Total Overhead %, Avg Total Carry-Over %).
- [ ] Given the program sprint trend section is visible, when the user hovers or focuses the info icon beside the `Velocity (Points)` or `Bug Burndown` chart header, then tooltips use `chartVelocity` and `chartBugBurndown` metric IDs respectively.
- [ ] Given a workstream health card with four metric rows, when each row renders, then an info icon beside the label exposes the matching definition tooltip via `MetricDefinitionHint` and `metricId` from the view model.
- [ ] Given an expanded workstream card with velocity and bug burndown chart sections, when chart headers render, then the same `chartVelocity` and `chartBugBurndown` hints appear beside those titles.
- [ ] Given a workstream metric row with `rag !== null` and a known `metricId`, when the user hovers or focuses the RAG badge, then a tooltip shows RAG threshold copy from `getRagTooltip(metricId)`; rows with `rag === null` or missing `metricId` remain unchanged.
- [ ] Given program summary metric tiles with `rag !== null` and a known `metricId`, when the user hovers or focuses the program tile RAG badge, then the same `getRagTooltip(metricId)` copy appears.

---

## Implementation Tasks

- [ ] **3.1** Write or extend `__tests__/components/Dashboard/ProgramSummarySection.test.tsx` to assert info icons render for all four program tiles and both chart headers, and that focus/hover exposes tooltip content when `metricId` is present on fixtures.
- [ ] **3.2** Update `components/Dashboard/ProgramSummarySection.tsx`: import `MetricDefinitionHint` and `getRagTooltip`; add hints beside each program tile label (using `m.metricId` when set); pass `ragTooltip={m.metricId ? getRagTooltip(m.metricId) : null}` to `RagBadge` on program tiles where `rag !== null`; add hints beside `Velocity (Points)` and `Bug Burndown` headers with hardcoded `chartVelocity` / `chartBugBurndown` IDs.
- [ ] **3.3** Write or extend `__tests__/components/Dashboard/WorkstreamHealthCard.test.tsx` for metric-row hints, expanded chart-header hints, and RAG badge tooltips driven by `getRagTooltip`.
- [ ] **3.4** Update `components/Dashboard/WorkstreamHealthCard.tsx`: import `MetricDefinitionHint` and `getRagTooltip`; place hints beside each metric row label; add chart-header hints for `Velocity (Points)` and `Bug Burndown` in the expanded detail block.
- [ ] **3.5** Pass `ragTooltip={m.metricId ? getRagTooltip(m.metricId) : null}` to `RagBadge` on workstream metric rows; preserve existing badge rendering when `rag` is null.
- [ ] **3.6** Update `ProgramSummarySection.story.tsx` and `WorkstreamHealthCard.story.tsx` so Storybook demonstrates tooltip affordances on populated fixtures.
- [ ] **3.7** Verify focused component tests pass; confirm tile/card layout is unchanged aside from inline info icons and that cards retain `overflow: 'visible'` where needed for tooltip portals.

---

## Technical Notes

- This story consumes Story 2 deliverables only — do not reimplement registry copy, `MetricDefinitionHint`, or `RagBadge` tooltip wrapping here.
- Program tile hints depend on `metricId` populated by Story 2 adapter work; chart headers use stable hardcoded IDs because header text is static in the component.
- Workstream cards override displayed metric values when a non-current sprint tab is active (`displayMetrics` memo); hints attach to labels and should not change when values switch to trend-sprint overrides.
- Import `getRagTooltip` from `lib/metrics/definitions.ts` in both `ProgramSummarySection.tsx` and `WorkstreamHealthCard.tsx`; pass `ragTooltip` to `RagBadge` wherever `rag !== null` and `metricId` is known.
- Use inline `Group` layout beside existing uppercase label `Text` elements; match Mantine tooltip props from Story 2 (`multiline`, `maw={360}`, `withArrow`, `openDelay={300}`).
- N/A metric values still show hints — copy should explain when N/A occurs per registry entries from Story 1.

---

## Context for Agents

- **Parent contract:** `spec.md` → Contract Summary, Experience Design (entry points, happy path, feedback model), Business Rules (metric coverage, RAG rules, accessibility), Detailed Requirements item 4, Success Criteria items 1–2 and 5.
- **Integration plan:** `sub-specs/technical-spec.md` → Integration Points → `ProgramSummarySection` and `WorkstreamHealthCard`; UI Components → `MetricDefinitionHint` and `RagBadge` extension.
- **Metric IDs:** `sub-specs/technical-spec.md` → Metric ID Registry table — program labels map to `velocity`, `velocityRate`, `overheadPercent`, `carryOverRate`; chart headers use `chartVelocity` and `chartBugBurndown`.
- **Shadow paths:** `sub-specs/technical-spec.md` → Shadow Paths rows for program tile, workstream row, metric hint, and RAG badge tooltip flows.
- **Interaction edge cases:** `sub-specs/technical-spec.md` → Interaction Edge Cases — keyboard tab order, independent row hint vs RAG badge tooltips, collapsed vs expanded card overflow.
- **Prerequisite stories:** Story 1 (`lib/metrics/definitions.ts`), Story 2 (`MetricDefinitionHint`, `RagBadge`, adapter `metricId` on `MetricTileViewModel`).
- **Relevant code:** `components/Dashboard/ProgramSummarySection.tsx`, `components/Dashboard/WorkstreamHealthCard.tsx`, `lib/dashboard/types.ts`, `lib/dashboard/adapter.ts`, `components/Dashboard/MetricDefinitionHint.tsx`, `components/Dashboard/RagBadge.tsx`.
- **Test fixtures:** `__tests__/components/Dashboard/__fixtures__/dashboard-fixtures.ts` — ensure program and workstream tile fixtures include `metricId` after Story 2.

---

## Definition of Done

- [ ] All four program summary metric tiles expose definition tooltips via info icons on hover and keyboard focus.
- [ ] Program summary `Velocity (Points)` and `Bug Burndown` chart headers expose definition tooltips.
- [ ] All four workstream metric rows and both expanded chart headers expose definition tooltips.
- [ ] Program and workstream RAG badges on velocity, overhead %, and carry-over % show `getRagTooltip` copy when `rag !== null`.
- [ ] Component tests cover program and workstream integration paths; Storybook stories updated for visual review.
- [ ] No layout regression beyond added inline info icons; existing empty, loading, and N/A states unchanged.
