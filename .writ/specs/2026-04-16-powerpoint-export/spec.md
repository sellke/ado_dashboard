# Phase 1F: PowerPoint Export

> **Status:** Complete
> **Date:** 2026-04-16
> **Effort:** M (1–2 days)
> **Phase:** 1F — Final Phase 1 deliverable
> **Roadmap:** `.writ/product/roadmap.md → Phase 1F`

---

## Contract (Locked)

**Deliverable:** One-click client-side PowerPoint export of all four dashboard sections to a stakeholder-ready `.pptx` file. Charts are **Recharts-rendered PNG images captured at export time** so the deck matches the dashboard pixel-for-pixel; text and KPI tiles stay as native pptxgenjs objects.

**Must Include:** A working download trigger that produces a complete `.pptx` with all slide types populated from existing dashboard React state.

**Hardest Constraint:** Capturing live Recharts output without visible DOM flicker and within the 5-second success budget — means mounting each chart in a hidden offscreen node, disabling entry animations, and awaiting paint before rasterizing.

**Slide Structure (21 slides for 5 workstreams, grouped by workstream):**

- Slide 1: Program Summary (KPI tiles + Program Velocity chart + Program Bug Burndown chart)
- Slides 2–5: Action Tracker (Velocity → Bug Burndown → Overhead → Milestone)
- Slides 6–9: KPI Services (Velocity → Bug Burndown → Overhead → Milestone)
- Slides 10–13: Pitch Tracker (Velocity → Bug Burndown → Overhead → Milestone)
- Slides 14–17: Streams (Velocity → Bug Burndown → Overhead → Milestone)
- Slides 18–21: UCM (Velocity → Bug Burndown → Overhead → Milestone)

**Success Criteria:** Export completes in < 5 seconds; file opens in PowerPoint without errors; **every chart on every slide is visually indistinguishable from the dashboard's Recharts version (same colors, series, markers, axes, legend placement)**; chart data matches the dashboard's current rolling window; file is named `LiveLink-Health-Report-{YYYY-MM-DD}.pptx`.

**Scope Boundaries:**

- Included: pptxgenjs + html-to-image install, 5 slide types, client-side generation + chart-image capture, download trigger, loading/error states, program-level velocity + bug burndown charts on Slide 1, per-workstream bug burndown slide, shared `BugBurndownChart` component extracted for reuse across dashboard + export
- Excluded: Branding/colors/fonts beyond what the dashboard already uses, item-level detail tables (bugs/spikes/support lists), server-side rendering, stakeholder-specific variants (Phase 3), native PowerPoint chart objects (superseded by image capture), SVG embedding (PowerPoint SVG support is uneven)

**Soft Dependency:** `adp-milestones-panel` spec (Not Started) has a broken milestone data pipeline. Milestone slides render best-effort from whatever data is available.

---

## 🎯 Experience Design

### Entry Point

"Export PPTX" button rendered in the `DashboardContainer` header row, alongside the existing `SyncControl` (Sync Now button). Visible at all times — no guard on data load state.

### Happy Path

1. User opens dashboard — data loads as normal
2. User clicks "Export PPTX"
3. Button enters loading state (spinner + "Generating…" label, disabled)
4. pptxgenjs dynamically imported, slides built from in-memory state
5. `.pptx` file downloads automatically via browser download
6. Button returns to idle state

### Moment of Truth

The file opens in PowerPoint and the stakeholder sees 21 slides with the correct workstream data, chart visualizations, and RAG status — matching what the dashboard displays.

### Feedback Model

- **During generation:** Button shows spinner + "Generating…" label
- **On success:** Button returns to idle; browser download dialog appears automatically
- **On failure:** Mantine `notifications.show()` error toast with message; button returns to idle

### Error Experience

If pptxgenjs throws (e.g. corrupt data, import failure), the user sees:

> "Export failed: [error message]. Check that dashboard data has loaded and try again."

No silent failures. The dashboard itself is unaffected — export errors are isolated.

### State Catalog


| State               | Button label  | Button disabled | Feedback           |
| ------------------- | ------------- | --------------- | ------------------ |
| Idle (data loaded)  | "Export PPTX" | No              | None               |
| Idle (data loading) | "Export PPTX" | No              | None               |
| Generating          | "Generating…" | Yes             | Spinner in button  |
| Error               | "Export PPTX" | No              | Error notification |


