# User Stories — PowerPoint Export

> Spec: `.writ/specs/2026-04-16-powerpoint-export/spec.md`
> Total: 9 stories · 9 complete ✅ · **150/150** implementation tasks checked

## Progress

| Story | Title                                   | Status      | Tasks | Dependencies            |
| ----- | --------------------------------------- | ----------- | ----- | ----------------------- |
| 1     | Export Infrastructure                   | Complete ✅ | 14/14 | None                    |
| 2     | Program Summary Slide                   | Complete ✅ | 23/23 | Story 1                 |
| 3     | Velocity Slides                         | Complete ✅ | 13/13 | Story 1                 |
| 4     | Overhead Slides                         | Complete ✅ | 12/12 | Story 1                 |
| 5     | Milestone Slides                        | Complete ✅ | 15/15 | Story 1                 |
| 6     | Export Orchestrator & End-to-End Wiring | Complete ✅ | 18/18 | Stories 2, 3, 4, 5, 7   |
| 7     | Bug Burndown Slides                     | Complete ✅ | 17/17 | Story 1                 |
| 8     | Chart Image Renderer Infrastructure     | Complete ✅ | 11/11 | Story 1                 |
| 9     | Migrate Slides to Recharts Images       | Complete ✅ | 27/27 | Story 8                 |

## Dependency Graph

```
Phase 1:
  Story 1: Export Infrastructure
    ├── Story 2: Program Summary Slide
    ├── Story 3: Velocity Slides
    ├── Story 4: Overhead Slides
    ├── Story 5: Milestone Slides
    └── Story 7: Bug Burndown Slides
          └── Story 6: Export Orchestrator (depends on 2, 3, 4, 5, 7)

Phase 2 (Recharts image swap — complete):
  Story 8: Chart Image Renderer Infrastructure (depends on Story 1)
    └── Story 9: Migrate Slides to Recharts Images (depends on Story 8)
```

Stories 8 and 9 superseded native `slide.addChart(...)` chart rendering from Stories 2–5 and 7; KPI tiles, titles, metrics panels, footer, ordering, and `ExportInput` shape remain as implemented in Phase 1.

## Story Summaries

**Story 1 — Export Infrastructure:** Installs pptxgenjs, creates the `lib/export/` module skeleton (types, RAG colors, stub builder), adds the `ExportControl` component, and wires the export button into `DashboardContainer` header alongside Sync Now.

**Story 2 — Program Summary Slide:** Implements `buildProgramSummarySlide()`. 5 KPI tiles + program velocity + program bug burndown + footer on Slide 1. (Charts delivered as captured Recharts images per Story 9.)

**Story 3 — Velocity Slides:** Implements `buildVelocitySlide()` — captured `<VelocityTrendChart/>` PNG per Story 9.

**Story 4 — Overhead Slides:** Implements `buildOverheadSlide()` — captured `<OverheadCompositionChart/>` PNG per Story 9.

**Story 5 — Milestone Slides:** Implements `buildMilestoneSlide()` — captured `<BurnupChart/>` images per Story 9.

**Story 6 — Export Orchestrator:** Wires all slide builders into `buildPresentation()`; 21-slide deck; async builders after Story 9.

**Story 7 — Bug Burndown Slides:** Implements `buildBugBurndownSlide()` — captured `<BugBurndownChart/>` image; shared component used on dashboard.

**Story 8 — Chart Image Renderer:** `lib/export/render/chart-image.tsx`, `html-to-image`, Mantine-wrapped offscreen mount, tests.

**Story 9 — Migrate Slides to Recharts Images:** `BugBurndownChart` extraction, async slide builders, `renderChartToPng` + `slide.addImage`, tests updated.

## Notes

- **Motivation for Stories 8 & 9:** see `.writ/issues/improvements/2026-04-16-pptx-charts-match-dashboard.md`.
- **Next.js bundling:** see spec.md → *Next.js client bundle (pptxgenjs + JSZip)* — ES build + `node:` replacement; never alias to `pptxgen.bundle.js`.
- **Soft dependency:** `adp-milestones-panel` spec — milestone data may be sparse; slides use placeholders.
- **No server changes** — client-side only.
- **Slide-count invariant:** `1 + workstreams.length × 4` → 21 slides for 5 workstreams.
