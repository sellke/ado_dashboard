# PowerPoint Export (Lite)

> Source: .writ/specs/2026-04-16-powerpoint-export/spec.md
> Purpose: Efficient AI context for implementation

## For Coding Agents

**Deliverable:** Client-side `.pptx` export via pptxgenjs native charts. "Export PPTX" button in `DashboardContainer` header. **21 slides** grouped by workstream (Program Summary with KPI tiles + program velocity + program bug burndown → per-workstream: Velocity, Bug Burndown, Overhead, Milestone).

**Implementation Approach:**

- Dynamic import: `(await import('pptxgenjs')).default` on button click (avoids SSR)
- Module: `lib/export/` — `index.ts`, `builder.ts`, `types.ts`, `rag-colors.ts`, `slides/*.ts`
- Component: `components/Dashboard/ExportControl.tsx` — button with loading/error states
- `DashboardContainer.tsx` — `exportInProgress` state, `handleExport`, render `<ExportControl>`

**Files in Scope:**

- `lib/export/index.ts` — `buildPresentation()`, `downloadPresentation()`
- `lib/export/builder.ts` — slide orchestration (program → workstreams in new 4-slide order)
- `lib/export/types.ts` — `ExportInput` type (now includes `programTrendSprints` + `sprint5Prediction`)
- `lib/export/rag-colors.ts` — RAG hex constants
- `lib/export/slides/program-summary.ts` — ⭐ tiles + program velocity + program bug burndown
- `lib/export/slides/velocity.ts`
- `lib/export/slides/bug-burndown.ts` — 🆕 stacked bar: Open (red) + Closed (green) per sprint
- `lib/export/slides/overhead.ts`
- `lib/export/slides/milestone.ts`
- `components/Dashboard/ExportControl.tsx`
- `components/Dashboard/DashboardContainer.tsx` — pass `programTrendSprints` + `sprint5Prediction` in `ExportInput`
- `package.json` — `pptxgenjs`

**pptxgenjs Chart Types:**

- Program Velocity → `line`, two series (completed points, forecasted overlay)
- Program Bug Burndown → `bar` with `barGrouping: 'stacked'`, Open (red) + Closed (green) counts
- Velocity (per ws) → `line`, multiple series (actuals, current sprint, rolling avg)
- Bug Burndown (per ws) → `bar` with `barGrouping: 'stacked'`, Open (red) + Closed (green) counts
- Overhead → `bar` with `barGrouping: 'stacked'` (Meetings/Bugs/Spikes/Support hours)
- Milestone burnup → `line`, two series (completed SP, total SP flat target)

**RAG / Chart Colors:** Green `#2f9e44` · Amber `#e67700` · Red `#c92a2a` · null `#868e96`. Bug burndown uses Green (`2f9e44`) for Closed, Red (`c92a2a`) for Open.

**File naming:** `LiveLink-Health-Report-{YYYY-MM-DD}.pptx` (local date at export time)

---

## For Review Agents

**Acceptance Criteria:**

1. Clicking "Export PPTX" downloads a valid `.pptx` in < 5 seconds with dashboard data loaded
2. File contains exactly **21 slides** in the correct order (Program Summary + 4 slides × 5 workstreams)
3. Program Summary slide contains the 5 KPI tiles on the top half and the program velocity + program bug burndown charts on the bottom half
4. Each workstream's slide group is ordered **Velocity → Bug Burndown → Overhead → Milestone**
5. Each bug burndown slide (program + per-workstream) is a stacked bar with `Open (New/Active)` in red and `Closed (Resolved/Testing/Closed)` in green
6. Export button shows loading state during generation and returns to idle after
7. Export errors surface as Mantine notification — no silent failures, no dashboard disruption

**Business Rules:**

- All data sourced from React state — no API calls at export time
- Workstream order: as returned by `viewModel.workstreamCards` (alphabetical by name)
- Slide group order per workstream: **Velocity → Bug Burndown → Overhead → Milestone**
- Empty `programTrendSprints` → Program Summary charts omitted with placeholder; tiles still render
- Empty per-workstream `trendSprints` → bug burndown slide shows "No bug data available"
- Empty milestone data → placeholder text slide, no crash
- `rawMetrics === null` → all workstream slides render "No data available"
- pptxgenjs loaded via dynamic import only (never in server bundle)

**Experience Design:**

- Entry: "Export PPTX" button in header alongside "Sync Now"
- Happy path: click → spinner → download triggers → idle
- Feedback: loading state in button; success is the file download itself
- Error: Mantine `notifications.show()` with error message

---

## For Testing Agents

**Success Criteria:**

1. `buildPresentation()` returns a pptxgenjs Presentation object with **21 slides** given full mock data for 5 workstreams
2. `buildPresentation()` does not throw when `milestones === []`, `rawMetrics === null`, or `programTrendSprints === []`
3. `buildBugBurndownSlide(prs, ws)` renders a stacked bar chart with two series (Open, Closed) from `ws.trendSprints`
4. `buildProgramSummarySlide()` renders KPI tiles plus velocity and bug burndown charts when `programTrendSprints` is non-empty; omits charts when empty
5. `ExportControl` renders a disabled button with spinner during `isExporting === true`
6. RAG color map covers all four states (Green, Amber, Red, null)

**Shadow Paths to Verify:**

- **Happy path:** 21 slides generated, downloaded, open in PowerPoint
- **No metrics:** `rawMetrics === null` → slides contain placeholder text, no crash
- **No program trend:** `programTrendSprints === []` → Program Summary charts omitted; tiles + footer still render
- **No workstream trend:** `trendSprints === []` → bug burndown + velocity slides show placeholder text
- **No milestones:** `milestones === []` → milestone slides show placeholder, no crash
- **Export error:** pptxgenjs throws → Mantine notification shown, button resets to idle

**Edge Cases:**

- Workstream with all-zero bug counts → bug burndown slide renders with all zero-height bars, no crash
- Current sprint present in program trend → forecasted velocity overlays at that position (not a new bar)
- `programRollup === null` → milestone KPI tiles on Program Summary show "–"

**Coverage Requirements:**

- `lib/export/` unit tests: every slide builder with null/empty inputs (including the new `bug-burndown.ts`)
- `ExportControl` component: loading, idle, and error states
- RAG color mapping: all four inputs
- Builder slide-count assertion: exactly `1 + (workstreams.length × 4)` slides

**Test Strategy:**

- Unit test each slide builder function with mock `ExportInput` data
- Unit test null/empty guard cases for each slide type
- Component test `ExportControl` with `@testing-library/react`
