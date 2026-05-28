# Technical Spec: Metric Definition Tooltips

> Parent spec: `.writ/specs/2026-05-18-metric-definition-tooltips/spec.md`
> Stories: 1–4

---

## Architecture

```
lib/metrics/definitions.ts          ← single source of truth (copy + helpers)
        ↓
lib/dashboard/adapter.ts              ← attaches metricId to MetricTileViewModel
        ↓
components/Dashboard/
  MetricDefinitionHint.tsx            ← info icon + definition tooltip
  RagBadge.tsx                        ← optional RAG explanation tooltip
  ProgramSummarySection.tsx           ← program tiles + chart headers
  WorkstreamHealthCard.tsx            ← workstream rows + chart headers + RAG
```

---

## Metric ID Registry

| `MetricId` | Display labels | RAG tooltip |
|---|---|---|
| `velocity` | Avg Velocity, Avg Total Velocity | Trend ratio |
| `velocityRate` | Velocity Rate, Avg Total Velocity Rate | — |
| `overheadPercent` | Overhead %, Avg Total Overhead % | Threshold ranges |
| `carryOverRate` | Carry-Over %, Avg Total Carry-Over % | Threshold ranges |
| `chartVelocity` | Velocity (Points) | — |
| `chartBugBurndown` | Bug Burndown | — |

### Registry shape (proposed)

```typescript
export type MetricId =
  | 'velocity'
  | 'velocityRate'
  | 'overheadPercent'
  | 'carryOverRate'
  | 'chartVelocity'
  | 'chartBugBurndown';

export interface MetricDefinition {
  definition: string;
  calculation: string;
  ragExplanation?: string;
}

export function getMetricTooltip(id: MetricId): string;
export function getRagTooltip(id: MetricId): string | null;
```

`getMetricTooltip` returns multiline string:

```
Definition: …
Calculation: …
```

---

## View Model Change

```typescript
// lib/dashboard/types.ts
export interface MetricTileViewModel {
  label: string;
  metricId?: MetricId;  // new — optional for backward compat in stories/tests
  // ...existing fields
}
```

Adapter sets `metricId` when building program and workstream tiles.

---

## UI Components

### MetricDefinitionHint

```tsx
interface MetricDefinitionHintProps {
  metricId: MetricId;
  label: string; // for aria-label
}
```

- Renders `ActionIcon` with `IconInfoCircle` size 14
- `aria-label={`Definition for ${label}`}`
- `tabIndex={0}` on ActionIcon (focusable)
- Tooltip: `getMetricTooltip(metricId)`, `withArrow`, `multiline`, `maw={360}`, `openDelay={300}`
- Returns `null` if id unknown (defensive)

### RagBadge extension

```tsx
interface RagBadgeProps {
  rag: RagStatus;
  ragTooltip?: string | null;
}
```

When `ragTooltip` provided, wrap `<Badge>` in `<Tooltip label={ragTooltip} withArrow multiline maw={360}>`.

Callers pass `getRagTooltip(metricId)` from parent (workstream card knows metric context per row).

---

## Integration Points

### ProgramSummarySection

- Each `programMetrics` tile: `<Group>` label row adds `<MetricDefinitionHint metricId={m.metricId} label={m.label} />`
- Chart headers "Velocity (Points)" and "Bug Burndown": hardcode `chartVelocity` / `chartBugBurndown` IDs

### WorkstreamHealthCard

- Each metric row: hint beside label; `RagBadge rag={m.rag} ragTooltip={m.metricId ? getRagTooltip(m.metricId) : null}`
- Chart headers: same as program section

---

## Error & Rescue Map

| Operation | What Can Fail | Planned Handling | Test Strategy |
|---|---|---|---|
| Render MetricDefinitionHint | Unknown `metricId` | Return null — no icon | Unit test with invalid id |
| Render MetricDefinitionHint | Empty registry string | Should not occur — test guards | Registry unit tests |
| Adapter mapping | Label alias mismatch | Central map label→id; unit test all labels | Adapter test |
| RAG tooltip on badge | `rag === null` | Badge not rendered — unchanged | Component test |
| Tooltip in collapsed card | Overflow hidden | Mantine portal — no clip | Manual/Storybook |
| Export capture | Extra DOM nodes | Icons inert in static PNG — acceptable | Visual review optional |

No `[UNPLANNED]` external service operations — static UI only.

---

## Shadow Paths

| Flow | Happy Path | Nil Input | Empty Input | Upstream Error |
|---|---|---|---|---|
| Metric hint | Hover icon → definition + calculation | Unknown id → no icon | N/A | N/A |
| RAG badge tooltip | Hover badge → RAG thresholds | rag null → no badge | N/A | N/A |
| Program tile | All 4 tiles have hints | No program metrics → empty state unchanged | Empty metrics array → "No program metrics" | N/A |
| Workstream row | Hint + optional RAG tooltip | metricId missing → label only | N/A | N/A |

---

## Interaction Edge Cases

| Edge Case | Planned Handling |
|---|---|
| Double-click info icon | Mantine Tooltip — no action triggered |
| Rapid hover across metrics | Default Mantine close/open behavior |
| Keyboard tab through dashboard | Each info icon focusable; tooltip on focus |
| Screen reader | `aria-label` on icon; tooltip supplements on focus |
| Mobile touch | Mantine tap-to-open tooltip behavior |
| RAG badge + row hint | Independent tooltips — badge and icon separate triggers |

---

## Copy Reference (implementation baseline)

Values below must be reflected in registry strings (wording may be polished; numbers must match).

**Velocity:** Done-like SP sum; Bug/Spike excluded. Workstream tile shows rolling avg; program tile sums workstream velocities.

**Velocity rate:** `doneLikeStoryPoints / netCapacityHours`. Program tile shows average across workstreams.

**Overhead %:** Overhead hours / gross hours × 100. Program: weighted by planned points.

**Carry-over %:** Incomplete delivery SP / planned SP × 100. Program: weighted by planned points.

**Chart velocity:** Per-sprint completed story points trend; forecast line when prediction available.

**Bug burndown:** Stacked open vs closed bugs per sprint; Open = New/Active, Closed = Resolved/Testing/Closed.

**Velocity RAG:** ≥100% of 4-sprint rolling avg = Green; 70–99% = Amber; <70% = Red.

**Overhead RAG:** Green 0–30%; Amber 30.01–45%; Red >45%.

**Carry-over RAG:** Green 0–10%; Amber 10.01–25%; Red >25%.

---

## Test Files (expected)

```
__tests__/lib/metrics/definitions.test.ts
__tests__/components/Dashboard/MetricDefinitionHint.test.tsx
__tests__/components/Dashboard/RagBadge.test.tsx
__tests__/lib/dashboard/adapter-metric-ids.test.ts  (or extend existing adapter tests)
```

Storybook:

```
components/Dashboard/MetricDefinitionHint.story.tsx
components/Dashboard/ProgramSummarySection.story.tsx  (update)
```

---

## Cross-Spec Compatibility

- `2026-05-27-dashboard-workstream-config-ui` — Complete; no conflict
- Future `metric-calculation-config-ui` — registry may need dynamic threshold loading; design registry API to allow swap later

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Copy drift from calculators | Medium | Unit test seed thresholds; code review against calculators |
| Layout shift from icons | Low | `ActionIcon size="xs"`, inline with label Group |
| Tooltip clutter on dense cards | Low | openDelay 300ms; concise copy |
| Export DOM noise | Low | Accept icons in export; no layout change |

**Net risk: low.**
