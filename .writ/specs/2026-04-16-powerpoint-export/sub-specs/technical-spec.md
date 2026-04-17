# Technical Spec: PowerPoint Export

> Parent: `.writ/specs/2026-04-16-powerpoint-export/spec.md`
> Stories: 9 total (Story 8 adds the Chart Image Renderer; Story 9 migrates every chart slide to Recharts-captured images)

---

## Architecture Overview

The export pipeline is a pure client-side operation. No server changes are required. The flow is:

```
User clicks "Export PPTX"
  → handleExport() in DashboardContainer
  → dynamic import('pptxgenjs')
  → dynamic import('html-to-image')
  → await buildPresentation(exportInput) in lib/export/builder.ts  (async)
      → await buildProgramSummarySlide(prs, input)   // tiles + 2 captured chart images
      → for each workstream:
          → await buildVelocitySlide(prs, ws)        // captured <VelocityTrendChart/>
          → await buildBugBurndownSlide(prs, ws)     // captured <BugBurndownChart/>
          → await buildOverheadSlide(prs, ws)        // captured <OverheadCompositionChart/>
          → await buildMilestoneSlide(prs, ws, input.milestones)  // captured <BurnupChart/> ×N
  → downloadPresentation(prs, filename)
  → browser download triggers
```

Total slides: `1 + (workstreams.length × 4)`. With 5 workstreams that is **21 slides**. Total chart images: `2 + (workstreams.length × 3) + milestones.length` — approximately 16 for a 5-workstream program with one milestone each.

Each chart image goes through the Chart Image Renderer (`lib/export/render/chart-image.tsx`):

```
renderChartToPng(<VelocityTrendChart ... />, { width: 620, height: 340 })
  1. Create hidden DIV child of document.body (position: absolute; left: -99999px; width/height fixed)
  2. createRoot(hiddenDiv).render(<MantineProvider>...{element}...</MantineProvider>)
  3. await requestAnimationFrame + microtask flush
  4. const dataUrl = await htmlToImage.toPng(hiddenDiv, { pixelRatio: 2, cacheBust: true })
  5. root.unmount(); hiddenDiv.remove()
  6. return dataUrl
```

Sequential execution: one chart at a time to avoid parallel-mount DOM weight spikes.

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

### `lib/export/render/chart-image.tsx` 🆕 (Story 8)

Pure utility for turning a React element into a PNG data URL. Lives in `lib/export/render/` because it's export-specific infrastructure, not a general-purpose chart renderer.

```tsx
import { createRoot, type Root } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { toPng } from 'html-to-image';
import type { ReactElement } from 'react';

export interface ChartCaptureOptions {
  width: number;
  height: number;
  /** Defaults to 2 (retina). Higher = crisper image, larger file. */
  pixelRatio?: number;
  /** Override background color; defaults to 'white' to avoid transparent bleed. */
  backgroundColor?: string;
}

export async function renderChartToPng(
  element: ReactElement,
  { width, height, pixelRatio = 2, backgroundColor = 'white' }: ChartCaptureOptions
): Promise<string> {
  const host = document.createElement('div');
  host.setAttribute('data-pptx-chart-host', '');
  host.style.cssText = `position: absolute; left: -99999px; top: 0; width: ${width}px; height: ${height}px; background: ${backgroundColor};`;
  document.body.appendChild(host);

  let root: Root | null = null;
  try {
    root = createRoot(host);
    root.render(<MantineProvider>{element}</MantineProvider>);

    // Wait for Recharts to commit SVG and for one animation frame to clear any remaining work.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await Promise.resolve();  // microtask flush

    return await toPng(host, { pixelRatio, cacheBust: true, backgroundColor });
  } finally {
    if (root) root.unmount();
    host.remove();
  }
}
```

Key implementation notes:

