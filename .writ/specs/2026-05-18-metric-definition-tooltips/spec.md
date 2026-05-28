# Metric Definition and Calculation Tooltips

> **Status:** Complete
> **Created:** 2026-05-18
> **Owner:** @AdamSellke
> **Contract Locked:** ✅
> **Origin:** Promoted from issue: `.writ/issues/features/2026-05-18-metric-definition-tooltips.md`

## Contract Summary

**Deliverable:** Add accessible definition and calculation tooltips to dashboard metric tiles, chart section headers, and RAG badges so readers understand what each number means and how it is computed.

**Must Include:** A single source of truth for tooltip copy keyed by stable metric IDs, aligned with `lib/metrics` calculators and current RAG rules; hybrid interaction pattern (info icon on labels/headers, direct tooltip on RAG badges).

**Hardest Constraint:** Copy must stay accurate across program vs workstream display contexts (different labels, shared formulas with scope qualifiers) and must not contradict future metric-config UI — tooltips describe **current hardcoded behavior**, not editable settings.

---

## 🎯 Experience Design

### Entry points

- **Program Summary metric grid** — info icon beside each tile label (`Avg Total Velocity`, `Avg Total Velocity Rate`, `Avg Total Overhead %`, `Avg Total Carry-Over %`)
- **Workstream health cards** — info icon beside each metric row label (`Avg Velocity`, `Velocity Rate`, `Overhead %`, `Carry-Over %`)
- **Chart section headers** — info icon beside `Velocity (Points)` and `Bug Burndown` titles on program summary and expanded workstream cards
- **RAG badges** — hover/focus the G/A/R badge itself for RAG-specific explanation (no extra icon)

### Happy path

1. User notices a metric label or chart title with a subtle info icon (or a colored RAG badge)
2. User hovers or keyboard-focuses the affordance
3. A multiline Mantine `Tooltip` appears with a **Definition** line and **Calculation** line (RAG tooltips add a **RAG thresholds** line)
4. User reads plain-language copy and understands the displayed value

### Moment of truth

The metric label stops being opaque jargon — the user can self-serve “what is this?” and “how is it calculated?” without opening code or docs.

### Feedback model

- Mantine `Tooltip` with `withArrow`, `multiline`, `maw={360}`, `openDelay={300}` — matches existing dashboard patterns (`SprintStoryListPanel`, `CurrentSprintItemTables`)
- Info icon uses `ActionIcon` + `IconInfoCircle` (14px), `variant="subtle"`, `size="xs"`, `aria-label="Definition for {label}"`
- Tooltip wrapper must accept keyboard focus (Mantine `Tooltip` on focusable child)

### Error experience

- **Unknown metric key:** Info icon does not render; metric displays unchanged (no broken affordance)
- **Null RAG badge:** No tooltip (badge not rendered — unchanged behavior)
- **Export/static renders:** Tooltips are interactive-only; export layouts unchanged (no info icons required in PPTX path unless already present in DOM — default: icons render but are inert in static capture, acceptable)

### State catalog

| State | Behavior |
|---|---|
| Populated metric | Label + info icon + value + optional RAG badge with tooltip |
| N/A value | Label + info icon still available; copy explains when N/A occurs |
| No RAG | Info icon on label only; no RAG badge tooltip |
| Empty dashboard | Unaffected — section empty states unchanged |
| Loading | Unaffected — tooltips attach when tiles render |

### Responsive behavior

- Tooltip portal rendering avoids card overflow clipping
- Info icons stay inline with uppercase labels; no layout shift to metric values

---

## 📋 Business Rules

### Metric coverage (in scope)

| Surface | Labels / headers |
|---|---|
| Program tiles | Avg Total Velocity, Avg Total Velocity Rate, Avg Total Overhead %, Avg Total Carry-Over % |
| Workstream rows | Avg Velocity, Velocity Rate, Overhead %, Carry-Over % |
| Chart headers | Velocity (Points), Bug Burndown |
| RAG badges | On metrics where `rag !== null` (velocity, overhead %, carry-over %) |

### Copy structure

Each registry entry provides:

- `definition` — one sentence, plain language
- `calculation` — how the number is derived (window, exclusions, aggregation)
- `ragExplanation` (optional) — only for metrics with RAG badges

### Formula alignment (must match code)

- **Velocity:** Sum of story points for Done-like items (Closed, Done, Resolved); Bug and Spike excluded
- **Overhead %:** `(ceremony + bug + spike + support hours) / grossHours × 100`
- **Carry-over %:** `carryOverPoints / plannedPoints × 100`; Bug and Spike excluded from point plan
- **Velocity rate:** `doneLikeStoryPoints / netCapacityHours` where net capacity = grossHours − overheadHours
- **Rolling average:** 4 prior sprints (current excluded); shown in `rollingWindowLabel` on program summary
- **Program velocity:** Sum of workstream velocities (`aggregateToProgram`)
- **Program overhead/carry-over:** Weighted average by planned points across workstreams
- **Bug burndown chart:** Open = New/Active bugs; Closed = Resolved/Testing/Closed per sprint snapshot

