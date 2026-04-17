# Technical Spec: PowerPoint Export

> Parent: `.writ/specs/2026-04-16-powerpoint-export/spec.md`
> Stories: All 7 (Story 7 adds Bug Burndown slides)

---

## Architecture Overview

The export pipeline is a pure client-side operation. No server changes are required. The flow is:

```
User clicks "Export PPTX"
  → handleExport() in DashboardContainer
  → dynamic import('pptxgenjs')
  → buildPresentation(exportInput) in lib/export/builder.ts
      → buildProgramSummarySlide(prs, input)   // tiles + program velocity + program bug burndown
      → for each workstream:
          → buildVelocitySlide(prs, ws)
          → buildBugBurndownSlide(prs, ws)     // 🆕 stacked bar: Open + Closed counts
          → buildOverheadSlide(prs, ws)
          → buildMilestoneSlide(prs, ws, input.milestones)
  → downloadPresentation(prs, filename)
  → browser download triggers
```

Total slides: `1 + (workstreams.length × 4)`. With 5 workstreams that is **21 slides**.

---

## Module Structure

### `lib/export/types.ts`

```ts
import type { ApiMilestoneWithProgress, ApiProgramMilestoneRollup } from '@/lib/milestones/types';
import type {
  MetricTileViewModel,
  TrendSprintViewModel,
  WorkstreamCardViewModel,
} from '@/lib/dashboard/types';
import type { ApiWorkstream } from '@/lib/dashboard/types';

export interface ExportInput {
  sprintName: string;
  computedAt: string | null;
  programMetrics: MetricTileViewModel[] | null;      // from DashboardViewModel.programMetrics
  programRollup: ApiProgramMilestoneRollup | null;
  programTrendSprints: TrendSprintViewModel[];       // 🆕 for Slide 1 charts
  sprint5Prediction: {                               // 🆕 forecasted overlay for Slide 1 velocity
    rawVelocity: number | null;
    sprintLabel: string;
    isPredicted: boolean;
  } | null;
  workstreams: WorkstreamCardViewModel[];            // view models (formatted strings + chart data)
  rawWorkstreams: ApiWorkstream[];                   // raw API shapes (trend sprints with raw numbers)
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

1. Program Summary (tiles + program velocity + program bug burndown)
2. For each workstream (in `input.workstreams` order): **Velocity → Bug Burndown → Overhead → Milestone**

```ts
export function buildPresentation(PptxGenJS: typeof import('pptxgenjs'), input: ExportInput) {
  const prs = new PptxGenJS();
  prs.layout = 'LAYOUT_WIDE';  // 13.3" × 7.5"

  buildProgramSummarySlide(prs, input);
  for (const ws of input.workstreams) {
    buildVelocitySlide(prs, ws);
    buildBugBurndownSlide(prs, ws);   // 🆕 Story 7
    buildOverheadSlide(prs, ws);
    buildMilestoneSlide(prs, ws, input.milestones);
  }

  return prs;
}
```

Slide-count invariant: `prs.slides.length === 1 + input.workstreams.length * 4`.

---

## Slide Implementations

### `lib/export/slides/program-summary.ts`

**Data sources:** `input.programMetrics`, `input.programRollup`, `input.sprintName`, `input.computedAt`, `input.programTrendSprints`, `input.sprint5Prediction`

**Layout (LAYOUT_WIDE = 13.33" × 7.5"):**

- Title text box: x=0.3, y=0.2, w=12.7, h=0.6 — "Program Health Summary — {sprintName}"
- 5 metric tiles: x positions at 0.3, 2.9, 5.5, 8.1, 10.7 — each 2.4" wide × **1.7" tall** (compressed from 2.2"), y=1.0
  - Background fill: RAG color
  - Text: label (top), value (center, large), avg (bottom, small)
- **Program Velocity chart** (pptxgenjs `line`): x=0.3, y=3.0, w=6.2, h=3.7
  - Series 1 `Completed Points` — `programTrendSprints.map(s => s.rawVelocity ?? 0)`; null at current-sprint position if forecasted overlay present
  - Series 2 `Forecasted` — single non-null point at current sprint position = `sprint5Prediction.rawVelocity`; dashed style; color `4c9be8` vs `9fc5eb`
  - Reference line at `averageVelocity(programTrendSprints)` if non-null
- **Program Bug Burndown chart** (pptxgenjs `bar`, `barGrouping: 'stacked'`): x=6.8, y=3.0, w=6.2, h=3.7
  - Series 1 `Open (New/Active)` — `programTrendSprints.map(s => s.rawActiveBugs)`, color `c92a2a`
  - Series 2 `Closed (Resolved/Testing/Closed)` — `programTrendSprints.map(s => s.rawBugsClosed)`, color `2f9e44`
  - Labels: `programTrendSprints.map(s => s.sprintName.replace(/^Sprint\s*/i, ''))`
- Footer text box: y=6.9, h=0.4 — "Generated {date} | Last computed: {computedAt}"

**Null handling:**

- `programMetrics === null` → render a single "No data available" text box at x=0.3, y=1.0, w=12.7, h=1.7 (tile band replaced); charts and footer still render if trend data exists
- `programTrendSprints.length === 0` → charts omitted; render "No program trend data available" text at x=0.3, y=3.5, w=12.7, h=1.0
- `sprint5Prediction === null` → velocity chart renders without the forecasted overlay series

**Milestone tiles:** Sourced from `programRollup`:

- Monthly: `currentMonthCompletionPercent !== null ? Math.round(currentMonthCompletionPercent) + '%' : '–'`
- Quarterly: `quarterlyMilestones.complete + ' / ' + quarterlyMilestones.total` or "–"
- Both milestone tiles use `#868e96` fill (no RAG — not configured for RAG thresholds)

