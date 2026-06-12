# Metric Calculation Configuration UI (Lite)

> Source: .writ/specs/2026-05-28-metric-calculation-config-ui/spec.md
> Purpose: Efficient AI context for implementation
> Refreshed: 2026-06-11 (deliveryToBugRatio + trend-service rolling window)

## For Coding Agents

**Deliverable:** DB-persisted Metric Configuration panel exposing RAG thresholds
(`overheadPercent`, `carryOverRate`, `deliveryToBugRatio`), inclusion/exclusion rules,
velocity RAG cutoffs, and rolling window — defaults reproduce today's exact metric numbers.

**Implementation Approach:**
- Extend config that flows INTO pure functions; never read DB inside calculators.
- Add `MetricEngineConfig` (singleton: velocity amber/green ratios, rolling window) and
  `MetricRuleConfig` (per metric-category × work-item-type inclusion flags) tables.
- Default constants encode current behavior (`!=='Bug'/'Spike'`, `1.0`, `0.7`, window `4`).
- Thread config through `snapshot.ts`/`orchestrator.ts`/`trend-service.ts` where
  `thresholdConfig.findMany()` and `.slice(0, 4)` already run.
- `deliveryToBugRatio` threshold row already seeded; wire UI/API only. Zero-bug Green stays
  in `assignDeliveryToBugRag` (not configurable).
- Build GET/PUT config APIs + Mantine settings panel with tabs.

**Files in Scope:**
- `prisma/schema.prisma`, `prisma/seed.ts` — new tables + seeded defaults
- `lib/metrics/types.ts`, `config-rules.ts`, `config-loader.ts`, `config-validation.ts`
- `lib/metrics/calculators.ts`, `rag.ts`, `snapshot.ts`, `trend-service.ts`, `orchestrator.ts`
- `app/api/metric-config/route.ts` (+ sub-routes)
- `components/Dashboard/MetricConfigPanel.tsx` (+ tab components)

**Error Handling:**
- Invalid threshold/cutoff ranges → 422 + field errors; Save blocked
- Config load failure → recoverable panel error; active config unchanged
- Missing config rows → fall back to default constants (never crash engine)

**Integration Points:**
- Recalculate now → `POST /api/metrics/compute`
- Align settings entry with `2026-05-27-dashboard-workstream-config-ui`
- Tooltip copy drift follow-up (`2026-05-18-metric-definition-tooltips`)

---

## For Review Agents

**Acceptance Criteria:**
1. Fresh DB + seeded defaults reproduces pre-feature metric snapshots exactly.
2. Hardcoded constants (`Bug`/`Spike` filters, `1.0`, `0.7`, `take: 4`, `slice(0, 4)`)
   sourced from config.
3. Threshold tab covers `overheadPercent`, `carryOverRate`, `deliveryToBugRatio` only.
4. Editing a value + recompute changes RAG/metric output as expected.
5. Recalculate-now is opt-in; no silent auto-recompute.

**Business Rules:**
- Config is program-wide, not per workstream.
- `deliveryToBugRatio`: lower-is-healthier; zero-bug + delivery > 0 → Green (fixed rule).
- Threshold validation: greenMin≤greenMax, amberMin≤amberMax, no undefined-RAG gaps.
- Velocity cutoffs: ratios > 0, amberFloor ≤ greenFloor. Rolling window: integer ≥ 1.
- Other seeded thresholds (milestones, aging WIP, etc.) out of scope for UI.

**Experience Design:**
- Entry: dashboard Settings/gear near Export/Sync.
- Happy path: open panel → tab → edit → Save → toast → optional Recalculate.
- Moment of truth: RAG badges/values update after recompute.
- Feedback: toast + inline validation; delivery-to-bug tab shows direction hint.

---

## For Testing Agents

**Success Criteria:**
1. Regression: default-config engine output == pre-feature output (includes deliveryToBug).
2. New code coverage ≥80%; config defaults + validation 100%.
3. API tests prove validation rejects bad ranges and persists valid ones.

**Shadow Paths to Verify:**
- **Happy path:** edit deliveryToBug threshold → Save → recompute → RAG changes.
- **Nil input:** no config rows → engine uses defaults, output unchanged.
- **Empty input:** all types excluded → metric null/0, no crash.
- **Upstream error:** config API failure → panel error, active config intact.

**Edge Cases:**
- deliveryToBug zero-bug case still Green after threshold edit.
- greenMin > greenMax → 422. amberFloor > greenFloor → 422. rolling window 0 → 422.
- Recompute during sync → newest config wins.

**Test Strategy:**
- Unit: defaults, validators, refactored calculators/rag/trend-service.
- API: config GET/PUT + compute trigger. Component: panel Save/validation.
