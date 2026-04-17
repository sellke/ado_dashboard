# Technical Spec: PowerPoint Export

> Parent: `.writ/specs/2026-04-16-powerpoint-export/spec.md`
> Stories: All 6

---

## Architecture Overview

The export pipeline is a pure client-side operation. No server changes are required. The flow is:

```
User clicks "Export PPTX"
  → handleExport() in DashboardContainer
  → dynamic import('pptxgenjs')
  → buildPresentation(exportInput) in lib/export/builder.ts
      → buildProgramSummarySlide(prs, input)
      → for each workstream:
          → buildVelocitySlide(prs, ws, input)
          → buildOverheadSlide(prs, ws, input)
          → buildMilestoneSlide(prs, ws, input.milestones)
  → downloadPresentation(prs, filename)
  → browser download triggers
```

---

## Module Structure

### `lib/export/types.ts`

```ts
import type { ApiMilestoneWithProgress, ApiProgramMilestoneRollup } from '@/lib/milestones/types';
import type { MetricTileViewModel, WorkstreamCardViewModel } from '@/lib/dashboard/types';
import type { ApiWorkstream } from '@/lib/dashboard/types';

export interface ExportInput {
  sprintName: string;
  computedAt: string | null;
  programMetrics: MetricTileViewModel[] | null;    // from DashboardViewModel.programMetrics
  programRollup: ApiProgramMilestoneRollup | null;
  workstreams: WorkstreamCardViewModel[];           // view models (formatted strings + chart data)
  rawWorkstreams: ApiWorkstream[];                  // raw API shapes (trend sprints with raw numbers)
  milestones: ApiMilestoneWithProgress[];
}
```

`WorkstreamCardViewModel` already contains `trendSprints` (with `rawVelocity`, `overheadBreakdown`, etc.) and `overheadComposition`. `rawWorkstreams` is needed for milestone workstream filtering by `workstreamId`.

### `lib/export/rag-colors.ts`

```ts
export const RAG_COLORS = {
  Green:  '2f9e44',  // pptxgenjs uses hex without '#'
  Amber:  'e67700',
  Red:    'c92a2a',
  null:   '868e96',
} as const;

export function ragColor(rag: string | null): string {
  return RAG_COLORS[rag as keyof typeof RAG_COLORS] ?? RAG_COLORS.null;
}
```

### `lib/export/index.ts`

```ts
export type { ExportInput } from './types';
export { buildPresentation } from './builder';

export async function downloadPresentation(prs: PptxGenJS, filename: string): Promise<void> {
  await prs.writeFile({ fileName: filename });
}
```

`prs.writeFile()` triggers the browser download directly in pptxgenjs client mode.

### `lib/export/builder.ts`

Orchestrates all slides. Slide order:

1. Program Summary
2. For each workstream (in `input.workstreams` order): Velocity → Overhead → Milestone

```ts
export function buildPresentation(PptxGenJS: typeof import('pptxgenjs'), input: ExportInput) {
  const prs = new PptxGenJS();
  prs.layout = 'LAYOUT_WIDE';  // 13.3" × 7.5"

  buildProgramSummarySlide(prs, input);
  for (const ws of input.workstreams) {
    buildVelocitySlide(prs, ws);
    buildOverheadSlide(prs, ws);
    buildMilestoneSlide(prs, ws, input.milestones);
  }

  return prs;
}
```

---

## Slide Implementations

### `lib/export/slides/program-summary.ts`

**Data sources:** `input.programMetrics`, `input.programRollup`, `input.sprintName`, `input.computedAt`

**Layout (LAYOUT_WIDE = 13.33" × 7.5"):**

- Title text box: x=0.3, y=0.2, w=12.7, h=0.6 — "Program Health Summary — {sprintName}"
- 5 metric tiles: x positions at 0.3, 2.9, 5.5, 8.1, 10.7 — each 2.4" wide × 2.2" tall, y=1.0
  - Background fill: RAG color
  - Text: label (top), value (center, large), avg (bottom, small)
- Footer text box: y=6.9, h=0.4 — "Generated {date} | Last computed: {computedAt}"

**Null handling:** If `programMetrics === null`, render a single "No data available" text box.

**Milestone tiles:** Sourced from `programRollup`:

- Monthly: `currentMonthCompletionPercent !== null ? Math.round(currentMonthCompletionPercent) + '%' : '–'`
- Quarterly: `quarterlyMilestones.complete + ' / ' + quarterlyMilestones.total` or "–"
- Both milestone tiles use `#868e96` fill (no RAG — not configured for RAG thresholds)

---

### `lib/export/slides/velocity.ts`

**Data source:** `WorkstreamCardViewModel` — `trendSprints`, `prediction`, `metrics`

**Chart data construction:**

```ts
const actualSprints = ws.trendSprints.filter(s => !s.isCurrent);
const currentSprint = ws.trendSprints.find(s => s.isCurrent);

const labels = ws.trendSprints.map(s => s.sprintName);

const actualsSeries = {
  name: 'Velocity (SP)',
  labels,
  values: ws.trendSprints.map(s => s.isCurrent ? null : (s.rawVelocity ?? 0)),
};
const currentSeries = {
  name: 'Current Sprint',
  labels,
  values: ws.trendSprints.map(s => s.isCurrent ? (s.rawVelocity ?? 0) : null),
};
const avgSeries = {
  name: 'Rolling Avg',
  labels,
  values: ws.trendSprints.map(s => s.velocityAvg ?? 0),
};
```

**Layout:**

- Title: "{WorkstreamName} — Velocity"
- Chart: x=0.3, y=0.8, w=8.5, h=5.5 — pptxgenjs `line` chart
- Metrics text block: x=9.0, y=0.8, w=4.0 — Current · Avg · RAG · Predicted

