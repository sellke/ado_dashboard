# Changelog — PowerPoint Export

## 2026-04-16 — Add summary + per-workstream bug charts

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
