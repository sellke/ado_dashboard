# Story 1: Metric Definitions Registry

> **Status:** Complete
> **Priority:** High
> **Dependencies:** None
> **Spec:** `.writ/specs/2026-05-18-metric-definition-tooltips/spec.md`

---

## User Story

**As a** developer wiring dashboard metric tooltips,
**I want** a single registry of metric definitions and RAG explanations keyed by stable `MetricId` values,
**So that** tooltip copy stays accurate across program and workstream surfaces and can be attached to tiles without duplicating strings in UI components.

---

## Acceptance Criteria

- [ ] **Given** `lib/metrics/definitions.ts` exports `MetricId`, `METRIC_DEFINITIONS`, `getMetricTooltip()`, and `getRagTooltip()`,
      **when** each in-scope `MetricId` is requested,
      **then** `getMetricTooltip()` returns a multiline body with `Definition:` and `Calculation:` lines whose formulas match `calculators.ts`, `aggregator.ts`, `rolling.ts`, and `trend-service.ts` (Done-like states, Bug/Spike exclusions, 4-sprint rolling window, program sum vs weighted averages, velocity rate denominator).

- [ ] **Given** metrics with RAG badges (`velocity`, `overheadPercent`, `carryOverRate`),
      **when** `getRagTooltip(id)` is called,
      **then** it returns threshold copy aligned with `rag.ts` and seeded `ThresholdConfig` defaults in `prisma/seed.ts` (velocity trend: ≥100% / 70–99% / &lt;70% of rolling avg; overhead: 0–30 / 30.01–45 / &gt;45%; carry-over: 0–10 / 10.01–25 / &gt;25%), and returns `null` for `velocityRate` and chart IDs.

- [ ] **Given** `MetricTileViewModel` includes optional `metricId?: MetricId`,
      **when** `lib/dashboard/adapter.ts` builds program summary tiles,
      **then** all four program tiles (`Avg Total Velocity`, `Avg Total Velocity Rate`, `Avg Total Overhead %`, `Avg Total Carry-Over %`) include the correct `metricId` (`velocity`, `velocityRate`, `overheadPercent`, `carryOverRate`).

- [ ] **Given** the adapter builds workstream health card metrics (including velocity override to `Avg Velocity` and inserted `Velocity Rate` row),
      **when** workstream tiles are mapped,
      **then** all four workstream metric rows (`Avg Velocity`, `Velocity Rate`, `Overhead %`, `Carry-Over %`) include the matching `metricId` values.

- [ ] **Given** unit tests in `__tests__/lib/metrics/definitions.test.ts` and adapter metric-ID coverage,
      **when** the test suite runs,
      **then** registry helpers, seed-threshold alignment, and all eight tile `metricId` assignments pass with no TypeScript errors.

---

## Implementation Tasks

- [ ] **1.1** Write `__tests__/lib/metrics/definitions.test.ts` first: assert every `MetricId` has `definition` and `calculation`; `getMetricTooltip()` format; `getRagTooltip()` null/non-null per ID; overhead/carry-over ranges match `prisma/seed.ts` (`overheadPercent` 0–30 / 30.01–45 / &gt;45.01; `carryOverRate` 0–10 / 10.01–25 / &gt;25.01).
- [ ] **1.2** Write or extend adapter tests (e.g. `__tests__/lib/dashboard/adapter-metric-ids.test.ts`) asserting `metricId` on all eight program/workstream tiles from a representative API fixture.
- [ ] **1.3** Create `lib/metrics/definitions.ts` with `MetricId` union, `METRIC_DEFINITIONS` map (`definition`, `calculation`, optional `ragExplanation`), `getMetricTooltip()`, and `getRagTooltip()` — scope-qualified calculation text for program vs workstream velocity/overhead/carry-over where labels differ.
- [ ] **1.4** Extend `MetricTileViewModel` in `lib/dashboard/types.ts` with optional `metricId?: MetricId` (import type from definitions).
- [ ] **1.5** Wire `metricId` in `lib/dashboard/adapter.ts` for program `programMetrics` array (four tiles) and workstream `metrics` rows (four tiles after velocity override and velocity-rate splice).
- [ ] **1.6** Add a central label→`metricId` map or inline assignments in adapter so program label aliases (`Avg Total *`) and workstream labels (`Avg Velocity`, etc.) resolve to shared IDs per technical spec.
- [ ] **1.7** Run targeted tests (`definitions`, adapter metric IDs) and `tsc --noEmit`; no dashboard UI or `RagBadge` changes in this story.

