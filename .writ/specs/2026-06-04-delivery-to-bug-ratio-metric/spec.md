# Delivery-to-Bug Ratio Metric

> **Status:** Complete
> **Created:** 2026-06-04
> **Owner:** @AdamSellke
> **Origin:** Promoted from issue `.writ/issues/features/2026-06-04-delivery-to-bug-ratio-metric.md`

## Specification Contract (Locked)

**Deliverable:** A delivery-to-bug ratio metric — completed delivery story points converted to
hours ÷ bug hours — surfaced as a RAG-badged tile on each workstream card and as an aggregated
tile in the program top-line summary.

**Must Include:** A single, comparable number expressing delivery output per unit of
bug-fixing effort, derived from already-persisted snapshot fields (no schema migration),
with RAG health treatment where higher = healthier.

**Hardest Constraint:** Unit alignment (points vs. hours) and divide-by-zero — resolved by the
1 SP = 1 hour convention and a "no bugs = healthy" rule.

## Why

Completed story points and bug effort are computed independently today and never compared.
`calculateVelocity` sums completed delivery `storyPoints` (excluding Bug/Spike) and
`calculateOverhead` produces `bugHours`, but no single number expresses how much delivery
output we got per unit of bug-fixing effort. This metric gives the program a comparable,
RAG-coded signal of delivery efficiency relative to bug load.

## 📐 Calculation

- **Numerator:** completed delivery story points — done-like (`Closed`/`Done`/`Resolved`),
  excluding `Bug` and `Spike`. This is the existing `completedPoints` / velocity value.
  Treated as hours via the **1 SP = 1 hour** convention (matches the existing spike-hours
  convention in `calculateOverhead`).
- **Denominator:** `bugHours` — already computed by `calculateOverhead`
  (`completedWork ?? originalEstimate ?? 0`, summed over `type === 'Bug'`).
- **Ratio = completedPoints ÷ bugHours.**

### Windowing (locked decision)

The card and program tiles use a **rolling-window, sum-then-divide** aggregation:

```
ratio = Σ(completedPoints over window) ÷ Σ(bugHours over window)
```

- **Workstream card:** Σ over the 4-sprint rolling window for that workstream. This is
  consistent with how the Velocity and Velocity Rate tiles de-emphasize mid-sprint partials
  for the in-flight current sprint.
- **Program top-line:** Σ over all in-scope workstreams (and the window) ÷ Σ bug hours.
  Never average per-stream ratios (avoids small-denominator skew).

## 📋 Business Rules

| Condition | Display | RAG |
|---|---|---|
| `bugHours > 0` | ratio to 2 decimals (e.g. `3.50`) | by threshold (below) |
| `bugHours = 0` AND `completedPoints > 0` | `—` | **Green** (zero bug burden is healthy) |
| `bugHours = 0` AND `completedPoints = 0` | `—` | none (null) — nothing to assess |
| no snapshot data | `N/A` | none (null) |

**RAG thresholds** (new seeded `deliveryToBugRatio` `ThresholdConfig` row, higher = healthier):

| Color | Range (delivery-hours per bug-hour) |
|---|---|
| Green | ≥ 4 |
| Amber | 2 – 3.99 |
| Red | < 2 |

Implemented with the existing range-based `assignRag`: `greenMin = 4`, `greenMax` = large
sentinel (e.g. `999999`), `amberMin = 2`, `amberMax = 3.99`, anything below → Red. The
zero-bug-hours "healthy" case is handled by a small wrapper that returns `Green` before
delegating to `assignRag`.

## 🎯 Experience Design

- **Entry point:** the metric is always visible — no interaction required. It appears as a new
  tile in the existing metric list on each workstream card and in the program summary tiles.
- **Workstream card tile:** label **"Delivery/Bug"**, value formatted to 2 decimals, a
  `RagBadge`, and a `MetricDefinitionHint` tooltip (definition + calculation + RAG explanation).
  Placed adjacent to the existing "Velocity Rate" tile.
- **Program top-line tile:** label **"Avg Total Delivery/Bug"**, value to 2 decimals, RAG badge,
  tooltip. Placed in the program metric tile row alongside "Avg Total Velocity Rate".
- **Moment of truth:** a reader scans the card/top-line and immediately sees whether delivery
  output is healthy relative to bug load (Green) or being eroded by bugs (Red).
- **Feedback model:** none new — the tile re-renders with the rest of the dashboard on load and
  on sprint/scope changes.
- **Error / empty:** inherits existing handling. Missing data → `N/A`; zero bugs → `—` per the
  business rules table. No new loading or error states.