- Mantine theme wrapping ensures CSS custom properties (`--mantine-color-blue-6`, etc.) resolve for the chart subtree even though it's outside the app's root provider
- `position: absolute; left: -99999px` keeps the capture offscreen without `display: none` (which breaks SVG layout)
- `cacheBust: true` prevents html-to-image from reusing stale SVG between calls
- `pixelRatio: 2` targets retina display density while keeping file size modest
- `try/finally` guarantees unmount + DOM cleanup even when `toPng` rejects
- Animation suppression is caller's responsibility — pass chart components with `isAnimationActive: false` props (the dashboard components already do this for tooltips; bar/line entry animations are handled in Story 9 via prop passing or component wrapper)

### `lib/export/builder.ts` (updated by Story 9 — now async)

Orchestrates all slides. Slide order:

1. Program Summary (tiles + captured program velocity + captured program bug burndown)
2. For each workstream (in `input.workstreams` order): **Velocity → Bug Burndown → Overhead → Milestone** (all captured)

```ts
export async function buildPresentation(
  PptxGenJS: typeof import('pptxgenjs').default,
  input: ExportInput
): Promise<InstanceType<typeof import('pptxgenjs').default>> {
  const prs = new PptxGenJS();
  prs.layout = 'LAYOUT_WIDE';  // 13.3" × 7.5"

  await buildProgramSummarySlide(prs, input);
  for (const ws of input.workstreams) {
    await buildVelocitySlide(prs, ws);
    await buildBugBurndownSlide(prs, ws);
    await buildOverheadSlide(prs, ws);
    await buildMilestoneSlide(prs, ws, input.milestones);
  }

  return prs;
}
```

Slide-count invariant (unchanged): `prs.slides.length === 1 + input.workstreams.length * 4`.

`handleExport` in `DashboardContainer.tsx` already awaits `buildPresentation(...)` — no call-site change needed.

---

## Slide Implementations

### `lib/export/slides/program-summary.ts` (updated by Story 9)

**Data sources:** `input.programMetrics`, `input.programRollup`, `input.sprintName`, `input.computedAt`, `input.programTrendSprints`, `input.sprint5Prediction`

**Layout (LAYOUT_WIDE = 13.33" × 7.5"):**

- Title text box (native): x=0.3, y=0.2, w=12.7, h=0.6 — "Program Health Summary — {sprintName}"
- 5 metric tiles (native): x positions at 0.3, 2.9, 5.5, 8.1, 10.7 — each 2.4" wide × 1.7" tall, y=1.0. RAG-colored fill, white text (label / value / avg).
- **Program Velocity chart image** (captured): x=0.3, y=3.0, w=6.2, h=3.7
  - Captured from `<VelocityTrendChart trendSprints={programTrendSprints} prediction={sprint5Prediction} />`
  - Pixel dimensions: 620 × 370 at `pixelRatio: 2`
- **Program Bug Burndown chart image** (captured): x=6.8, y=3.0, w=6.2, h=3.7
  - Captured from `<BugBurndownChart trendSprints={programTrendSprints} />`
  - Pixel dimensions: 620 × 370 at `pixelRatio: 2`
- Footer text box (native): y=6.9, h=0.4 — "Generated {date} | Last computed: {computedAt}"

**Null handling:**

- `programMetrics === null` → render a single "No data available" text box at x=0.3, y=1.0, w=12.7, h=1.7 (tile band replaced); charts and footer still render if trend data exists
- `programTrendSprints.length === 0` → both chart captures skipped; render "No program trend data available" text at x=0.3, y=3.5, w=12.7, h=1.0
- `sprint5Prediction === null` → velocity capture still runs; `VelocityTrendChart` handles the no-prediction case internally (only `Completed Points` series)

**Milestone tiles:** Sourced from `programRollup`:

- Monthly: `currentMonthCompletionPercent !== null ? Math.round(currentMonthCompletionPercent) + '%' : '–'`
- Quarterly: `quarterlyMilestones.complete + ' / ' + quarterlyMilestones.total` or "–"
- Both milestone tiles use `#868e96` fill (no RAG — not configured for RAG thresholds)

---

### `lib/export/slides/velocity.ts` (updated by Story 9)

**Data source:** `WorkstreamCardViewModel` — `trendSprints`, `prediction`, `metrics`

**Layout (LAYOUT_WIDE):**

