# Metric Calculation Configuration UI (Lite)

> Source: .writ/specs/2026-05-28-metric-calculation-config-ui/spec.md
> Purpose: Efficient AI context for implementation

## For Coding Agents

**Deliverable:** DB-persisted Metric Configuration settings panel exposing RAG thresholds,
inclusion/exclusion rules, velocity RAG cutoffs, and rolling window — defaults reproduce
today's exact metric numbers.

**Implementation Approach:**
- Extend config that flows INTO pure functions; never read DB inside calculators.
- Add `MetricEngineConfig` (singleton: velocity amber/green ratios, rolling window) and
  `MetricRuleConfig` (per metric-category × work-item-type inclusion flags) tables.
- Add default config constants encoding current behavior (`!=='Bug'/'Spike'`, `1.0`,
  `0.7`, window `4`) as the zero-drift safety net.
- Thread config through `snapshot.ts`/`orchestrator.ts` where `thresholdConfig.findMany()`
  already loads; pass to calculators/`assignVelocityRag`/rolling query.
- Build GET/PUT config APIs + Mantine settings panel with tabs.

**Files in Scope:**
- `prisma/schema.prisma`, `prisma/seed.ts` — new tables + seeded defaults
- `lib/metrics/types.ts` — `MetricEngineConfigInput`, `MetricRuleConfigInput`, defaults
- `lib/metrics/calculators.ts` — inclusion rules replace hardcoded type filters
- `lib/metrics/rag.ts` — `assignVelocityRag` takes cutoff ratios
- `lib/metrics/snapshot.ts` — rolling window from config; thread config down
- `lib/metrics/orchestrator.ts` — load + pass config
- `app/api/metric-config/route.ts` (+ sub-routes) — read/write APIs
- `components/Dashboard/MetricConfigPanel.tsx` (+ tab components) — UI

**Error Handling:**
- Invalid threshold/cutoff ranges → 422 + field errors; Save blocked
- Config load failure → recoverable panel error; active config unchanged
- Missing config rows → fall back to default constants (never crash engine)

**Integration Points:**
- Recalculate now → `POST /api/metrics/compute`
- Settings entry point should align with `2026-05-27-dashboard-workstream-config-ui`
- Tooltip copy in `2026-05-18-metric-definition-tooltips` will drift (follow-up)

---

## For Review Agents

**Acceptance Criteria:**
1. Fresh DB + seeded defaults reproduces pre-feature metric snapshots exactly.
2. Every hardcoded constant (`Bug`/`Spike` filters, `1.0`, `0.7`, `take: 4`) now sourced
   from config.
3. Editing a value + recompute changes RAG/metric output as expected.
4. Save validation blocks invalid ranges with clear messages.
5. Recalculate-now is opt-in; no silent auto-recompute.

**Business Rules:**
- Config is program-wide, not per workstream.
- Threshold validation: greenMin≤greenMax, amberMin≤amberMax, no undefined-RAG gaps.
- Velocity cutoffs: ratios > 0, amberFloor ≤ greenFloor.
- Rolling window: integer ≥ 1 (default 4).
- Soft permission gate only; no auth model built.
- Forward-only recompute by default.

**Experience Design:**
- Entry: dashboard Settings/gear near Export/Sync.
- Happy path: open panel → tab → edit → Save → toast → optional Recalculate.
- Moment of truth: RAG badges/values update after recompute.
- Feedback: toast + inline validation.
- Error: blocked Save with reason; recoverable load error leaves config unchanged.

---

## For Testing Agents

**Success Criteria:**
1. Regression: default-config engine output == pre-feature output (snapshot equality).
2. New code coverage ≥80%; config defaults + validation 100%.
3. API tests prove validation rejects bad ranges and persists valid ones.

**Shadow Paths to Verify:**
- **Happy path:** edit threshold → Save → recompute → RAG changes.
- **Nil input:** no config rows in DB → engine uses default constants, output unchanged.
- **Empty input:** all work-item types excluded for a metric → metric null/0, no crash.
- **Upstream error:** config API failure → panel error, active config intact.

**Edge Cases:**
- greenMin > greenMax → 422, Save blocked.
- amberFloor > greenFloor → 422.
- rolling window 0 or non-integer → 422.
- Recompute triggered while sync in flight → newest config wins.

**Coverage Requirements:**
- New code: ≥80%
- Config defaults + validation helpers: 100%
- Engine regression path: 100%

**Test Strategy:**
- Unit: default constants, validation helpers, refactored calculators/rag.
- API: config GET/PUT + compute trigger.
- Component: settings panel Save/Cancel/validation with mocked fetch.