---

## Technical Notes

- Registry is **static copy** describing current hardcoded behavior — not loaded from `ThresholdConfig` at runtime (future metric-config UI may supersede).
- **Velocity** (`calculateVelocity`): sum story points for Done-like items (Closed, Done, Resolved); Bug and Spike excluded. Workstream tile displays **rolling average** (`velocity.avg`, 4 prior sprints, current excluded per `rolling.ts` / `snapshot.ts`); program tile uses **sum** of workstream velocities (`aggregateToProgram`).
- **Velocity rate** (`calculateVelocityRate` in `trend-service.ts`): `doneLikeStoryPoints / netCapacityHours` where net capacity = grossHours − overheadHours. Program tile shows average across workstreams (`averageVelocityRate` on API).
- **Overhead %** (`calculateOverhead`): `(ceremony + bug + spike + support hours) / grossHours × 100`. Program: **weighted average** by planned points (`aggregator.ts`). RAG via `assignRag(..., 'overheadPercent', thresholds)`.
- **Carry-over %** (`calculateCarryOver`): `carryOverPoints / plannedPoints × 100`; Bug/Spike excluded from point plan. Program: weighted by planned points. RAG via `assignRag(..., 'carryOverRate', thresholds)`.
- **Velocity RAG** (`assignVelocityRag`): ratio vs rolling average — Green ≥ 1.0, Amber 0.7–0.99, Red &lt; 0.7; special case `rollingAvg === 0`.
- Chart metric IDs (`chartVelocity`, `chartBugBurndown`) belong in the registry for Story 3/4 but are **not** wired on tiles in this story.
- `getMetricTooltip` should format consistently for downstream Mantine `Tooltip` (multiline `Definition:` / `Calculation:` prefix lines per technical spec).

---

## Definition of Done

- [ ] `lib/metrics/definitions.ts` exists with full `MetricId` coverage and helpers.
- [ ] `MetricTileViewModel.metricId` is optional and set on all eight program/workstream metric tiles in the adapter.
- [ ] Unit tests lock registry shape, RAG copy vs seed thresholds, and adapter `metricId` mapping.
- [ ] No UI component changes (`MetricDefinitionHint`, `RagBadge`, `ProgramSummarySection`, `WorkstreamHealthCard`) in this story.
- [ ] TypeScript clean; new tests pass.

---

## Context for Agents

- **Contract summary:** `spec.md` → Contract Summary (Deliverable, Must Include, Hardest Constraint), Business Rules → Formula alignment and RAG tooltip rules, Detailed Requirements §1 (Metric definitions registry) and §2 (View model extension).
- **Registry shape and IDs:** `sub-specs/technical-spec.md` → Metric ID Registry, Registry shape (proposed), Copy Reference (implementation baseline).
- **View model:** `sub-specs/technical-spec.md` → View Model Change; `lib/dashboard/types.ts` → `MetricTileViewModel`.
- **Adapter wiring:** `lib/dashboard/adapter.ts` → `programMetrics` block (~lines 485–518), workstream `METRIC_LABELS` map + velocity override (`Avg Velocity`) + `Velocity Rate` splice (~lines 524–551).
- **Formula sources:** `lib/metrics/calculators.ts` (velocity, overhead, carry-over), `lib/metrics/aggregator.ts` (program sum/weighted averages), `lib/metrics/rolling.ts` (4-sprint averages), `lib/metrics/rag.ts` (threshold and velocity trend RAG), `lib/metrics/trend-service.ts` (`calculateVelocityRate`, bug burndown states for later chart copy).
- **Threshold defaults:** `prisma/seed.ts` → `overheadPercent` and `carryOverRate` `ThresholdConfig` rows (must match `ragExplanation` strings).
- **Error & rescue map:** `sub-specs/technical-spec.md` → Error & Rescue Map (unknown `metricId` → no icon in later stories; adapter label alias mismatch → central map + unit tests); Shadow Paths → metric hint nil/empty cases.
- **Out of scope this story:** `MetricDefinitionHint`, `RagBadge` tooltip wrapper, chart header integration, Storybook — Stories 2–4.
- **Test files (expected):** `__tests__/lib/metrics/definitions.test.ts`, `__tests__/lib/dashboard/adapter-metric-ids.test.ts` (or extend `__tests__/lib/dashboard/adapter.test.ts`).
- **Cross-spec:** Future `metric-calculation-config-ui` may require dynamic thresholds; keep registry API swappable (`getRagTooltip` reading static copy for now).