**Null handling:** If `trendSprints.length === 0`, render "No trend data available" text instead of chart.

---

### `lib/export/slides/overhead.ts`

**Data source:** `WorkstreamCardViewModel` — `overheadComposition`, `metrics`

**Chart data construction:**

```ts
const labels = ws.overheadComposition.map(s => s.sprintName);

const series = [
  { name: 'Meetings', values: ws.overheadComposition.map(s => s.ceremonyHours) },
  { name: 'Bugs',     values: ws.overheadComposition.map(s => s.bugHours) },
  { name: 'Spikes',   values: ws.overheadComposition.map(s => s.spikeHours) },
  { name: 'Support',  values: ws.overheadComposition.map(s => s.supportHours) },
];
```

**Layout:**

- Title: "{WorkstreamName} — Overhead"
- Chart: x=0.3, y=0.8, w=8.5, h=5.5 — pptxgenjs `bar` chart, `barGrouping: 'stacked'`
- Metrics text: x=9.0, y=0.8, w=4.0 — Overhead % · Rolling Avg Overhead %

**Null handling:** If `overheadComposition.length === 0`, render "No overhead data available" text.

---

### `lib/export/slides/milestone.ts`

**Data source:** `milestones: ApiMilestoneWithProgress[]` — filtered by `workstreamId`

**Per-milestone chart:**

```ts
const wsMilestones = milestones.filter(m => m.workstreamId === ws.workstreamId);

for (const milestone of wsMilestones) {
  const labels = milestone.burnupData.map(p => p.sprintName);
  const completedSeries = { name: 'Completed SP', values: milestone.burnupData.map(p => p.cumulativeCompletedSP) };
  const targetSeries   = { name: 'Target SP',    values: milestone.burnupData.map(p => p.totalSP) };
  // Add pptxgenjs line chart for this milestone
}
```

If multiple milestones exist for a workstream, the slide shows them stacked vertically (one chart per milestone). If the slide gets too tall (> 3 milestones), additional milestones are listed as text labels only with % complete.

**Null handling:**

- `wsMilestones.length === 0` → render "Milestone data unavailable for this workstream"
- `milestone.burnupData.length === 0` → render milestone title + "% complete: {percentComplete}%" as text only

---

## Component: `ExportControl.tsx`

```tsx
'use client';

interface ExportControlProps {
  onExport: () => void;
  isExporting: boolean;
  exportError: string | null;
}

export function ExportControl({ onExport, isExporting }: ExportControlProps) {
  return (
    <Button
      variant="light"
      leftSection={isExporting ? <Loader size="sm" /> : <IconPresentation size={16} />}
      onClick={onExport}
      disabled={isExporting}
    >
      {isExporting ? 'Generating…' : 'Export PPTX'}
    </Button>
  );
}
```

Errors are surfaced via `notifications.show()` in the `handleExport` callback in `DashboardContainer` — not via inline alert (keeps the header area clean).

---

## `DashboardContainer.tsx` Changes

```tsx
// New state
const [exportInProgress, setExportInProgress] = useState(false);

// New callback
const handleExport = useCallback(async () => {
  setExportInProgress(true);
  try {
    const PptxGenJS = (await import('pptxgenjs')).default;
    const input: ExportInput = {
      sprintName: rawMetrics?.sprint?.name ?? 'Unknown Sprint',
      computedAt: rawMetrics?.computedAt ?? null,
      programMetrics: viewModel.programMetrics,
      programRollup,
      workstreams: viewModel.workstreamCards,
      rawWorkstreams: rawMetrics?.workstreams ?? [],
      milestones,
    };
    const prs = buildPresentation(PptxGenJS, input);
    const date = new Date().toISOString().slice(0, 10);
    await prs.writeFile({ fileName: `LiveLink-Health-Report-${date}.pptx` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    notifications.show({ color: 'red', title: 'Export failed', message: msg });
  } finally {
    setExportInProgress(false);
  }
}, [rawMetrics, viewModel, programRollup, milestones]);

// In render — add ExportControl to the header Group alongside SyncControl:
<Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
  <Title order={1}>{title}</Title>
  <Group gap="sm">
    <ExportControl onExport={handleExport} isExporting={exportInProgress} exportError={null} />
    <SyncControl ... />
  </Group>
</Group>
```

---

## Error & Rescue Map


| Operation             | What Can Fail                                   | Planned Handling                                                        | Test Strategy                    |
| --------------------- | ----------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------- |
| `import('pptxgenjs')` | Module load failure / network                   | Catch in `handleExport` → notification                                  | Mock import failure in unit test |
| `buildPresentation()` | Data shape mismatch, null access                | Null-safe defaults in each slide builder; outer catch in `handleExport` | Unit test with null/empty inputs |
| `prs.writeFile()`     | Browser security / storage                      | pptxgenjs uses Blob URL — unaffected by pop-up blockers                 | Manual browser test              |
| Milestone data absent | `milestones === []`                             | Placeholder text per slide, no throw                                    | Unit test empty milestones       |
| Trend data absent     | `trendSprints === []`                           | Skip chart render, placeholder text                                     | Unit test empty trendSprints     |
| SSR import            | Next.js server bundle includes browser-only API | Dynamic import at call time, never at module level                      | Check bundle with `pnpm analyze` |


---

## Dependencies

- **New package:** `pptxgenjs` (browser-compatible, no Node.js-only APIs at import time)
- **No new API routes**
- **No database changes**
- **No Prisma schema changes**
- **Stories:** 1 → (2, 3, 4, 5 in parallel) → 6

