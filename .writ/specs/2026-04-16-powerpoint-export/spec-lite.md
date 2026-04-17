# PowerPoint Export (Lite)

> Regenerated from spec.md on 2026-04-17

## What We're Building

Client-side `.pptx` export: one-click download from the dashboard with **Recharts charts captured as PNG** at export time so slides match the live dashboard. **21 slides** (Program Summary + 4 chart slides × 5 workstreams). Native pptxgenjs for text, KPI tiles, and layout; charts via `slide.addImage` from `renderChartToPng`.

## Key Constraints

- **Performance:** Export &lt; 5 seconds with data loaded; sequential chart capture to avoid DOM spikes.
- **Data:** All from React state at export time — no extra API calls.
- **Hidden capture:** Offscreen host (`left: -99999px`), `MantineProvider` wrap, entry animations off, `html-to-image.toPng` at `pixelRatio: 2` (default).
- **pptxgenjs in Next.js:** Dynamic `import('pptxgenjs')` on button click. Webpack must resolve the **ES build** (`dist/pptxgen.es.js`); **do not** alias to `pptxgen.bundle.js` — it causes `ReferenceError: JSZip is not defined`. Client `next.config.mjs` uses `NormalModuleReplacementPlugin` for `node:*` imports and `resolve.fallback` for Node built-ins so pptxgenjs’s guarded `import('node:fs')` paths don’t break the browser bundle.
- **Soft dependency:** Milestone data may be sparse (`adp-milestones-panel`); slides degrade gracefully.

## Success Criteria

- Export completes in &lt; 5s; file opens in PowerPoint without errors.
- Charts visually match the dashboard (colors, series, markers, axes, legend).
- Filename: `LiveLink-Health-Report-{YYYY-MM-DD}.pptx`.
- Per-chart capture failure → placeholder on that slide; full deck still downloads.

## Files in Scope (representative)

- `lib/export/` — `builder.ts`, `types.ts`, `rag-colors.ts`, `index.ts`, `render/chart-image.tsx`, `slides/*.tsx`
- `components/Dashboard/ExportControl.tsx`, `BugBurndownChart.tsx`, `DashboardContainer.tsx`, chart components consumed by export
- `package.json` — `pptxgenjs`, `html-to-image`
- `next.config.mjs` — client webpack rules for pptxgenjs / `node:` (see spec.md)

## For Agents

- **Orchestration:** `buildPresentation()` is async; slide order Program Summary → per workstream (Velocity → Bug Burndown → Overhead → Milestone).
- **Related:** `.writ/issues/improvements/2026-04-16-pptx-charts-match-dashboard.md` (motivation for Recharts images vs native pptx charts).
