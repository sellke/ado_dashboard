# Metric Calculation Configuration UI

> **Status:** Complete ✅
> **Created:** 2026-05-28
> **Last Refreshed:** 2026-06-11
> **Owner:** @AdamSellke
> **Origin:** Promoted from issue: `.writ/issues/features/2026-04-09-metric-calculation-config-ui.md`

## Specification Contract

**Deliverable:** A database-persisted **Metric Configuration** settings panel in the
dashboard that exposes every parameter feeding the sprint health metrics users see today —
RAG thresholds (including **delivery-to-bug ratio**), work-item-type inclusion/exclusion
rules, velocity RAG cutoffs, and the rolling-average window — editable in-app without code
or environment changes. Seeded defaults exactly reproduce today's hardcoded behavior, so no
metric changes on first deploy.

**Must Include:** All four configurable areas, decomposed into phased stories so the
lowest-risk piece (RAG threshold editing — table already exists) ships first.

**Hardest Constraint:** The metric engine must stay numerically identical to today after
this lands with default config. Velocity cutoffs and the rolling window are currently
baked into pure functions and Prisma queries with **no storage surface** — introducing
config there without drift is the riskiest part.

### 🎯 Experience Design

- **Entry point:** A Settings / gear action in the dashboard header near Export/Sync.
- **Happy path:** Open the Metric Configuration panel → switch to the relevant tab
  (Thresholds / Inclusion Rules / Velocity & Rolling) → edit values → Save → inline
  validation passes → success toast. Optionally click **Recalculate now**.
- **Moment of truth:** After Save + Recalculate, the dashboard RAG badges and metric
  values visibly update to reflect the new configuration.
- **Feedback model:** Mantine notification toast on save; per-field inline validation
  errors; a distinct confirmation when recalculation completes.
- **Error experience:** Validation failures block Save and explain the rule violated
  (e.g. "Green minimum must be ≤ Green maximum"). API/load failures show a recoverable
  panel error; the active configuration is left unchanged.

### 📋 Business Rules

- **Defaults match current behavior.** Seed `MetricEngineConfig`, `MetricRuleConfig`,
  and `ThresholdConfig` so a fresh database reproduces today's exact metric numbers.
- **Validation guardrails (per `ThresholdConfig` row):** `greenMin ≤ greenMax`,
  `amberMin ≤ amberMax`, ranges must not produce undefined-RAG gaps that the existing
  `assignRag` logic would silently drop to Red. **`deliveryToBugRatio` is lower-is-healthier**
  (Green = lowest band); the UI must label direction. The zero-bug healthy case
  (`bugHours === 0` with delivery points > 0 → Green regardless of ratio) stays in
  `assignDeliveryToBugRag` — not configurable.
- **Thresholds tab scope:** expose only **dashboard-visible** threshold metrics:
  `overheadPercent`, `carryOverRate`, and `deliveryToBugRatio`. Other seeded rows
  (`sprintPredictability`, `agingWipDays`, `scopeCreepIndex`, `milestone*`) remain in
  `ThresholdConfig` for future surfaces but are **out of scope** for this panel.
  Velocity RAG is trend-based (Velocity & Rolling tab), not threshold rows.
- **Velocity cutoffs:** Amber floor and Green floor are ratios of the rolling average,
  both `> 0`, with `amberFloor ≤ greenFloor`.
- **Rolling window:** integer `≥ 1` (default 4).
- **Inclusion rules:** per metric category (delivery-point metrics vs overhead-hours),
  a boolean per work-item type controls whether that type counts. Defaults encode the
  current `type !== 'Bug' && type !== 'Spike'` exclusion for point metrics and the
  Bug/Spike/Support → overhead routing.
- **Scope:** configuration is **program-wide**, not per workstream.
- **Permissions:** soft gate only — a dedicated settings surface with a save-confirm
  step. No auth/permission model is built (none exists in the dashboard today).
- **Recalculation:** forward-only by default (changes apply on next compute). An explicit
  **Recalculate now** action re-runs `POST /api/metrics/compute` over snapshots. No
  silent auto-recompute.

**Success Criteria:**

1. A fresh DB seeded with defaults produces byte-for-byte the same metric snapshots as
   the pre-feature code (regression-proven).
2. Editing a threshold / cutoff / rule and recomputing changes the RAG/metric output in
   the expected direction.
