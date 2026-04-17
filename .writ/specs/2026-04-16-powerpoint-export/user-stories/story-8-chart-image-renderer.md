# Story 8: Chart Image Renderer Infrastructure 🆕

**Status:** Completed ✅
**Priority:** High
**Dependencies:** Story 1 (Export Infrastructure) — uses existing `lib/export/` module folder
**Effort:** S (~2h)

## User Story

As a PowerPoint-export implementer,
I want a reusable utility that turns a React element into a PNG data URL at export time,
So that each slide builder can embed a captured Recharts image with one function call and the dashboard's chart design language comes through unchanged.

## Acceptance Criteria

**Given** a React element and target width/height,
**When** I call `renderChartToPng(element, { width, height })`,
**Then** the function returns a PNG data URL (`data:image/png;base64,...`) without leaving a visible flash in the viewport.

**Given** the render succeeds,
**When** the returned promise resolves,
**Then** the temporary host DIV is removed from `document.body` and the React root is unmounted.

**Given** `html-to-image.toPng` rejects mid-render,
**When** the rejection propagates,
**Then** the temporary host DIV is still removed and the React root is still unmounted (try/finally guarantee) — no DOM leak, no mounted components.

**Given** the chart subtree uses Mantine theme tokens (`blue.6`, `red.6`, etc.),
**When** it renders inside the hidden host,
**Then** theme colors resolve identically to the main dashboard because the host is wrapped in `<MantineProvider>`.

**Given** `pixelRatio` is omitted,
**When** the PNG is produced,
**Then** it defaults to `2` (retina-quality capture).

**Given** the DOM is inspected during capture,
**When** the host DIV is measured,
**Then** it is positioned absolutely off-screen (`left: -99999px`) with the requested `width` and `height` — never `display: none`.

## Implementation Tasks

- [x] Install `html-to-image` via pnpm: `pnpm add html-to-image` — latest 1.x (current: `^1.11`)
- [x] Create `lib/export/render/chart-image.tsx` with the following public API:
  - `interface ChartCaptureOptions { width: number; height: number; pixelRatio?: number; backgroundColor?: string }`
  - `async function renderChartToPng(element: ReactElement, opts: ChartCaptureOptions): Promise<string>`
- [x] Implementation details:
  - Create a `<div data-pptx-chart-host>` child of `document.body` with inline style `position: absolute; left: -99999px; top: 0; width: {width}px; height: {height}px; background: {backgroundColor ?? 'white'};`
  - Use `createRoot(host).render(<MantineProvider>{element}</MantineProvider>)` from `react-dom/client`
  - Await `requestAnimationFrame` then a microtask (`await Promise.resolve()`) to let Recharts commit its first SVG paint
  - Call `toPng(host, { pixelRatio: opts.pixelRatio ?? 2, cacheBust: true, backgroundColor: opts.backgroundColor ?? 'white' })`
  - Wrap in try/finally: always `root.unmount(); host.remove();` even on rejection
  - Return the data URL
- [x] Write unit tests in `__tests__/lib/export/render/chart-image.test.tsx`:
  - Happy path: mock `html-to-image.toPng` to return `'data:image/png;base64,FAKE'`; call `renderChartToPng(<div/>, { width: 100, height: 100 })`; assert returned value equals the fake data URL
  - Cleanup: after the call resolves, assert `document.querySelectorAll('[data-pptx-chart-host]').length === 0`
  - Error path: mock `toPng` to reject with `new Error('boom')`; assert the promise rejects with that error AND the host DIV is still removed
  - PixelRatio default: assert `toPng` receives `pixelRatio: 2` when none is passed
  - PixelRatio override: assert `toPng` receives `pixelRatio: 3` when `{ pixelRatio: 3 }` is passed
  - Mantine wrapper: mock `createRoot` and capture the rendered tree; assert the tree is wrapped in a `MantineProvider` (match by display name or instanceof)
  - Size attribution: assert the created host DIV has `style.width === '100px'` and `style.height === '100px'` before `toPng` is called
- [x] Typecheck with `pnpm typecheck` and lint with `pnpm eslint` — fix any errors introduced

## Technical Notes

- **Why `position: absolute; left: -99999px` instead of `display: none` or `visibility: hidden`:** SVG layout (including Recharts dimensions) relies on real box measurements. `display: none` strips layout; `visibility: hidden` preserves layout but doesn't prevent paint flash. Offscreen absolute positioning is the canonical approach used by libraries like `html-to-image`'s own docs.
- **Why Mantine wrapping:** the dashboard's chart components use Mantine theme tokens (`blue.6` etc.) that resolve to CSS custom properties injected by `MantineProvider`. Without wrapping, the hidden subtree inherits the document's CSS cascade — which usually works because the app root already injects those vars, BUT this is fragile if the export runs before the main provider mounts. Wrapping belt-and-braces.
- **Why `requestAnimationFrame` + microtask:** Recharts commits SVG on its first render tick. `rAF` guarantees a frame has passed; the microtask flush lets any effect cleanup settle before capture.
- **File naming `.tsx`:** file has JSX (the `<MantineProvider>` wrap). The rest of `lib/export/` is `.ts`.
- **Jest + JSDOM caveat:** JSDOM does not rasterize SVG, so tests mock `html-to-image.toPng`. Real rasterization is verified manually.
- **Pre-existing import style:** match the existing `lib/export/` convention — type-only imports with `import type`, module-level `'use client'` only when necessary. This module is client-only but does not need the directive at module level because it's called from `handleExport` (already client-side).

## Context for Agents

- `.writ/specs/2026-04-16-powerpoint-export/spec.md` → "### Chart Image Rendering Strategy"
- `.writ/specs/2026-04-16-powerpoint-export/sub-specs/technical-spec.md` → `### lib/export/render/chart-image.tsx`
- `lib/export/` existing module patterns (types.ts, rag-colors.ts, slides/*.ts) — match code style
- `components/Dashboard/VelocityTrendChart.tsx` — example of a dashboard chart that this renderer will mount in Story 9
- [html-to-image docs](https://github.com/bubkoo/html-to-image) — specifically `toPng(node, options)` signature

## Definition of Done

- [x] `html-to-image` appears in `package.json` dependencies
- [x] `lib/export/render/chart-image.tsx` exists and exports `renderChartToPng` + `ChartCaptureOptions`
- [x] All unit tests pass (happy path, cleanup, error cleanup, pixelRatio default/override, Mantine wrap, host sizing)
- [x] `pnpm typecheck` clean for the new file
- [x] `pnpm eslint` clean for the new file
- [x] No import-level side effects that would affect SSR — the module imports `html-to-image` and `react-dom/client` at the top; since it's only loaded from `handleExport` (client-side), this is acceptable — verify by inspecting the `app/` dir does not import it
