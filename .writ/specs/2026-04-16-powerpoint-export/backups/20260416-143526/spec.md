# Phase 1F: PowerPoint Export

> **Status:** Not Started
> **Date:** 2026-04-16
> **Effort:** M (1–2 days)
> **Phase:** 1F — Final Phase 1 deliverable
> **Roadmap:** `.writ/product/roadmap.md → Phase 1F`

---

## Contract (Locked)

**Deliverable:** One-click client-side PowerPoint export of all four dashboard sections to a stakeholder-ready `.pptx` file using pptxgenjs native charts. Generic layout — no branding or custom styling (reserved for a future style skill).

**Must Include:** A working download trigger that produces a complete `.pptx` with all slide types populated from existing dashboard React state.

**Hardest Constraint:** Rendering Recharts-equivalent visualizations in pptxgenjs without a DOM — native chart objects only, no image capture.

**Slide Structure (16 slides for 5 workstreams, grouped by workstream):**

- Slide 1: Program Summary
- Slides 2–4: Streams (Velocity → Overhead → Milestone)
- Slides 5–7: Action Tracker (Velocity → Overhead → Milestone)
- Slides 8–10: Pitch Tracker (Velocity → Overhead → Milestone)
- Slides 11–13: KPI Services (Velocity → Overhead → Milestone)
- Slides 14–16: UCM (Velocity → Overhead → Milestone)

**Success Criteria:** Export completes in < 5 seconds; file opens in PowerPoint without errors; chart data matches the dashboard's current rolling window; file is named `LiveLink-Health-Report-{YYYY-MM-DD}.pptx`.

**Scope Boundaries:**

- Included: pptxgenjs install, 4 slide types, client-side generation, download trigger, loading/error states
- Excluded: Branding/colors/fonts beyond generic defaults (style skill later), item-level detail tables (bugs/spikes/support lists), Recharts image capture, server-side generation, stakeholder-specific variants (Phase 3)

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

The file opens in PowerPoint and the stakeholder sees 16 slides with the correct workstream data, chart visualizations, and RAG status — matching what the dashboard displays.

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

Slides are grouped by workstream, not by section type. Within each workstream group, order is always: Velocity → Overhead → Milestone. Program Summary is always first.

### Data Source

All export data comes from React state already in memory. No additional API calls are made at export time. Data shapes used:

- `rawMetrics: ApiResponse` — program metrics, workstream metrics, trend sprints
- `milestones: ApiMilestoneWithProgress[]` — milestone burnup data
- `programRollup: ApiProgramMilestoneRollup | null` — program-level milestone summary

### Empty/Missing Data Handling


| Missing Data                      | Behavior                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| `rawMetrics === null`             | All workstream slides render with "No data available" placeholder text; chart is omitted |
| `milestones === []`               | Milestone slides render "Milestone data unavailable" placeholder text; chart is omitted  |
| `programRollup === null`          | Program Summary milestone tiles show "–"                                                 |
| A single workstream has no trends | That workstream's velocity/overhead slides render with "No trend data"                   |


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

### Workstream Ordering

Workstreams appear in the slide deck in the order returned by `rawMetrics.workstreams` (currently alphabetical by name from the API: Action Tracker, KPI Services, Pitch Tracker, Streams, UCM). This matches the dashboard card order.

---

## Slide Specifications

### Slide 1: Program Summary

**Content:**

- Title: "Program Health Summary — {sprintName}"
- 5 KPI metric tiles (rendered as colored rectangles + text):
  1. Average Velocity — value, rolling avg, RAG fill
  2. Overhead % — value, rolling avg, RAG fill
  3. Carry-Over % — value, rolling avg, RAG fill
  4. Monthly Milestone % — `programRollup.currentMonthCompletionPercent` or "–"
  5. Quarterly Milestone Progress — `quarterlyMilestones.complete / quarterlyMilestones.total` or "–"
- Footer: "Generated {YYYY-MM-DD} | {computedAt}"

**Layout:** 5 tiles in a horizontal row, ~1.6" wide each, with label + value + avg text stacked inside.

### Slide 2+ (per workstream): Velocity

**Title:** "{WorkstreamName} — Velocity"
**Content:**

