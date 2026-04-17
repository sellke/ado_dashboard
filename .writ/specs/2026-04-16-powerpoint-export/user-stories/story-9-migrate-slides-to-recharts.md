# Story 9: Migrate Slides to Recharts Images 🆕

**Status:** Completed ✅
**Priority:** High
**Dependencies:** Story 8 (Chart Image Renderer Infrastructure). Implicitly depends on Stories 1–7 (their implementations own the non-chart parts of each slide).
**Effort:** M (~3.5h)

## User Story

As a stakeholder reviewing an exported PowerPoint,
I want every chart on every slide to look exactly like the dashboard,
So that the printed deck is visually identical to what I see on screen — same colors, markers, legend placement, axes, typography.

## Acceptance Criteria

**Given** the dashboard is loaded and I click "Export PPTX",
**When** the file downloads,
**Then** every chart embedded in the deck is a PNG rendered from the actual dashboard Recharts component, visually indistinguishable from the live view.

**Given** the Program Summary slide is built,
**When** I look at its chart area,
**Then** I see two captured chart images: a velocity chart (from `<VelocityTrendChart/>`) on the left and a bug burndown chart (from `<BugBurndownChart/>`) on the right — both using the dashboard's exact styling.

**Given** each workstream's slide group is built,
**When** I examine each slide,
**Then** each chart is a captured image from the corresponding dashboard component: `<VelocityTrendChart/>` on the Velocity slide, `<BugBurndownChart/>` on the Bug Burndown slide, `<OverheadCompositionChart/>` on the Overhead slide, and `<BurnupChart/>` on the Milestones slide (one per milestone goal).

**Given** I open `components/Dashboard/ProgramSummarySection.tsx` and `components/Dashboard/WorkstreamHealthCard.tsx`,
**When** I search for inline bug burndown chart code (`buildBugChartData`, inline `<AppBarChart/>` with `Open (New/Active)` series),
**Then** neither file contains it — both consume `<BugBurndownChart/>` from the new shared component.

**Given** `trendSprints` or `overheadComposition` or `milestones.burnupData` is empty,
**When** the corresponding slide is built,
**Then** no chart capture is attempted and the placeholder text renders instead — matching the pre-Story-9 empty-state behavior.

**Given** a single chart capture fails mid-export,
**When** the error is caught,
**Then** that slide renders a "Chart unavailable" text box in place of the image and the export continues to completion with the remaining 20 slides intact.

**Given** the full export runs with 5 workstreams and 1 milestone each,
**When** I time the operation,
**Then** it completes in under 5 seconds with dashboard data already loaded (~16 chart captures × ~200ms avg ≈ 3.2s + pptxgenjs overhead).

**Given** the integration test `__tests__/lib/export/builder.test.ts` runs,
**When** it asserts on `buildPresentation()`,
**Then** the test `await`s the promise, asserts 21 slides, and the assertions on per-slide behavior use mocked `renderChartToPng` (not a real `html-to-image` call).

## Implementation Tasks

- [x] Create `components/Dashboard/BugBurndownChart.tsx` (see technical-spec.md → `### components/Dashboard/BugBurndownChart.tsx` for the exact implementation)
- [x] Write a component test `__tests__/components/Dashboard/BugBurndownChart.test.tsx`: empty `trendSprints` → returns null; populated → renders `AppBarChart` with 2 series named `Open (New/Active)` and `Closed (Resolved/Testing/Closed)`; current-sprint label shows `(Cur)` suffix
- [x] Refactor `components/Dashboard/ProgramSummarySection.tsx`: delete `buildBugChartData` local helper + the inline `<AppBarChart/>` block inside the Bug Burndown card; replace with `<BugBurndownChart trendSprints={programTrendSprints} height={220} />` (keep the Card/Stack wrapper and the "Bug Burndown" heading)
- [x] Refactor `components/Dashboard/WorkstreamHealthCard.tsx`: delete its local `buildBugChartData` helper (around line 45) + inline `<AppBarChart/>` block; replace with `<BugBurndownChart trendSprints={trendSprints} height={220} />`
- [x] Verify the existing dashboard tests still pass (`__tests__/components/Dashboard/ProgramSummarySection.test.tsx`, `__tests__/components/Dashboard/WorkstreamHealthCard.test.tsx`) — if they assert on inline test IDs or DOM shapes that are now encapsulated, update the assertions to check `BugBurndownChart` render (e.g. `screen.getByTestId(...)` → `screen.getByRole('img', { name: /bug burndown/i })` or similar)
- [x] Update `lib/export/slides/program-summary.ts`:
  - Make the function `async`
  - Import `renderChartToPng` and both chart components
  - Inside the trend-data branch, `await renderChartToPng(<VelocityTrendChart .../>, { width: 620, height: 370 })` → `slide.addImage({ data: dataUrl, x: 0.3, y: 3.0, w: 6.2, h: 3.7 })`
  - Same for Bug Burndown chart at x: 6.8
  - Wrap each capture in try/catch; on failure, replace that chart's image with a text box `'Chart unavailable'` at the same coordinates
  - Remove all `slide.addChart(...)` calls