3. Every previously hardcoded constant (`!== 'Bug'`, `!== 'Spike'`, `1.0`, `0.7`,
   `take: 4`, `slice(0, 4)` in trend aggregation) is sourced from configuration.

**Scope Boundaries:**

- **Included:** settings UI panel, config read/write APIs, schema + migration + seed,
  refactor of `calculators.ts` / `rag.ts` / `snapshot.ts` / `trend-service.ts` to read
  configuration, and an opt-in recalculation trigger.
- **Excluded:** real auth/permissions, per-workstream config overrides, retroactive
  automatic recomputation, and updating the static tooltip copy in
  `2026-05-18-metric-definition-tooltips` (see dependency below).

### ⚠️ Cross-Spec Overlap (detected)

- **`2026-05-27-dashboard-workstream-config-ui`** (in progress) — also introduces a
  dashboard "config" surface, but browser-local + no DB/auth. This spec is DB-persisted
  and program-wide. **Coordinate the settings entry point / panel shell** so the two
  config surfaces feel consistent rather than competing.
- **`2026-05-18-metric-definition-tooltips`** — encodes formulas and threshold ranges as
  **static copy**. Once thresholds/cutoffs become editable, that copy goes stale.
  Resolving it is **out of scope here** but tracked as an explicit follow-up dependency
  (see Story 6 notes). Do not silently leave drifting numbers.
- **`2026-06-04-delivery-to-bug-ratio-metric`** (Complete) — shipped the
  `deliveryToBugRatio` metric, seeded `ThresholdConfig` row, `assignDeliveryToBugRag`,
  and dashboard tiles. This spec adds **UI/API editing** for that row; no formula rework.

## Detailed Requirements

### Configurable parameters and their current sources

| Parameter | Current (hardcoded) | New storage | Refactor target |
|---|---|---|---|
| RAG thresholds (green/amber min/max per dashboard metric) | `ThresholdConfig` rows (no UI); includes `deliveryToBugRatio` (shipped 2026-06) | `ThresholdConfig` (existing) | `assignRag` / `assignDeliveryToBugRag` already read it; add UI/API |
| Inclusion/exclusion by work-item type | `type !== 'Bug' && type !== 'Spike'` (velocity, predictability, carry-over, delivery-to-bug numerator); Bug/Spike/Support → overhead | new `MetricRuleConfig` | `lib/metrics/calculators.ts`, `trend-service.ts` aggregation inputs |
| Velocity RAG cutoffs | `ratio >= 1.0` Green, `>= 0.7` Amber | new `MetricEngineConfig` | `lib/metrics/rag.ts` → `assignVelocityRag` |
| Rolling-average window | `take: 4` in `snapshot.ts`; `.slice(0, 4)` in `trend-service.ts` | new `MetricEngineConfig` | `snapshot.ts` + `trend-service.ts` |

### Implementation approach

The metric calculators are already pure functions that receive `ThresholdConfigInput[]`
as a parameter — this is the template. The strategy is to **extend the config that flows
into pure functions** rather than reading the DB inside them:

1. Define new config types (`MetricEngineConfigInput`, `MetricRuleConfigInput`) in
   `lib/metrics/types.ts` alongside the existing `ThresholdConfigInput`.
2. Change calculator signatures to accept inclusion rules; change `assignVelocityRag` to
   accept cutoff ratios; thread a rolling-window value into the `snapshot.ts` query.
3. Provide **default config constants** (encoding today's behavior) so call sites and
   tests that don't supply config behave identically — this is the zero-drift safety net.
4. Load config once per compute pass in `snapshot.ts` / `orchestrator.ts` (same place
   `thresholdConfig.findMany()` already runs) and pass it down.
5. Build config APIs and a Mantine settings panel on top.

See `sub-specs/technical-spec.md`, `sub-specs/database-schema.md`, and
`sub-specs/api-spec.md` for detail.

## Story Map (phased)

| Phase | Story | Delivers |
|---|---|---|
| Foundation | 1 — Config schema, migration & seeded defaults | New tables + types + defaults |
| Foundation | 2 — Config-driven engine refactor | Engine reads config; zero drift on defaults |
| API | 3 — Config read/write API + validation | GET/PUT endpoints with guardrails |
| Phase 1 UI | 4 — Settings panel shell + RAG threshold editor | Lowest-risk editable surface |
| Phase 2+3 UI | 5 — Inclusion rules + velocity/rolling editors | Remaining config surfaces |
| Recalc | 6 — Recalculate-now action + regression tests | Opt-in recompute + drift proof |
