# PowerPoint Export (Lite)

> Source: .writ/specs/2026-04-16-powerpoint-export/spec.md
> Purpose: Efficient AI context for implementation

## For Coding Agents

**Deliverable:** Client-side `.pptx` export via pptxgenjs native charts. "Export PPTX" button in `DashboardContainer` header. 16 slides grouped by workstream (Program Summary → per-workstream: Velocity, Overhead, Milestone).

**Implementation Approach:**

- Dynamic import: `(await import('pptxgenjs')).default` on button click (avoids SSR)
- New module: `lib/export/` — `index.ts`, `builder.ts`, `types.ts`, `rag-colors.ts`, `slides/*.ts`
- New component: `components/Dashboard/ExportControl.tsx` — button with loading/error states
- Modify: `DashboardContainer.tsx` — add `exportInProgress` state, `handleExport`, render `<ExportControl>`

**Files in Scope:**

- `lib/export/index.ts` — new: `buildPresentation()`, `downloadPresentation()`
- `lib/export/builder.ts` — new: slide orchestration (program → workstreams)
- `lib/export/types.ts` — new: `ExportInput` type
- `lib/export/rag-colors.ts` — new: RAG hex constants
- `lib/export/slides/program-summary.ts` — new
- `lib/export/slides/velocity.ts` — new
- `lib/export/slides/overhead.ts` — new
- `lib/export/slides/milestone.ts` — new
- `components/Dashboard/ExportControl.tsx` — new
- `components/Dashboard/DashboardContainer.tsx` — modified (add export state + button)
- `package.json` — add `pptxgenjs`

**pptxgenjs Chart Types:**

- Velocity → `line`, multiple series (actuals, current sprint, rolling avg)
- Overhead → `bar` with `barGrouping: 'stacked'` (Meetings/Bugs/Spikes/Support)
- Milestone burnup → `line`, two series (completed SP, total SP flat target)

**RAG Colors:** Green `#2f9e44` · Amber `#e67700` · Red `#c92a2a` · null `#868e96`

**File naming:** `LiveLink-Health-Report-{YYYY-MM-DD}.pptx` (local date at export time)

---

## For Review Agents

**Acceptance Criteria:**

1. Clicking "Export PPTX" downloads a valid `.pptx` in < 5 seconds with dashboard data loaded
2. File contains exactly 16 slides in the correct order (Program Summary + 3 slides × 5 workstreams)
3. Each velocity slide contains a line chart with sprint names on the x-axis
4. Each overhead slide contains a stacked bar chart with Meetings/Bugs/Spikes/Support series
5. Export button shows loading state during generation and returns to idle after
6. Export errors surface as Mantine notification — no silent failures, no dashboard disruption

**Business Rules:**

- All data sourced from React state — no API calls at export time
- Workstream order: as returned by `rawMetrics.workstreams` (alphabetical by name)
- Slide group order per workstream: Velocity → Overhead → Milestone
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

1. `buildPresentation()` returns a pptxgenjs Presentation object with 16 slides given full mock data
2. `buildPresentation()` does not throw when `milestones === []` or `rawMetrics === null`
3. `ExportControl` renders a disabled button with spinner during `isExporting === true`
4. RAG color map covers all four states (Green, Amber, Red, null)

**Shadow Paths to Verify:**

- **Happy path:** 16 slides generated, downloaded, open in PowerPoint
- **No metrics:** `rawMetrics === null` → slides contain placeholder text, no crash
- **No milestones:** `milestones === []` → milestone slides show placeholder, no crash
- **Export error:** pptxgenjs throws → Mantine notification shown, button resets to idle

**Edge Cases:**

- Workstream with empty `trendSprints` → skip chart, render "No trend data" text
- `programRollup === null` → milestone KPI tiles on Program Summary show "–"
- Current sprint present in trends → renders as distinct data point (not omitted)

**Coverage Requirements:**

- `lib/export/` unit tests: slide builders with null/empty inputs
- `ExportControl` component: loading, idle, and error states
- RAG color mapping: all four inputs

**Test Strategy:**

- Unit test each slide builder function with mock `ExportInput` data
- Unit test null/empty guard cases for each slide type
- Component test `ExportControl` with `@testing-library/react`