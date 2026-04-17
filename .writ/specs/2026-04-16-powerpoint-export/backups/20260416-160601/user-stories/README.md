# User Stories — PowerPoint Export

> Spec: `.writ/specs/2026-04-16-powerpoint-export/spec.md`
> Total: 7 stories · 5 complete ✅ · 2 reopened ⭐ · 1 new 🆕

## Progress


| Story | Title                                   | Status                 | Tasks  | Dependencies            |
| ----- | --------------------------------------- | ---------------------- | ------ | ----------------------- |
| 1     | Export Infrastructure                   | Complete ✅             | 7      | None                    |
| 2     | Program Summary Slide                   | Reopened ⭐             | 9 + 5  | Story 1                 |
| 3     | Velocity Slides                         | Complete ✅             | 8      | Story 1                 |
| 4     | Overhead Slides                         | Complete ✅             | 7      | Story 1                 |
| 5     | Milestone Slides                        | Complete ✅             | 9      | Story 1                 |
| 6     | Export Orchestrator & End-to-End Wiring | Reopened ⭐             | 6 + 5  | Stories 2, 3, 4, 5, 7   |
| 7     | Bug Burndown Slides                     | Not Started 🆕         | 9      | Story 1                 |


## Dependency Graph

```
Story 1: Export Infrastructure (None)
  ├── Story 2: Program Summary Slide ⭐ (reopened — adds program velocity + bug burndown charts)
  ├── Story 3: Velocity Slides
  ├── Story 4: Overhead Slides
  ├── Story 5: Milestone Slides
  └── Story 7: Bug Burndown Slides 🆕 (per-workstream stacked bar)
        └── Story 6: Export Orchestrator ⭐ (reopened — depends on 2, 3, 4, 5, 7)
```

## Story Summaries

**Story 1 — Export Infrastructure:** Installs pptxgenjs, creates the `lib/export/` module skeleton (types, RAG colors, stub builder), adds the `ExportControl` component, and wires the export button into `DashboardContainer` header alongside Sync Now.

**Story 2 — Program Summary Slide ⭐:** Implements `buildProgramSummarySlide()`. Original scope was 5 KPI tiles with RAG color fills + sprint title + footer (complete). Reopened to add a program-level velocity line chart and a program-level bug burndown stacked bar chart below the tile row — tile band compresses from 2.2" to 1.7" tall to fit both charts on the same slide.

**Story 3 — Velocity Slides:** Implements `buildVelocitySlide()` — pptxgenjs line chart with 3 series (actuals, current sprint, rolling avg), metrics text block. One slide per workstream.

**Story 4 — Overhead Slides:** Implements `buildOverheadSlide()` — pptxgenjs stacked bar chart (Meetings/Bugs/Spikes/Support hours), overhead % metric. One slide per workstream.

**Story 5 — Milestone Slides:** Implements `buildMilestoneSlide()` — pptxgenjs line charts for milestone burnup (up to 3 per slide), % complete labels, graceful empty state. One slide per workstream.

**Story 6 — Export Orchestrator ⭐:** Wires all slide builders into `buildPresentation()` and finalizes `DashboardContainer.handleExport`. Original scope assembled a 16-slide deck with per-workstream order Velocity → Overhead → Milestone (complete). Reopened to assemble the **21-slide** deck with per-workstream order **Velocity → Bug Burndown → Overhead → Milestone**, and to include `programTrendSprints` + `sprint5Prediction` in the `ExportInput` so Slide 1 charts can render.

**Story 7 — Bug Burndown Slides 🆕:** Implements `buildBugBurndownSlide()` — pptxgenjs stacked bar chart with two series, `Open (New/Active)` in red and `Closed (Resolved/Testing/Closed)` in green, per sprint from `ws.trendSprints`. Right-panel metrics text block shows current-sprint Open/Closed counts and 4-sprint trend totals. One slide per workstream, inserted between Velocity and Overhead.

## Notes

- **Soft dependency:** `adp-milestones-panel` spec has a broken milestone data pipeline. Milestone slides render graceful empty states until that spec ships.
- **No server changes** required — all stories are client-side only.
- **Style skill deferred** — generic pptxgenjs defaults used throughout. A future style skill will apply branding (colors, fonts, logo).
- **Slide-count invariant:** `prs.slides.length === 1 + input.workstreams.length * 4`. With 5 workstreams that is 21 slides (up from the original 16).
- **2026-04-16 change:** see `../CHANGELOG.md` for the rationale and scope of the reopened stories and new Story 7.