> Note: The export button is **never** disabled due to data loading state. If milestone data is missing, the milestone slides render empty placeholder content — no crash.

---

## 📋 Business Rules

### Slide Ordering

Slides are grouped by workstream, not by section type. Within each workstream group, order is always: Velocity → Bug Burndown → Overhead → Milestone. Program Summary is always first.

### Data Source

All export data comes from React state already in memory. No additional API calls are made at export time. Data shapes used:

- `rawMetrics: ApiResponse` — program metrics, workstream metrics, trend sprints
- `viewModel.programTrendSprints: TrendSprintViewModel[]` — program-level sprint trend (velocity + bug counts) for Slide 1 charts
- `viewModel.sprint5Prediction` — forecasted next-sprint velocity for Slide 1 velocity chart
- `milestones: ApiMilestoneWithProgress[]` — milestone burnup data
- `programRollup: ApiProgramMilestoneRollup | null` — program-level milestone summary

### Empty/Missing Data Handling


| Missing Data                        | Behavior                                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| `rawMetrics === null`               | All workstream slides render with "No data available" placeholder text; chart is omitted            |
| `milestones === []`                 | Milestone slides render "Milestone data unavailable" placeholder text; chart is omitted             |
| `programRollup === null`            | Program Summary milestone tiles show "–"                                                            |
| `programTrendSprints === []`        | Program Summary velocity + bug burndown charts omitted; tile band and footer still render          |
| A single workstream has no trends   | That workstream's velocity / bug burndown / overhead slides render with "No trend data"             |
| A workstream has no bug activity    | Bug burndown slide renders the stacked bar with zero bars — no placeholder, no crash                |


### RAG Color Mapping


| RAG            | Hex Color |
| -------------- | --------- |
| Green          | `#2f9e44` |
| Amber          | `#e67700` |
| Red            | `#c92a2a` |
| null / unknown | `#868e96` |


### File Naming

`LiveLink-Health-Report-{YYYY-MM-DD}.pptx` where the date is the current local date at time of export (not the sprint date).

### pptxgenjs Import Strategy

Dynamic import on button click to avoid SSR bundling issues in Next.js 15:

```ts
const pptxgen = (await import('pptxgenjs')).default;
```

This also ensures pptxgenjs never contributes to server-side bundle size.

### Next.js client bundle (pptxgenjs + JSZip)

Use webpack’s **default** resolution to `pptxgenjs`’s ES build (`dist/pptxgen.es.js`), which imports `jszip` as a normal dependency. **Do not** alias `pptxgenjs` to `dist/pptxgen.bundle.js`: that UMD ends with `})(JSZip)` without defining a `JSZip` binding in module scope, which produces **`ReferenceError: JSZip is not defined`** in the browser bundle.

In `next.config.mjs`, the client webpack config keeps `NormalModuleReplacementPlugin` to rewrite `node:*` module requests (so dynamic `import('node:fs')` inside pptxgenjs resolves against `resolve.fallback` stubs) and sets `resolve.fallback` for `fs`, `https`, etc. to `false`. The browser never executes those Node-only branches; the replacement avoids `UnhandledSchemeError` on `node:` URIs.

### Chart Image Rendering Strategy

Charts are captured from live Recharts components at export time, not re-implemented in pptxgenjs:

1. For each chart, the renderer mounts the dashboard component (e.g. `VelocityTrendChart`, `BugBurndownChart`, `OverheadCompositionChart`, `BurnupChart`) into a hidden offscreen DIV that's a child of `document.body`. The DIV is absolutely positioned far outside the viewport (`left: -99999px`) and is sized to the target image dimensions.
2. The hidden DIV is wrapped in the application's existing `MantineProvider` context so theme colors resolve identically to the dashboard.
3. Entry animations are disabled (`isAnimationActive: false` passed through the shared chart wrappers) so capture happens against a fully painted chart.
4. The renderer awaits one `requestAnimationFrame` + one microtask tick for Recharts to compute layout and commit SVG to the DOM.
5. `html-to-image.toPng(node, { pixelRatio: 2, cacheBust: true })` returns a PNG data URL.
6. The hidden DIV is unmounted (`root.unmount()`) and removed from the DOM.
7. The slide builder embeds the PNG via `slide.addImage({ data, x, y, w, h })`.