- [x] Update `lib/export/slides/velocity.ts`:
  - Make `async`; capture `<VelocityTrendChart trendSprints={ws.trendSprints} prediction={ws.prediction} />` at 850×550; embed at x: 0.3, y: 0.85, w: 8.5, h: 5.5
  - Remove `slide.addChart(...)`
- [x] Update `lib/export/slides/bug-burndown.ts`:
  - Make `async`; capture `<BugBurndownChart trendSprints={ws.trendSprints} height={550} />` at 850×550; embed at x: 0.3, y: 0.85, w: 8.5, h: 5.5
  - Remove `slide.addChart(...)`
- [x] Update `lib/export/slides/overhead.ts`:
  - Make `async`; capture `<OverheadCompositionChart composition={ws.overheadComposition} />` at 850×550; embed at x: 0.3, y: 0.85, w: 8.5, h: 5.5
  - Remove `slide.addChart(...)`
- [x] Update `lib/export/slides/milestone.ts`:
  - Make `async`; for each of the first 3 milestones with non-empty `burnupData`, capture `<BurnupChart burnupData={milestone.burnupData} height={160} />` at 1270×160; embed at y=0.85, 2.85, 4.85; w=12.7, h=1.75
  - Remove all `slide.addChart(...)` calls
- [x] Update `lib/export/builder.ts`:
  - Change `buildPresentation` return type to `Promise<InstanceType<typeof PptxGenJS>>`
  - Mark `async`; prefix each slide builder call with `await`
  - JSDoc: update "Total slides" line to read "Total slides = 1 + (workstreams.length × 4). Each builder is async (captures Recharts charts as PNG images). Executes serially to avoid DOM mount spikes."
- [x] Update `__tests__/lib/export/slides.test.ts`:
  - Mock `lib/export/render/chart-image` so `renderChartToPng` returns `'data:image/png;base64,MOCK'`
  - Mock the dashboard chart components to avoid Recharts rendering in JSDOM
  - Each slide builder test must `await` the builder call
  - Replace all `prs._slide.addChart.mock.calls` assertions with `prs._slide.addImage.mock.calls` assertions
  - Assert each builder calls `renderChartToPng` with the expected component and dimensions (spying on the mock)
- [x] Update `__tests__/lib/export/bug-burndown.test.ts`: same pattern — `await` the async builder; assert `addImage` instead of `addChart`
- [x] Update `__tests__/lib/export/builder.test.ts`:
  - Mock `lib/export/render/chart-image`; mock dashboard chart components as before
  - `await buildPresentation(...)` in each test
  - Keep the 21-slide and per-workstream ordering assertions; they still hold
  - Add one new test: "continues through the full deck when a single chart capture rejects" — make `renderChartToPng` reject once on the 5th call (a bug burndown slide), assert 21 slides still produced, assert that slide has a text fallback in its `addText.mock.calls` matching `/chart unavailable/i`
