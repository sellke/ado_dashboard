# Technical Spec: PowerPoint Export Visualizations

> Parent: `.writ/specs/2026-06-17-powerpoint-export-visualizations/spec.md`

## Goals

- Convert the fixed export flow into a layered, section-aware presentation plan.
- Add export-ready visualization data without moving metric math into slide builders.
- Improve existing slide readability and add snapshot/detail slides while preserving graceful export behavior.
- Keep MDT native slide chrome consistent across old and new slides.

## Existing Architecture

- `components/Dashboard/DashboardContainer.tsx` assembles `ExportInput` from loaded dashboard and milestone state.
- `lib/export/builder.ts` creates a pptxgenjs presentation, sets `prs.layout = 'LAYOUT_WIDE'`, and serially invokes slide builders.
- `lib/export/slides/*.tsx` render native pptx shapes/text and capture Recharts charts via `renderChartToPng`.
- `lib/export/slide-frame.ts` and `lib/export/mdt-theme.ts` provide shared title/footer/theme helpers.
- `lib/dashboard/adapter.ts` maps API responses to display-ready dashboard view models.

## Proposed Design

### Slide Plan

Introduce a slide plan that is built before slides are rendered:

- `ProgramSnapshot`
- `WorkstreamSnapshot`
- `ProgramTrendDetails`
- `WorkstreamVelocity`
- `WorkstreamBugBurndown`
- `WorkstreamOverhead`
- `WorkstreamMilestone`
- `RollingMetricAppendix`
- `CycleTimeAppendix`
- `MilestoneContextAppendix`
- `PartialDataAppendix`

The plan owns:

- Ordered slide descriptors
- Section labels
- Total slide count
- Per-slide context for footer/page numbering
- Conditional inclusion rules for appendix/detail slides

### Export Data Contract

Extend `ExportInput` additively with display-ready data:

- Program snapshot summary
- Workstream snapshot rows/cards
- Rolling metric appendix rows
- Cycle-time summary and unavailable counts
- Milestone context summary
- Data caveats and partial-data indicators

If existing dashboard view models already contain the needed values, the export adapter should reference or copy display-ready values instead of recalculating.

### Layout Decision

Implementation must explicitly decide whether to:

1. Keep `LAYOUT_WIDE` for compatibility with current slide coordinates, or
2. Migrate export to the MDT skill's 16 x 9 inch custom layout.

Do not mix coordinate systems. If migration is chosen, update theme constants, slide frame helpers, and all slide builders in the same story.

### Slide Builder Guidelines

- Snapshot and appendix slides should use native pptx shapes/tables for performance and editability.
- Existing chart slides may continue using Recharts PNG capture.
- Every slide must call the shared footer helper.
- Placeholder states should look intentional and use MDT body-muted styling.
- Long names and labels should truncate, wrap, or reduce font size according to documented slide rules.

## Error & Rescue Map

| Operation | What Can Fail | Planned Handling | Test Strategy |
|---|---|---|---|
| Build slide plan | Unexpected workstream count or missing section data | Generate a valid minimal plan with placeholders; do not throw for absent optional data | Unit tests for zero, one, and many workstreams |
| Assemble export input | Dashboard state missing metrics, rollup, or milestones | Add caveats/placeholders; preserve existing export button behavior | Export input mapping tests |
| Capture chart image | `renderChartToPng` throws or returns unusable data | Add `Chart unavailable` placeholder and continue deck | Mock capture failure in slide builder tests |
| Render native snapshot | Long labels overflow card/table | Apply wrap/truncation/shrink rules; preserve status cue | Snapshot visual/unit tests for long labels |
| Write pptx file | pptxgenjs write fails | Existing `ExportControl` error alert remains | Existing export interaction test |
| Use MDT layout constants | Layout constants mismatch slide canvas | Explicit layout decision; update constants and tests together | Unit tests for layout constants and manual PPTX review |

## Shadow Paths

| Flow | Happy Path | Nil Input | Empty Input | Upstream Error |
|---|---|---|---|---|
| Program snapshot | Metrics, trends, status, caveats render | Null program metrics -> placeholder | No trends -> snapshot with no-trend note | Export failure alert if builder throws |
| Workstream snapshot | Cards for each scoped workstream render | Null metric values -> `N/A` | No workstreams -> empty workstream section | Builder continues if one card has partial data |
| Rolling appendix | Rows explain rolling metric drivers | Null row values -> `N/A` | No rolling rows -> explanatory empty slide | Existing dashboard error state prevents export data |
| Cycle-time appendix | Type averages and unavailable counts render | Missing averages -> `N/A` with caveat | No completed items -> no-data state | Missing endpoint data remains dashboard/API concern |
| Milestone context | Rollup and milestone progress render | Null rollup -> unavailable note | No milestones -> placeholder slide | Chart capture failure -> placeholder |

## Interaction Edge Cases

| Edge Case | Planned Handling |
|---|---|
| User clicks export repeatedly | Existing button disabled while exporting |
| Export while metrics are partially loaded | Use loaded state and explicit caveats; avoid extra API calls |
| Single workstream scope | Slide plan and page numbers still correct |
| Many workstreams | Snapshot layout paginates or creates multiple snapshot slides |
| Very long workstream names | Wrap/truncate consistently in snapshot and detail slide titles |
| Chart capture slow | Keep serial capture; avoid chart-heavy appendix slides |

## Testing Plan

- Unit tests for slide-plan construction and footer total count.
- Unit tests for export input mapping and caveat derivation.
- Slide builder tests with mocked pptxgenjs objects for nil, empty, partial, and full data.
- Regression tests for chart capture failure placeholders.
- Manual exported deck review in PowerPoint for readability, page numbering, and MDT chrome.