- Title (native): x=0.3, y=0.2, w=12.7, h=0.6 — "{WorkstreamName} — Velocity"
- Chart image (captured): x=0.3, y=0.8, w=8.5, h=5.5
  - Captured from `<VelocityTrendChart trendSprints={ws.trendSprints} prediction={ws.prediction} />`
  - Pixel dimensions: 850 × 550 at `pixelRatio: 2`
- Metrics text block (native, right panel): x=9.0, y=0.8, w=4.0 — Current · Avg · RAG · Predicted

**Null handling:** If `ws.trendSprints.length === 0`, skip capture; render "No trend data available" text instead.

---

### `lib/export/slides/bug-burndown.ts` (updated by Story 9)

**Data source:** `WorkstreamCardViewModel.trendSprints` — `rawActiveBugs`, `rawBugsClosed`, `sprintName`

**Layout (LAYOUT_WIDE):**

- Title (native): x=0.3, y=0.2, w=12.7, h=0.6 — "{WorkstreamName} — Bug Burndown"
- Chart image (captured): x=0.3, y=0.8, w=8.5, h=5.5
  - Captured from `<BugBurndownChart trendSprints={ws.trendSprints} />` (new shared component from Story 9)
  - Pixel dimensions: 850 × 550 at `pixelRatio: 2`
- Metrics text block (native, right panel): x=9.0, y=0.8, w=4.0 — four lines:
  - `Open (current): {currentSprint.rawActiveBugs}`
  - `Closed (current): {currentSprint.rawBugsClosed}`
  - `Open total (4-sprint): {sum of rawActiveBugs across trendSprints}`
  - `Closed total (4-sprint): {sum of rawBugsClosed across trendSprints}`

**Null handling:** If `trendSprints.length === 0`, skip capture; render "No bug data available" center text. If all values are zero, chart still renders (all zero-height bars).

**Identifying current sprint:** `const currentSprint = ws.trendSprints.find(s => s.isCurrent)` — may be undefined; fall back to "–" for current-sprint metrics lines.

---

### `lib/export/slides/overhead.ts` (updated by Story 9)

**Data source:** `WorkstreamCardViewModel` — `overheadComposition`, `metrics`

**Layout (LAYOUT_WIDE):**

- Title (native): "{WorkstreamName} — Overhead"
- Chart image (captured): x=0.3, y=0.8, w=8.5, h=5.5
  - Captured from `<OverheadCompositionChart composition={ws.overheadComposition} />`
  - Pixel dimensions: 850 × 550 at `pixelRatio: 2`
- Metrics text (native, right panel): x=9.0, y=0.8, w=4.0 — Overhead % · Rolling Avg Overhead %

**Null handling:** If `overheadComposition.length === 0`, skip capture; render "No overhead data available" text.

---

### `lib/export/slides/milestone.ts` (updated by Story 9)

**Data source:** `milestones: ApiMilestoneWithProgress[]` — filtered by `workstreamId`

**Layout (LAYOUT_WIDE):**

- Title (native): "{WorkstreamName} — Milestones"
- For each of the first 3 milestones matching `ws.workstreamId`:
  - Milestone title + `% complete` label (native text)
  - Chart image (captured): per-milestone position (y=0.85, 2.85, 4.85), full width 12.7, h=1.75
    - Captured from `<BurnupChart burnupData={milestone.burnupData} height={160} />`
    - Pixel dimensions: 1270 × 160 at `pixelRatio: 2`
- Milestones 4+: rendered as text-only lines at the bottom of the slide

**Null handling:**

- `wsMilestones.length === 0` → render "Milestone data unavailable for this workstream" text; no captures
- `milestone.burnupData.length === 0` → skip capture for that milestone; render milestone title + "% complete: {percentComplete}%" as text only

---

### `components/Dashboard/BugBurndownChart.tsx` 🆕 (Story 9)

Shared Recharts component extracted from inline code currently duplicated in `ProgramSummarySection.tsx` (line ~200) and `WorkstreamHealthCard.tsx`. After Story 9, both dashboard call sites consume this component instead of inlining the `<AppBarChart/>` block.