- [x] Run the full `pnpm jest __tests__/lib/export/` — all suites must pass
- [x] Run the full `pnpm jest __tests__/components/Dashboard/BugBurndownChart.test.tsx` — must pass
- [x] Verify `pnpm typecheck` is clean across all touched files

## Technical Notes

- **Story 8 must land first.** This story consumes `renderChartToPng` — there's nothing to import until Story 8 ships.
- **DashboardContainer needs no change.** `handleExport` already `await`s `buildPresentation(PptxGenJS, input)`. The return type change from `PptxGenJS` to `Promise<PptxGenJS>` is backward-compatible with `await`.
- **Per-chart sizing rationale:** the pixel dimensions passed to `renderChartToPng` are 2× the PowerPoint inch dimensions (at 100 DPI baseline). Example: a 6.2"×3.7" slide area at roughly 100 DPI = 620×370 px target; `pixelRatio: 2` then captures at 1240×740 for crisp retina output without ballooning file size.
- **Capture order:** serial. Rendering 16+ charts in parallel spikes DOM weight, CSS recomputation, and Recharts `ResizeObserver` traffic — sequential is simpler and still fits the 5s budget.
- **Error isolation:** per-chart try/catch means one chart's failure does not cascade. The overall `buildPresentation` promise still resolves; `handleExport` still downloads the deck.
- **Animation suppression:** the dashboard charts already use `isAnimationActive: false` on tooltips (see `VelocityTrendChart.tsx` line 133). Entry animations for lines/bars are shorter (~500ms) and mostly complete within one `requestAnimationFrame` + microtask. If visual review shows half-drawn charts, pass additional animation-disabling props through the component or extend the renderer to wait longer before capture. Start conservative (current plan); extend only if needed.
- **Mocking dashboard components in tests:** use `jest.mock('@/components/Dashboard/VelocityTrendChart', () => ({ VelocityTrendChart: () => null }))` etc. at the top of each affected test file. This keeps JSDOM out of Recharts' `ResizeObserver` code path entirely.
- **`slide.addImage` signature** (pptxgenjs): `slide.addImage({ data: string, x: number, y: number, w: number, h: number })` where `data` is a data URL (`data:image/png;base64,...`).
- **Rolling back:** revert commits that touch `lib/export/slides/*.ts` and `lib/export/builder.ts`; the renderer module and dashboard refactor can stay (no regressions there).

## Context for Agents

- `.writ/specs/2026-04-16-powerpoint-export/spec.md` → "## Slide Specifications" (updated sections)
- `.writ/specs/2026-04-16-powerpoint-export/sub-specs/technical-spec.md` → `### lib/export/slides/*.ts` (each section)
- `components/Dashboard/VelocityTrendChart.tsx` — consumed as-is
- `components/Dashboard/OverheadCompositionChart.tsx` — consumed as-is
- `components/Dashboard/BurnupChart.tsx` — consumed as-is
- `components/Dashboard/ProgramSummarySection.tsx` — refactored to use `<BugBurndownChart/>` (dashboard-side DRY win)
- `components/Dashboard/WorkstreamHealthCard.tsx` — refactored to use `<BugBurndownChart/>`
- `.writ/specs/2026-04-16-powerpoint-export/user-stories/story-8-chart-image-renderer.md` — blocking dependency

## Definition of Done

- [x] `components/Dashboard/BugBurndownChart.tsx` exists and both dashboard call sites consume it
- [x] All five slide builders are `async` and use `renderChartToPng` + `slide.addImage` instead of `slide.addChart`
- [x] `buildPresentation()` is `async` and awaits each builder
- [x] Per-chart capture failures fall back to a "Chart unavailable" placeholder text box; the export completes
- [x] All `__tests__/lib/export/*` suites pass after the mocks/awaits updates
- [x] New `BugBurndownChart` component test passes
- [x] Existing `ProgramSummarySection` and `WorkstreamHealthCard` tests pass (updated if they asserted on inline chart internals)
- [x] `pnpm typecheck` clean
- [x] Manual visual parity check: export a deck with full data, open in PowerPoint, confirm each chart looks like the dashboard
- [x] Generation time under 5 seconds with data loaded (manual measurement)