Bullet 3 is the timing-critical step. Without animation suppression, the capture can fire mid-animation and serialize a half-drawn chart. All dashboard charts already use `isAnimationActive: false` on tooltips; the export renderer extends this to bar/line entry animations.

Rendering happens serially inside `buildPresentation()` to avoid mounting 16+ hidden DIVs simultaneously (which would spike DOM weight and CSS recomputation). Sequential capture is ~100–300ms per chart; 16 charts ≈ 1.6–4.8s, within the 5s target.

### Workstream Ordering

Workstreams appear in the slide deck in the order returned by `rawMetrics.workstreams` (currently alphabetical by name from the API: Action Tracker, KPI Services, Pitch Tracker, Streams, UCM). This matches the dashboard card order.

---

## Slide Specifications

### Slide 1: Program Summary

**Content:**

- Title: "Program Health Summary — {sprintName}" (native text)
- 5 KPI metric tiles (native colored rectangles + text, unchanged from prior scope):
  1. Average Velocity — value, rolling avg, RAG fill
  2. Overhead % — value, rolling avg, RAG fill
  3. Carry-Over % — value, rolling avg, RAG fill
  4. Monthly Milestone % — `programRollup.currentMonthCompletionPercent` or "–"
  5. Quarterly Milestone Progress — `quarterlyMilestones.complete / quarterlyMilestones.total` or "–"
- **Program Velocity chart** — PNG captured from `<VelocityTrendChart trendSprints={programTrendSprints} prediction={sprint5Prediction} />`
- **Program Bug Burndown chart** — PNG captured from `<BugBurndownChart trendSprints={programTrendSprints} />` (new shared component)
- Footer: "Generated {YYYY-MM-DD} | {computedAt}" (native text)

**Layout (LAYOUT_WIDE 13.33" × 7.5"):**

- Title: y=0.2, h=0.6
- 5 tiles in a horizontal row: y=1.0, h=1.7, ~2.4" wide each (compressed from 2.2" tall to make room for charts below)
- Two charts side-by-side below the tiles:
  - Velocity chart: x=0.3, y=3.0, w=6.2, h=3.7
  - Bug Burndown chart: x=6.8, y=3.0, w=6.2, h=3.7
- Footer: y=6.9, h=0.4

**Empty-state handling:** If `programTrendSprints.length === 0`, both charts are omitted and the chart band renders a single "No program trend data available" text box at x=0.3, y=3.5, w=12.7, h=1.0 — tile band and footer still render normally. (The `VelocityTrendChart` and `BugBurndownChart` components also render their own empty states if mounted with empty data, but the slide short-circuits before mounting when the data is empty.)

### Slide 2+ (per workstream): Velocity

**Title:** "{WorkstreamName} — Velocity" (native text)
**Content:**

- PNG captured from `<VelocityTrendChart trendSprints={ws.trendSprints} prediction={ws.prediction} />` — exactly the component used on `WorkstreamHealthCard`. Carries the same two series (Completed Points solid + Forecasted dashed overlay), hollow-dot current-sprint styling, rolling-avg reference line, legend.
- Key metrics text block (right panel, native text): Current Velocity · Rolling Avg · RAG status · Predicted Next Sprint

### Slide 3+ (per workstream): Bug Burndown

**Title:** "{WorkstreamName} — Bug Burndown" (native text)
**Content:**

- PNG captured from `<BugBurndownChart trendSprints={ws.trendSprints} />` — shared component extracted from the dashboard inline code (used by both `ProgramSummarySection` and `WorkstreamHealthCard` after Story 9). Two stacked-bar series: Open (red) + Closed (green) per sprint.
- Key metrics text block (right panel, native text): current-sprint Open · current-sprint Closed · 4-sprint totals

**Empty-state handling:** If `ws.trendSprints.length === 0`, skip the image capture and render "No bug data available" center text instead.

### Slide 4+ (per workstream): Overhead

