# Story 4: Tests and Storybook Coverage

> **Status:** Complete
> **Priority:** Normal
> **Dependencies:** Story 3
> **Spec:** `.writ/specs/2026-05-18-metric-definition-tooltips/spec.md`

---

## User Story

**As a** developer maintaining dashboard metric tooltips,
**I want** focused unit tests, component tests, and Storybook stories for the definitions registry, adapter metric IDs, and hint/RAG tooltip components,
**So that** copy structure, label mapping, and interaction behavior stay correct as metrics and dashboard surfaces evolve.

---

## Acceptance Criteria

- [ ] Given every `MetricId` in `METRIC_DEFINITIONS`, when `getMetricTooltip()` and `getRagTooltip()` are called, then output includes expected Definition and Calculation lines (and RAG thresholds where applicable) with 100% registry coverage.
- [ ] Given program and workstream tiles built by `lib/dashboard/adapter.ts`, when metric view models are produced, then each in-scope label maps to the expected `metricId` (velocity, velocityRate, overheadPercent, carryOverRate) with no alias mismatches.
- [ ] Given `MetricDefinitionHint` renders with a valid `metricId`, when the user hovers or keyboard-focuses the info icon, then the Mantine tooltip shows the formatted definition/calculation copy and the icon exposes a descriptive `aria-label`.
- [ ] Given `RagBadge` receives a non-null `rag` and `ragTooltip`, when the user hovers or focuses the badge, then the RAG explanation tooltip appears; when `ragTooltip` is null or `rag` is null, then no RAG tooltip wrapper is rendered.
- [ ] Given Storybook stories for metric hint variants, when each story is opened, then all six metric IDs (`velocity`, `velocityRate`, `overheadPercent`, `carryOverRate`, `chartVelocity`, `chartBugBurndown`) are visually reviewable with representative labels and tooltip copy.

---

## Implementation Tasks

- [ ] **4.1** Add `__tests__/lib/metrics/definitions.test.ts` covering all `MetricId` values, `getMetricTooltip()` multiline format (`Definition:` / `Calculation:` prefixes), `getRagTooltip()` presence for RAG metrics and null for non-RAG metrics, and threshold copy alignment with seeded defaults.
- [ ] **4.2** Extend or add adapter tests (e.g. `__tests__/lib/dashboard/adapter.test.ts` or `adapter-metric-ids.test.ts`) asserting program tile labels (`Avg Total Velocity`, etc.) and workstream tile labels (`Avg Velocity`, etc.) receive the correct `metricId` for every in-scope metric row.
- [ ] **4.3** Add `__tests__/components/Dashboard/MetricDefinitionHint.test.tsx` covering render with valid id, null render for unknown id, tooltip visibility on hover/focus, and `aria-label` text derived from the label prop.
- [ ] **4.4** Extend `__tests__/components/Dashboard/RagBadge.test.tsx` (or add if missing) covering badge-only render when `ragTooltip` is absent, tooltip wrapper when `ragTooltip` is set, hover/focus tooltip paths, and unchanged behavior when `rag` is null.
- [ ] **4.5** Create `components/Dashboard/MetricDefinitionHint.story.tsx` with one story per metric variant (program and workstream label aliases where useful) plus a combined gallery story for quick visual review.
- [ ] **4.6** Update existing dashboard Storybook stories (`ProgramSummarySection.story.tsx`, `WorkstreamHealthCard.story.tsx`, `RagBadge.story.tsx` as applicable) so integrated surfaces show info icons and RAG tooltip affordances alongside populated metric data.
- [ ] **4.7** Run focused Jest suites for definitions, adapter metric IDs, and tooltip components; fix any gaps Stories 1–3 left uncovered without expanding product scope beyond static copy and hybrid interaction rules.

---

## Technical Notes

- This story is regression-hardening only. Prefer tests and Storybook over implementation changes; tighten Stories 1–3 only when tests expose real contract gaps.
- Coverage targets: **100%** for `lib/metrics/definitions.ts` helpers and registry entries; **focus/hover paths** for `MetricDefinitionHint` and `RagBadge`; **all in-scope metric IDs** in adapter mapping tests.
- Use the existing Jest and Testing Library stack (`@testing-library/react`, `userEvent` for hover/focus). Follow patterns in `__tests__/components/Dashboard/RagBadge.test.tsx` and other Dashboard component suites.
- Include a lightweight assertion that overhead and carry-over `ragExplanation` strings match seeded `ThresholdConfig` defaults in `prisma/seed.ts` to catch copy drift.
- Program vs workstream velocity scope qualifiers belong in registry copy tests — verify calculation text reflects the correct aggregation context, not just shared `MetricId`.
- Storybook stories document tooltip copy for reviewers; they are not a substitute for component interaction tests.

---

## Context for Agents

- **Parent contract:** `spec.md` → Contract Summary (Deliverable, Hardest Constraint), Business Rules (formula alignment, RAG rules, accessibility), Detailed Requirements item 5 (Tests), and Success Criteria.
- **Coverage requirements:** `spec-lite.md` → For Testing Agents → Success Criteria, Coverage Requirements, and Test Strategy.
- **Registry contract:** `sub-specs/technical-spec.md` → Metric ID Registry, Registry shape, Copy Reference, and Test Files (expected).
- **Component behavior:** `sub-specs/technical-spec.md` → UI Components (`MetricDefinitionHint`, `RagBadge` extension), Error & Rescue Map, Shadow Paths, and Interaction Edge Cases (keyboard focus, independent badge vs icon tooltips).
- **Adapter wiring:** `sub-specs/technical-spec.md` → View Model Change and Integration Points; `lib/dashboard/adapter.ts` is the authoritative label→`metricId` mapping surface.
- **Story dependency:** Story 3 wires hints into `ProgramSummarySection.tsx` and `WorkstreamHealthCard.tsx`; this story validates that integration without re-implementing UI wiring.
- **Relevant code:** `lib/metrics/definitions.ts`, `lib/dashboard/adapter.ts`, `lib/dashboard/types.ts`, `components/Dashboard/MetricDefinitionHint.tsx`, `components/Dashboard/RagBadge.tsx`, `prisma/seed.ts` (threshold defaults).
- **Out of scope:** Recharts data-point tooltips, milestone/sprint tab tooltips, dynamic threshold API loading, PowerPoint export layout changes.

---

## Definition of Done

- [ ] `definitions.test.ts` achieves 100% coverage of registry helpers and all six `MetricId` entries.
- [ ] Adapter tests prove every in-scope program and workstream tile label maps to the expected `metricId`.
- [ ] `MetricDefinitionHint` and `RagBadge` component tests cover hover and keyboard-focus tooltip paths plus defensive null/unknown behavior.
- [ ] Storybook includes hint variants for all metric IDs and updated integrated dashboard stories where applicable.
- [ ] Focused Jest suites pass; no TypeScript errors introduced by test additions.
- [ ] Intentionally deferred edge cases (e.g. export static capture, portal overflow) are documented if not automated.
