# Component Inventory

## Export Slide Components

| Component / Slide | Purpose | Owned By |
|---|---|---|
| Program Health Snapshot | Executive summary of program health, RAG/status distribution, trend/caveat context | Story 2 |
| Workstream Health Snapshot | Compact cards for all scoped workstreams | Story 2 |
| Existing Program Summary Slide | Current summary slide readability and context improvements | Story 3 |
| Existing Workstream Detail Slides | Velocity, bug burndown, overhead, and milestone readability improvements | Story 3 |
| Rolling Metrics Appendix | Per-sprint rolling metric evidence | Story 4 |
| Cycle-Time Appendix | Program/workstream cycle-time summaries and unavailable-data caveats | Story 4 |
| Milestone / Data Coverage Appendix | Milestone rollup context and partial-data impact | Story 4 |

## Shared Helpers

| Helper | Purpose | Owned By |
|---|---|---|
| Slide Plan | Ordered sections, dynamic slide count, footer context | Story 1 |
| Export Visualization Contract | Display-ready data for snapshots and appendices | Story 1 |
| MDT Layout Decision | Single canvas coordinate system for new and existing slides | Story 1 |
| Placeholder/Caveat Renderer | Consistent unavailable and chart-failure presentation | Story 3 |

## States

- Full data
- Partial metrics
- No trend data
- No milestone data
- Cycle-time unavailable counts present
- Chart capture failure
- One workstream
- Many workstreams
