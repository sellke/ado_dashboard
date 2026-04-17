# User Stories — PowerPoint Export

> Spec: `.writ/specs/2026-04-16-powerpoint-export/spec.md`
> Total: 6 stories · 46 tasks · 6 completed ✅

## Progress


| Story | Title                                   | Status     | Tasks | Dependencies       |
| ----- | --------------------------------------- | ---------- | ----- | ------------------ |
| 1     | Export Infrastructure                   | Complete ✅ | 7     | None               |
| 2     | Program Summary Slide                   | Complete ✅ | 9     | Story 1            |
| 3     | Velocity Slides                         | Complete ✅ | 8     | Story 1            |
| 4     | Overhead Slides                         | Complete ✅ | 7     | Story 1            |
| 5     | Milestone Slides                        | Complete ✅ | 9     | Story 1            |
| 6     | Export Orchestrator & End-to-End Wiring | Complete ✅ | 6     | Stories 2, 3, 4, 5 |


## Dependency Graph

```
Story 1: Export Infrastructure (None)
  ├── Story 2: Program Summary Slide
  ├── Story 3: Velocity Slides
  ├── Story 4: Overhead Slides
  └── Story 5: Milestone Slides
        └── Story 6: Export Orchestrator (depends on 2, 3, 4, 5)
```

## Story Summaries

**Story 1 — Export Infrastructure:** Installs pptxgenjs, creates the `lib/export/` module skeleton (types, RAG colors, stub builder), adds the `ExportControl` component, and wires the export button into `DashboardContainer` header alongside Sync Now.

**Story 2 — Program Summary Slide:** Implements `buildProgramSummarySlide()` — 5 KPI tiles with RAG color fills, sprint title, footer. First slide in every export.

**Story 3 — Velocity Slides:** Implements `buildVelocitySlide()` — pptxgenjs line chart with 3 series (actuals, current sprint, rolling avg), metrics text block. One slide per workstream.

**Story 4 — Overhead Slides:** Implements `buildOverheadSlide()` — pptxgenjs stacked bar chart (Meetings/Bugs/Spikes/Support hours), overhead % metric. One slide per workstream.

**Story 5 — Milestone Slides:** Implements `buildMilestoneSlide()` — pptxgenjs line charts for milestone burnup (up to 3 per slide), % complete labels, graceful empty state. One slide per workstream.

**Story 6 — Export Orchestrator:** Wires all slide builders into `buildPresentation()`, assembles the full 16-slide deck grouped by workstream, finalizes `DashboardContainer.handleExport` with complete `ExportInput`, enforces filename convention.

## Notes

- **Soft dependency:** `adp-milestones-panel` spec has a broken milestone data pipeline. Milestone slides will render graceful empty states until that spec ships.
- **No server changes** required — all stories are client-side only.
- **Style skill deferred** — generic pptxgenjs defaults used throughout. A future style skill will apply branding (colors, fonts, logo).