## ⚙️ Implementation Approach

Mirror the **`velocityRate` precedent**: a derived ratio computed on-the-fly from
already-persisted `MetricSnapshot` fields (`completedPoints`, `bugHours`). No DB migration for
the metric value; the only persisted addition is one seeded `ThresholdConfig` row.

1. **Calculation (pure):** add `calculateDeliveryToBugRatio(completedPoints, bugHours)` and a
   `assignDeliveryToBugRag(...)` wrapper in `lib/metrics`. Sum-then-divide aggregation happens
   in `buildTrendSeries` (workstream + program) the same way `velocityRate`/`averageVelocityRate`
   are computed.
2. **Threshold seed:** add a `deliveryToBugRatio` entry to `thresholdConfigs` in `prisma/seed.ts`
   (idempotent upsert by `metricName`).
3. **API surface:** extend `app/api/metrics/route.ts` to expose the workstream ratio (on the
   `prediction`/metrics shape) and the program aggregate, plus the RAG color, using the new
   helpers and threshold rows already fetched in the route.
4. **View model:** in `lib/dashboard/adapter.ts`, insert the "Delivery/Bug" tile on each
   workstream card and the "Avg Total Delivery/Bug" tile in the program tiles, with formatting and
   RAG mapping.
5. **UI:** `WorkstreamHealthCard.tsx` already renders the metric list generically — the new tile
   flows through with its `RagBadge` and `MetricDefinitionHint`. Add the `deliveryToBugRatio`
   `MetricId` + copy in `lib/metrics/definitions.ts`.
6. **Tests:** unit tests for the calc + RAG (including divide-by-zero cases), adapter mapping,
   route surface, and definitions registry.

## Detailed Requirements

- The numerator MUST reuse the existing done-like, Bug/Spike-excluded completed-points value —
  do not introduce a second definition of "completed points".
- The denominator MUST reuse the existing `bugHours` derivation so it stays consistent with the
  Overhead breakdown.
- Aggregation (both card-window and program) MUST sum numerators and denominators independently,
  then divide once.
- RAG direction MUST be "higher is healthier"; the seeded threshold and any tooltip copy MUST
  reflect this (contrast with Overhead, where lower is better).
- The feature MUST NOT require a Prisma migration. If implementation reveals that on-the-fly
  derivation is infeasible (it should not be, given `completedPoints` and `bugHours` are
  persisted), stop and raise it rather than silently adding a column.

## Scope Boundaries

- **Included:** ratio calculation (pure fn), RAG wrapper, seeded threshold, API derivation +
  aggregation, two tiles (card + program), metric definition/tooltip copy, tests.
- **Excluded:** a per-sprint trend chart for the ratio, PowerPoint/slides export, any DB
  migration, a configurable-thresholds UI.

## Success Criteria

1. Both tiles render the correct ratio for populated data, matching hand-computed
   Σ-points ÷ Σ-bug-hours at the window and program levels.
2. `bugHours = 0` with delivery > 0 → `—` + Green; `0/0` → `—` + no RAG; no data → `N/A`.
3. RAG colors match the seeded `deliveryToBugRatio` thresholds (Green ≥ 4, Amber 2–3.99, Red < 2).
4. New calculation/RAG logic has ≥ 80% unit coverage (100% on the divide-by-zero paths); the full
   existing test suite still passes.

## ⚠️ Cross-Spec Overlap

- **`2026-06-04-prev-sprint-tabs-full-rolling-window`** (in progress, uncommitted) modifies the
  same files: `app/api/metrics/route.ts`, `lib/metrics/trend-service.ts`, and
  `components/Dashboard/*`. The changes are **additive and non-conflicting** — that spec changes
  windowing/burndown semantics; this one adds a new derived metric — but they touch overlapping
  regions. **Recommendation:** sequence this spec *after* that one merges, or plan for a small
  manual merge in `trend-service.ts` and `route.ts`.

## References

- Issue: `.writ/issues/features/2026-06-04-delivery-to-bug-ratio-metric.md`
- Precedent: `velocityRate` in `lib/metrics/trend-service.ts` (`calculateVelocityRate`,
  `buildTrendSeries`, `averageVelocityRate`)
- Calculators: `lib/metrics/calculators.ts` (`calculateVelocity`, `calculateOverhead`)
- RAG: `lib/metrics/rag.ts` (`assignRag`), thresholds in `prisma/seed.ts`
- Tooltips: `lib/metrics/definitions.ts`
