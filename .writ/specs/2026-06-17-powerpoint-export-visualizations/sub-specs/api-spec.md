# Export Data Contract Spec

> Parent: `.writ/specs/2026-06-17-powerpoint-export-visualizations/spec.md`

## Summary

No new public HTTP endpoint is planned. This spec extends the client-side export contract used by `DashboardContainer` and `lib/export`.

## Current Contract

`ExportInput` currently includes:

- Sprint name and computed date
- Program metric tiles
- Program milestone rollup
- Program trend sprints
- Sprint 5 prediction
- Workstream card view models
- Raw workstreams for milestone matching
- Milestone records

## Proposed Additive Fields

Names are illustrative; implementation should match local style.

```ts
interface ExportInput {
  visualizationSummary?: ExportVisualizationSummary;
  workstreamSnapshots?: ExportWorkstreamSnapshot[];
  rollingMetricAppendix?: ExportRollingMetricSection[];
  cycleTimeAppendix?: ExportCycleTimeSection[];
  milestoneContext?: ExportMilestoneContext | null;
  dataCaveats?: ExportDataCaveat[];
}
```

### ExportVisualizationSummary

- Program health label
- RAG/status counts
- Current sprint/window label
- Computed date label
- Top risk/attention items
- Snapshot caveats

### ExportWorkstreamSnapshot

- Workstream id and name
- Key metric values and RAG/status cues
- Rolling-window or projected-value note
- Cycle-time/unavailable-data caveat
- Milestone status summary when available

### ExportRollingMetricSection

- Scope: `program` or `workstream`
- Metric label and current/average value
- Rolling window label
- Display rows from dashboard rolling metric view models
- Null/missing-data copy

### ExportCycleTimeSection

- Scope label
- Type rows for User Story, Spike, and Bug
- Average labels
- Completed item counts
- Unavailable item counts and caveat text

### ExportMilestoneContext

- Program monthly and quarterly rollup labels
- Workstream milestone summaries
- Sparse-data caveats

### ExportDataCaveat

- Severity: `info`, `warning`, or `critical`
- Scope label
- Message
- Affected slide or section id

## Compatibility Rules

- Existing fields remain valid.
- New fields are optional during incremental implementation.
- Slide builders must gracefully handle absent new fields.
- Metric values should be display-ready strings and raw values only where a visual encoding needs them.

## Validation Rules

- Do not infer missing numeric values as zero.
- Workstream snapshot order follows `ExportInput.workstreams`.
- Appendix sections should be omitted or replaced with a clear empty-state slide when no useful rows exist.
- Data caveats should be deduplicated by scope and message before rendering.

## Test Requirements

- Mapping tests for full data, null program metrics, empty workstreams, partial rolling rows, and cycle-time unavailable counts.
- Type-level coverage for optional fields so existing callers continue to compile.
- Builder tests proving old minimal `ExportInput` still produces a deck with placeholders.
