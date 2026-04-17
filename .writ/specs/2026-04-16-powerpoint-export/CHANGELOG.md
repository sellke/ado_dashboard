# Changelog — PowerPoint Export

## 2026-04-16 (16:06) — Switch charts to Recharts-rendered images

**Change type:** Rendering approach swap (replaces native pptxgenjs charts with captured Recharts images)

**Motivation:** Issue `.writ/issues/improvements/2026-04-16-pptx-charts-match-dashboard.md` — exported decks diverged visually from the dashboard because pptxgenjs native Office chart objects don't share the dashboard's Recharts design system (colors, markers, legend placement, axes). Stakeholders want the exported deck to look exactly like the screen.

**What changed:**

- Every chart slide now embeds a PNG image captured from the actual dashboard Recharts component, instead of calling `slide.addChart(...)`. Slides mount `VelocityTrendChart`, `BugBurndownChart` (new extract), `OverheadCompositionChart`, and `BurnupChart` in a hidden offscreen DIV at export time, wait for Recharts to paint, capture via `html-to-image`, then embed via `slide.addImage(...)`.
- New shared component `components/Dashboard/BugBurndownChart.tsx` extracted from inline code in `ProgramSummarySection.tsx` and `WorkstreamHealthCard.tsx` (DRY win for the dashboard too).
- `buildPresentation()` and each slide builder become `async` — image capture is inherently async.
- KPI tiles, slide titles, metrics text panels, and footer stay as native pptxgenjs text/shapes (fast, text-searchable in PowerPoint).
- Stories 1–7 stay at `Complete` — their tile/title/panel/layout/ordering work is untouched. Two new stories (8 and 9) own the rendering swap.

**Files updated:**

- `spec.md` — rendering approach section rewritten; implementation approach + file list updated; risks revised; success criteria updated (visual parity, generation time target)
- `spec-lite.md` — mirrors spec.md
- `sub-specs/technical-spec.md` — new Chart Image Renderer architecture section; slide implementations rewritten around `slide.addImage`; dependency graph updated
- `user-stories/README.md` — now 9 stories; dependency graph + progress table updated
- `user-stories/story-8-chart-image-renderer.md` — new file
- `user-stories/story-9-migrate-slides-to-recharts.md` — new file

**Stories 1–7:** unchanged (all remain Complete).

**Backup:** `backups/20260416-160601/`

**Rollback:** restore files from the backup; revert `html-to-image` dep.

---

## 2026-04-16 (14:35) — Add summary + per-workstream bug charts

**Change type:** Additive (new slide + charts on existing slide) + re-order

**What changed:**

- Program Summary slide (Slide 1) now includes a program-level Velocity line chart and a Bug Burndown stacked bar chart below the KPI tile row. Tile band compressed from 2.2" to 1.7" tall to make room.
- Per-workstream slide group expanded from 3 slides to 4: **Velocity → Bug Burndown → Overhead → Milestone**. A new slide type renders a stacked bar of Open (New/Active) + Closed (Resolved/Testing/Closed) bug counts per sprint.
- Total slide count: **16 → 21** (1 Program Summary + 5 workstreams × 4 slides).
- `ExportInput` gains two fields: `programTrendSprints: TrendSprintViewModel[]` and `sprint5Prediction` (for the program velocity chart's forecasted series).
- Stories 2 and 6 reopened; new Story 7 (Bug Burndown Slides) added.

**Files updated:**

- `spec.md` — slide structure, slide specifications, implementation approach, success criteria
- `spec-lite.md` — slide count, file list, acceptance criteria
- `sub-specs/technical-spec.md` — architecture diagram, module structure, types, new slide implementation section
- `user-stories/README.md` — progress table (7 stories), dependency graph, story summaries
- `user-stories/story-2-program-summary-slide.md` — reopened, new tasks + AC for program velocity + bug burndown charts
- `user-stories/story-6-export-orchestrator.md` — reopened, updated for 21 slides + new per-workstream ordering
- `user-stories/story-7-bug-burndown-slides.md` — new file

**Backup:** `backups/20260416-143526/`

**Rationale:** Stakeholders reviewing exported PPTX were missing the trend context (velocity + bug burndown) that the dashboard surfaces on the Program Summary section and each Workstream Health Card. The export now mirrors the dashboard's visual story.