**Title:** "{WorkstreamName} — Overhead" (native text)
**Content:**

- PNG captured from `<OverheadCompositionChart composition={ws.overheadComposition} />` — same component the dashboard uses. Stacked bar, four series: Meetings · Bugs · Spikes · Support (hours).
- Key metrics text (right panel, native text): Overhead % (current) · Rolling Avg Overhead %

### Slide 5+ (per workstream): Milestone

**Title:** "{WorkstreamName} — Milestones" (native text)
**Content:**

- For each milestone goal belonging to this workstream (`milestones.filter(m => m.workstreamId === ws.workstreamId)`), up to 3:
  - PNG captured from `<BurnupChart burnupData={milestone.burnupData} height={160} />` — same component the dashboard uses. Two series: Completed SP (solid) vs. Target SP (dashed reference).
  - % complete label (native text)
- If more than 3 milestones: first 3 get captured chart images; rest listed as text lines
- If no milestones: text placeholder "Milestone data unavailable for this workstream"

---

## Implementation Approach

### New Files

```
lib/export/
├── index.ts              — public API: buildPresentation(), downloadPresentation()
├── builder.ts            — async; orchestrates slide order (program → per-workstream)
├── types.ts              — ExportInput type (subset of DashboardContainer state)
├── rag-colors.ts         — RAG hex color constants (still used by native tile fills)
├── render/
│   └── chart-image.tsx   🆕 Story 8: renderChartToPng(element, { width, height })
│                           — mounts React element in hidden DIV, captures PNG, unmounts
└── slides/
    ├── program-summary.ts  ⭐ updated by Story 9: charts become captured images
    ├── velocity.ts         ⭐ updated by Story 9: async; captured <VelocityTrendChart/> image
    ├── bug-burndown.ts     ⭐ updated by Story 9: async; captured <BugBurndownChart/> image
    ├── overhead.ts         ⭐ updated by Story 9: async; captured <OverheadCompositionChart/> image
    └── milestone.ts        ⭐ updated by Story 9: async; captured <BurnupChart/> images

components/Dashboard/
├── ExportControl.tsx     — "Export PPTX" button with loading/error states
└── BugBurndownChart.tsx  🆕 Story 9: shared component extracted from inline code
                            in ProgramSummarySection and WorkstreamHealthCard
```

### Modified Files

```
components/Dashboard/DashboardContainer.tsx
  — Add exportInProgress state
  — Add handleExport callback (dynamic import + buildPresentation + download)
  — Render <ExportControl> in header Group alongside <SyncControl>
  — (No new changes from Story 9 — handleExport already awaits buildPresentation.)

components/Dashboard/ProgramSummarySection.tsx  ⭐ Story 9
  — Replace inline bug burndown chart block with <BugBurndownChart trendSprints={programTrendSprints} />

components/Dashboard/WorkstreamHealthCard.tsx   ⭐ Story 9
  — Replace inline bug burndown chart block with <BugBurndownChart trendSprints={trendSprints} />

package.json
  — Add pptxgenjs dependency
  — Add html-to-image dependency (Story 8)
```

### Chart Rendering (Recharts → PNG)

Every chart is a PNG image captured from a live dashboard React component. pptxgenjs receives it via `slide.addImage({ data, x, y, w, h })`.


| Slide Chart             | Source Component                                    | Data Props                                                |
| ----------------------- | --------------------------------------------------- | --------------------------------------------------------- |
| Program Velocity        | `<VelocityTrendChart/>`                             | `trendSprints={programTrendSprints}, prediction={sprint5Prediction}` |
| Program Bug Burndown    | `<BugBurndownChart/>` (shared, new in Story 9)      | `trendSprints={programTrendSprints}`                      |
| Velocity (per ws)       | `<VelocityTrendChart/>`                             | `trendSprints={ws.trendSprints}, prediction={ws.prediction}` |
| Bug Burndown (per ws)   | `<BugBurndownChart/>`                               | `trendSprints={ws.trendSprints}`                          |
| Overhead (per ws)       | `<OverheadCompositionChart/>`                       | `composition={ws.overheadComposition}`                    |
| Milestone burnup        | `<BurnupChart/>`                                    | `burnupData={milestone.burnupData}, height={160}`         |


