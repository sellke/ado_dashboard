# Match PowerPoint Export Charts to Live Dashboard

> **Type:** Improvement
> **Priority:** Normal
> **Effort:** Medium
> **Created:** 2026-04-16
> **spec_ref:** `.writ/specs/2026-04-16-powerpoint-export/` — landed as Stories 8 (Chart Image Renderer) + 9 (Migrate Slides to Recharts Images) added via `/edit-spec` on 2026-04-16 (16:06). Approach: mount dashboard Recharts components in a hidden DIV at export time, capture via `html-to-image`, embed via `slide.addImage()`.

## TL;DR

Replace the native `pptxgenjs` charts in PowerPoint exports with visuals that closely mirror the live dashboard's Recharts-based charts and graphs.

## Current State

- Export slides build charts via `slide.addChart(...)` from `pptxgenjs` (native Office chart objects)
- Styling (colors, markers, legend, axes) is configured per-slide and drifts from the dashboard look
- Live dashboard uses Recharts components (`VelocityTrendChart`, `BurnupChart`, `OverheadBreakdownChart`, `OverheadCompositionChart`) with a shared design language not reflected in exports
- Result: exported decks look noticeably different from what stakeholders see in the dashboard

## Expected Outcome

- PowerPoint charts visually match the live dashboard (colors, line/bar styling, legend placement, markers, axes, typography)
- A consistent approach across all exported chart slides (velocity, bug burndown, overhead, milestone, program summary)
- Likely path: render dashboard charts to images (SVG/PNG via headless render or server-side Recharts) and embed in slides, rather than re-implementing in `pptxgenjs` chart primitives — evaluate trade-offs during spec
- Parity verified visually across at least velocity, bug burndown, and overhead slides

## Relevant Files

- `lib/export/slides/velocity.ts` - current pptx chart implementation
- `lib/export/slides/bug-burndown.ts` - current pptx chart implementation
- `components/Dashboard/VelocityTrendChart.tsx` - live dashboard reference

## Related Issues

- [2026-03-20-velocity-chart-color](./2026-03-20-velocity-chart-color.md) - dashboard chart color work that the export should inherit

## Notes

- Tied to the in-flight powerpoint-export spec (`.writ/specs/2026-04-16-powerpoint-export/`) — coordinate before starting to avoid rework
- Image-based rendering removes chart interactivity in the deck but gives exact visual parity; native pptx charts keep editability but require duplicating the design system
- Decide early: image parity vs. native editability is the key trade-off