**Helper:** `averageVelocity(programTrendSprints)` — use the existing helper from `components/Dashboard/ProgramSummarySection.tsx` or inline the logic (mean of `rawVelocity` where `isCurrent === false && rawVelocity !== null`).

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

### `lib/export/slides/bug-burndown.ts` 🆕

**Data source:** `WorkstreamCardViewModel.trendSprints` — `rawActiveBugs`, `rawBugsClosed`, `sprintName`

**Chart data construction:**

```ts
const labels = ws.trendSprints.map(s => s.sprintName);

const series = [
  { name: 'Open (New/Active)',               labels, values: ws.trendSprints.map(s => s.rawActiveBugs) },
  { name: 'Closed (Resolved/Testing/Closed)', labels, values: ws.trendSprints.map(s => s.rawBugsClosed) },
];
```

**Layout (LAYOUT_WIDE):**

- Title: x=0.3, y=0.2, w=12.7, h=0.6 — "{WorkstreamName} — Bug Burndown"
- Chart: x=0.3, y=0.8, w=8.5, h=5.5 — pptxgenjs `bar` chart, `barGrouping: 'stacked'`, `chartColors: ['c92a2a', '2f9e44']`
- Metrics text block (right panel): x=9.0, y=0.8, w=4.0 — lines:
  - `Open (current): {currentSprint.activeBugs}`
  - `Closed (current): {currentSprint.bugsClosed}`
  - `Open total (4-sprint): {sum of rawActiveBugs across trendSprints}`
  - `Closed total (4-sprint): {sum of rawBugsClosed across trendSprints}`

**Null handling:** If `trendSprints.length === 0`, render "No bug data available" center text instead of chart. If all values are zero, chart still renders.

**Identifying current sprint:** `const currentSprint = ws.trendSprints.find(s => s.isCurrent)` — may be undefined; guard metrics text.

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
      programTrendSprints: viewModel.programTrendSprints,   // 🆕
      sprint5Prediction: viewModel.sprint5Prediction,       // 🆕
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
- **Stories:** 1 → (2, 3, 4, 5, 7 in parallel) → 6
  - Story 7 (Bug Burndown Slides) depends only on Story 1's infrastructure; can ship in parallel with Stories 3/4/5
  - Story 6 (Orchestrator) depends on 2, 3, 4, 5, **7**