Color palette, markers, legend placement, and axis styling inherit from the dashboard's Recharts theme — no chart styling duplication in the export layer.


### ExportInput Type

```ts
interface ExportInput {
  sprintName: string;
  computedAt: string | null;
  programMetrics: MetricTileViewModel[] | null;
  programRollup: ApiProgramMilestoneRollup | null;
  programTrendSprints: TrendSprintViewModel[];  // 🆕 for Slide 1 velocity + bug burndown charts
  sprint5Prediction: {                          // 🆕 for Slide 1 velocity forecasted overlay
    rawVelocity: number | null;
    sprintLabel: string;
    isPredicted: boolean;
  } | null;
  workstreams: WorkstreamCardViewModel[];    // from DashboardViewModel.workstreamCards
  rawWorkstreams: ApiWorkstream[];           // from rawMetrics.workstreams (for trend data)
  milestones: ApiMilestoneWithProgress[];
}
```

---

## Error & Rescue Map


| Operation                     | What Can Fail                       | Planned Handling                                                    |
| ----------------------------- | ----------------------------------- | ------------------------------------------------------------------- |
| `import('pptxgenjs')`         | Module load failure                 | Catch → error notification, button reset                            |
| `import('html-to-image')`     | Module load failure                 | Catch → error notification, button reset                            |
| `renderChartToPng()`          | html-to-image rejection, unmount failure, SVG serialization error | Wrap each call in try/finally to always unmount; a chart-level failure renders a placeholder "chart unavailable" text box on that slide but does not abort the full export |
| `buildPresentation()`         | Exception during slide construction | Catch in handleExport → error notification                          |
| Milestone data                | Empty array (pipeline broken)       | Render placeholder slide, no crash                                  |
| Missing workstream trend data | `trendSprints === []`               | Skip chart capture, render "No trend data" text                     |
| Browser download              | Pop-up blocker                      | Blob URL + programmatic `<a>` click — unaffected by pop-up blockers |
| No metrics loaded             | `rawMetrics === null`               | Proceed with null-safe defaults; all content slides show "No data"  |
| Recharts animation race       | Capture fires mid-animation         | Renderer disables entry animations via component props; awaits `rAF` + microtask before capture |


---

## Shadow Paths


| Flow                 | Happy Path                              | No Data                                         | Partial Data                              | Export Error                    |
| -------------------- | --------------------------------------- | ----------------------------------------------- | ----------------------------------------- | ------------------------------- |
| Full export          | 21 slides downloaded                    | Slides generated with placeholder text          | Incomplete slides render what's available | Error notification, no download |
| Program summary      | Tiles + velocity + bug burndown charts  | Tiles render; charts omitted with placeholder   | Tiles render; partial chart data shown    | Same as export error            |
| Bug burndown slides  | Stacked bar per sprint (Open + Closed)  | "No bug data available" placeholder             | All-zero bars render without crash        | Same as export error            |
| Milestone slides     | Burnup chart per goal                   | "Milestone data unavailable" placeholder        | Charts for available goals only           | Same as export error            |


---

## Dependencies & References

- **Depends on:** `GET /api/metrics` (existing), `GET /api/milestones` (existing)
- **Soft dependency:** `adp-milestones-panel` spec (milestone data may be sparse)
- **Related specs:** `2026-02-12-program-dashboard-ui`, `2026-02-19-workstream-velocity`, `2026-02-20-workstream-overhead`, `2026-02-20-workstream-milestones`, `2026-03-05-recharts-chart-library`
- **Related issue:** `.writ/issues/improvements/2026-04-16-pptx-charts-match-dashboard.md` — motivates the Recharts switch
- **Library:** [pptxgenjs](https://gitbrent.github.io/PptxGenJS/) — browser-compatible, no server required
- **Library:** [html-to-image](https://github.com/bubkoo/html-to-image) — browser-side DOM → PNG/SVG rasterization; used to capture Recharts output
- **Reused dashboard components:** `VelocityTrendChart`, `OverheadCompositionChart`, `BurnupChart` (existing); `BugBurndownChart` (new, extracted during Story 9)