```tsx
'use client';

import { AppBarChart } from '@/lib/charts';
import type { TrendSprintViewModel } from '@/lib/dashboard/types';

export interface BugBurndownChartProps {
  trendSprints: TrendSprintViewModel[];
  /** Chart height in px. Defaults to 220 to match existing dashboard usage. */
  height?: number;
}

const SERIES = [
  { name: 'Open (New/Active)', color: 'red.6' },
  { name: 'Closed (Resolved/Testing/Closed)', color: 'green.6' },
];

export function BugBurndownChart({ trendSprints, height = 220 }: BugBurndownChartProps) {
  if (trendSprints.length === 0) return null;

  const data = trendSprints.map((s) => ({
    sprint: s.sprintName,
    'Open (New/Active)': s.rawActiveBugs,
    'Closed (Resolved/Testing/Closed)': s.rawBugsClosed,
  }));

  return (
    <AppBarChart
      height={height}
      data={data}
      dataKey="sprint"
      type="stacked"
      withLegend
      legendProps={{ verticalAlign: 'bottom', height: 30 }}
      series={SERIES}
      xAxisProps={{
        interval: 0,
        tickFormatter: (v: string) => {
          const label = v.replace(/^Sprint\s*/i, '');
          const isCurrent = trendSprints.find((s) => s.sprintName === v)?.isCurrent;
          return isCurrent ? `${label} (Cur)` : label;
        },
      }}
      yAxisProps={{ domain: [0, 'auto'] }}
    />
  );
}
```

Behavior preserved from the original inline code: same colors (red.6 / green.6), same series names, same `(Cur)` x-axis label on the current sprint, same empty-state (return `null`).

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


| Operation                 | What Can Fail                                   | Planned Handling                                                                               | Test Strategy                    |
| ------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------- |
| `import('pptxgenjs')`     | Module load failure / network                   | Catch in `handleExport` → notification                                                         | Mock import failure in unit test |
| `import('html-to-image')` | Module load failure / network                   | Catch in `handleExport` → notification                                                         | Mock import failure in unit test |
| `renderChartToPng()`      | `toPng` rejection, serialization error, unmount failure | Try/finally guarantees unmount; slide builder catches per-chart failure and renders a "chart unavailable" placeholder text box on that slide; the overall export continues | Unit test with mocked rejection  |
| `buildPresentation()`     | Data shape mismatch, null access                | Null-safe defaults in each slide builder; outer catch in `handleExport`                        | Unit test with null/empty inputs |
| `prs.writeFile()`         | Browser security / storage                      | pptxgenjs uses Blob URL — unaffected by pop-up blockers                                        | Manual browser test              |
| Milestone data absent     | `milestones === []`                             | Placeholder text per slide, no throw                                                           | Unit test empty milestones       |
| Trend data absent         | `trendSprints === []`                           | Skip capture, placeholder text                                                                 | Unit test empty trendSprints     |
| Recharts animation race   | Capture fires mid-animation                     | Renderer awaits `requestAnimationFrame` + microtask; captured components pass `isAnimationActive: false` where applicable | Visual review; unit test asserts rAF is awaited |
| Mantine theme missing     | Hidden DIV renders without CSS vars             | Renderer wraps element in `<MantineProvider>`; mounts as child of `document.body`              | Unit test asserts MantineProvider wrapper in captured tree |
| SSR import                | Next.js server bundle includes browser-only API | Dynamic import at call time; renderer is a client-only module (`'use client'` guarded)         | Check bundle with `pnpm analyze` |


---

## Dependencies

- **New packages:**
  - `pptxgenjs` — browser-compatible, no Node.js-only APIs at import time
  - `html-to-image` — browser-side DOM → PNG rasterization (Story 8)
- **No new API routes**
- **No database changes**
- **No Prisma schema changes**
- **Stories:**
  - Phase 1 (original): 1 → (2, 3, 4, 5, 7 in parallel) → 6  (all complete)
  - Phase 2 (this edit): 8 (Chart Image Renderer Infrastructure) → 9 (Migrate Slides to Recharts Images)
  - Story 8 has no dependency on 2–7 (pure utility + tests)
  - Story 9 depends on Story 8 (consumes `renderChartToPng`) and on dashboard components already existing (they do)

