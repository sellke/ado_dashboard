# Metric Definition Tooltips (Lite)

> Source: .writ/specs/2026-05-18-metric-definition-tooltips/spec.md
> Purpose: Efficient AI context for implementation

## For Coding Agents

**Deliverable:** Accessible definition/calculation tooltips on metric tiles, chart headers, and RAG badges.

**Implementation Approach:**
- Add `lib/metrics/definitions.ts` — `MetricId`, `METRIC_DEFINITIONS`, `getMetricTooltip()`, `getRagTooltip()`
- Extend `MetricTileViewModel` with `metricId`; set in `lib/dashboard/adapter.ts`
- `MetricDefinitionHint` — `ActionIcon` + `IconInfoCircle` + Mantine `Tooltip` (`multiline`, `maw={360}`, `withArrow`, `openDelay={300}`)
- Extend `RagBadge` — optional `ragTooltip`; wrap in `Tooltip` when set
- Wire `ProgramSummarySection.tsx`, `WorkstreamHealthCard.tsx`

**Files in Scope:**
- `lib/metrics/definitions.ts` — new registry
- `lib/dashboard/types.ts` — `metricId` on `MetricTileViewModel`
- `lib/dashboard/adapter.ts` — attach metric IDs to tiles
- `components/Dashboard/MetricDefinitionHint.tsx` — new shared component
- `components/Dashboard/RagBadge.tsx` — RAG tooltip support
- `components/Dashboard/ProgramSummarySection.tsx` — tile + chart header hints
- `components/Dashboard/WorkstreamHealthCard.tsx` — row + chart header hints + RAG tooltips

**Error Handling:**
- Unknown `metricId` → render label without icon
- `rag === null` → no badge, no RAG tooltip

**Integration Points:**
- Formulas: `lib/metrics/calculators.ts`, `rag.ts`, `aggregator.ts`, `trend-service.ts`
- Threshold defaults: `prisma/seed.ts` (`overheadPercent`, `carryOverRate`)

---

## For Review Agents

**Acceptance Criteria:**
1. 8 tile labels + 2 chart headers show info-icon tooltips on hover and focus
2. RAG badges on velocity/overhead/carry-over show RAG explanation on hover/focus
3. Copy matches calculator behavior and seeded threshold ranges
4. Layout unchanged except info icons

**Business Rules:**
- Hybrid UX: info icon on labels/headers; RAG badge is its own tooltip trigger
- Velocity RAG: trend ratio (≥100% Green, 70–99% Amber, <70% Red)
- Overhead RAG: 0–30 / 30.01–45 / >45% (static seed defaults)
- Carry-over RAG: 0–10 / 10.01–25 / >25% (static seed defaults)
- Bug/Spike excluded from velocity and carry-over point metrics

**Experience Design:**
- Entry: metric label info icon or RAG badge
- Happy path: multiline tooltip with Definition + Calculation (+ RAG line on badges)
- Moment of truth: user understands metric without reading code
- Feedback: Mantine Tooltip, keyboard accessible
- Error: missing key → no icon, no broken UI

---

## For Testing Agents

**Success Criteria:**
1. Registry unit tests cover all `MetricId` values and formatter output
2. Component tests: tooltip renders on focus; RAG badge tooltip when `ragTooltip` set
3. Adapter test: each program/workstream tile has expected `metricId`

**Shadow Paths:**
- **Happy path:** hover info icon → definition + calculation text
- **Nil input:** unknown metricId → no hint rendered
- **Empty input:** rag null → no RAG tooltip
- **Upstream error:** N/A (static copy, no API)

**Edge Cases:**
- Program vs workstream velocity scope text → correct calculation qualifier
- N/A metric value → hint still available
- Workstream sprint tab override → hint on label unchanged

**Coverage Requirements:**
- New code: ≥80%
- Registry helpers: 100%
- `MetricDefinitionHint` + `RagBadge`: focus/hover paths

**Test Strategy:**
- Unit: `definitions.ts`, adapter metricId mapping
- Component: `@testing-library/react` + userEvent hover/focus
- Storybook: one story per metric variant