- pptxgenjs line chart:
  - Series 1 "Velocity (SP)" — `trendSprints.rawVelocity` per sprint (actuals only, `isCurrent: false`)
  - Series 2 "Current Sprint" — single point for the current sprint velocity (dashed/distinct color)
  - Series 3 "Rolling Avg" — `trendSprints.velocityAvg` per sprint (reference line)
  - X-axis: sprint names
- Key metrics text block: Current Velocity · Rolling Avg · RAG status · Predicted Next Sprint

### Slide 3+ (per workstream): Overhead

**Title:** "{WorkstreamName} — Overhead"
**Content:**

- pptxgenjs stacked bar chart:
  - One bar per sprint (x-axis: sprint names)
  - Stacks: Meetings · Bugs · Spikes · Support (hours from `overheadBreakdown`)
- Key metrics text: Overhead % (current) · Rolling Avg Overhead %

### Slide 4+ (per workstream): Milestone

**Title:** "{WorkstreamName} — Milestones"
**Content:**

- For each milestone goal belonging to this workstream (`milestones.filter(m => m.workstreamId === wsId)`):
  - pptxgenjs line chart of burnup: cumulative completed SP vs. total SP across sprints
  - % complete label
- If no milestones: text placeholder "Milestone data unavailable for this workstream"

---

## Implementation Approach

### New Files

```
lib/export/
├── index.ts              — public API: buildPresentation(), downloadPresentation()
├── builder.ts            — orchestrates slide order (program → per-workstream)
├── types.ts              — ExportInput type (subset of DashboardContainer state)
├── rag-colors.ts         — RAG hex color constants
└── slides/
    ├── program-summary.ts
    ├── velocity.ts
    ├── overhead.ts
    └── milestone.ts

components/Dashboard/
└── ExportControl.tsx     — "Export PPTX" button with loading/error states
```

### Modified Files

```
components/Dashboard/DashboardContainer.tsx
  — Add exportInProgress state
  — Add handleExport callback (dynamic import + buildPresentation + download)
  — Render <ExportControl> in header Group alongside <SyncControl>

package.json
  — Add pptxgenjs dependency
```

### pptxgenjs Chart Objects

pptxgenjs native chart types used:


| Slide Type       | pptxgenjs type | Config                                                |
| ---------------- | -------------- | ----------------------------------------------------- |
| Velocity         | `line`         | Multiple series: actuals, current sprint, rolling avg |
| Overhead         | `bar`          | `barGrouping: 'stacked'`, one series per category     |
| Milestone burnup | `line`         | Two series: completed SP, total SP (flat line target) |


### ExportInput Type

```ts
interface ExportInput {
  sprintName: string;
  computedAt: string | null;
  programMetrics: MetricTileViewModel[] | null;
  programRollup: ApiProgramMilestoneRollup | null;
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
| `buildPresentation()`         | Exception during slide construction | Catch in handleExport → error notification                          |
| Milestone data                | Empty array (pipeline broken)       | Render placeholder slide, no crash                                  |
| Missing workstream trend data | `trendSprints === []`               | Skip chart, render "No trend data" text                             |
| Browser download              | Pop-up blocker                      | Blob URL + programmatic `<a>` click — unaffected by pop-up blockers |
| No metrics loaded             | `rawMetrics === null`               | Proceed with null-safe defaults; all content slides show "No data"  |


---

## Shadow Paths


| Flow             | Happy Path            | No Data                                  | Partial Data                              | Export Error                    |
| ---------------- | --------------------- | ---------------------------------------- | ----------------------------------------- | ------------------------------- |
| Full export      | 16 slides downloaded  | Slides generated with placeholder text   | Incomplete slides render what's available | Error notification, no download |
| Milestone slides | Burnup chart per goal | "Milestone data unavailable" placeholder | Charts for available goals only           | Same as export error            |


---

## Dependencies & References

- **Depends on:** `GET /api/metrics` (existing), `GET /api/milestones` (existing)
- **Soft dependency:** `adp-milestones-panel` spec (milestone data may be sparse)
- **Related specs:** `2026-02-12-program-dashboard-ui`, `2026-02-19-workstream-velocity`, `2026-02-20-workstream-overhead`, `2026-02-20-workstream-milestones`
- **Library:** [pptxgenjs](https://gitbrent.github.io/PptxGenJS/) — browser-compatible, no server required