### RAG tooltip rules (option C from discovery)

- **Velocity RAG (trend-based):** Green ≥ 100% of rolling average; Amber 70–99%; Red < 70%
- **Overhead % RAG (threshold-based):** Green 0–30%; Amber 30.01–45%; Red > 45% (seeded `ThresholdConfig` defaults)
- **Carry-over % RAG (threshold-based):** Green 0–10%; Amber 10.01–25%; Red > 25% (seeded defaults)
- Static copy in registry — not loaded from DB at runtime (future config UI may supersede)

### Accessibility

- Info icons: descriptive `aria-label`, focusable, tooltip on focus
- RAG badge tooltips: `aria-label` on badge includes status; tooltip supplements on hover/focus
- Do not rely on hover-only color for meaning (tooltip adds text explanation)

### Out of scope

- Chart data-point tooltips (Recharts series hover) — unchanged
- Milestone panels, sprint tab badges, story title tooltips
- Dynamic threshold values from `ThresholdConfig` API
- Metric calculation config UI (separate future issue)
- PowerPoint export layout changes

---

## Detailed Requirements

### 1. Metric definitions registry

Create `lib/metrics/definitions.ts` (or equivalent) exporting:

- Stable `MetricId` union type
- `METRIC_DEFINITIONS` map: `{ definition, calculation, ragExplanation? }`
- Helper `getMetricTooltip(id: MetricId): string` formatting multiline tooltip body
- Helper `getRagTooltip(id: MetricId): string | null` for RAG-specific line(s)

Map display labels in adapter to metric IDs (program label aliases share IDs with scope text in calculation string).

### 2. View model extension

Extend `MetricTileViewModel` with optional `metricId: MetricId` set in `lib/dashboard/adapter.ts` when building program and workstream tiles.

### 3. Shared UI components

- `MetricDefinitionHint` — renders info icon + tooltip from `metricId` or explicit copy
- Extend `RagBadge` — accept optional `ragTooltip: string | null`; wrap badge in `Tooltip` when provided

### 4. Dashboard integration

- `ProgramSummarySection.tsx` — info icons on tile labels and chart headers
- `WorkstreamHealthCard.tsx` — info icons on metric labels and chart headers; pass `ragTooltip` to `RagBadge`

### 5. Tests

- Unit tests for registry helpers and label→ID mapping
- Component tests for `MetricDefinitionHint` and `RagBadge` tooltip behavior
- Storybook stories demonstrating each metric tooltip variant

---

## Implementation Approach

1. **Registry first** — centralize copy aligned with `calculators.ts`, `rag.ts`, `aggregator.ts`, `trend-service.ts`, and seeded thresholds
2. **Types + adapter** — attach `metricId` to tiles at mapping time; avoid duplicating copy in components
3. **Components** — small shared hint components; extend `RagBadge` rather than one-off wrappers
4. **Integration** — wire program summary and workstream cards; chart headers reuse same chart metric IDs
5. **Verification** — tests lock copy structure; Storybook for visual review

---

## Success Criteria

1. All 8 metric tile labels and 2 chart headers expose definition tooltips via info icon (hover + keyboard focus)
2. RAG badges on velocity, overhead %, and carry-over % expose RAG explanation tooltips
3. Tooltip copy matches current calculator behavior (verified against `lib/metrics` and seed thresholds)
4. No TypeScript errors; new unit/component tests pass
5. Badge and tile layout visually unchanged aside from added info icons

---

## Scope Boundaries

**Included:**

- Metric definitions registry and adapter wiring
- `MetricDefinitionHint` + `RagBadge` tooltip support
- Program summary + workstream card integration
- Unit/component tests and Storybook coverage

**Excluded:**

- Recharts data tooltips, milestone tooltips, config UI, dynamic thresholds
- Export-specific tooltip styling or removal

---

## ⚠️ Cross-Spec Overlap

- **Related issue:** [2026-04-09-metric-calculation-config-ui](../issues/features/2026-04-09-metric-calculation-config-ui.md) — future UI for editable rules/thresholds. This spec uses **static copy** describing current defaults; when config UI ships, registry may need to read live config or show a “defaults shown” disclaimer.
- **No active spec conflict** — no in-progress spec touches the same dashboard metric surfaces.

---

## 💡 Recommendations

- Key registry entries by `MetricId`, not display label — program “Avg Total Velocity” and workstream “Avg Velocity” share `velocity` with scope-qualified calculation text
- Add a lightweight test that seed threshold values match `ragExplanation` strings to catch drift
- Reuse `MetricDefinitionHint` in Storybook metric tile stories for documentation
