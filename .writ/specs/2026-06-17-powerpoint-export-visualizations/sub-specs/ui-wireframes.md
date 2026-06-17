# UI / Slide Wireframes

> Parent: `.writ/specs/2026-06-17-powerpoint-export-visualizations/spec.md`

## Visual Source

- Use `.cursor/skills/mdt_slides.md` as the primary slide visual reference.
- Use existing `lib/export/mdt-theme.ts` and `slide-frame.ts` for implementation constants unless the layout migration story replaces them.
- No external mockups were provided.

## Layered Deck Shape

### 1. Program Health Snapshot

```text
Title: Program Health Snapshot
Subtitle: Sprint/window + computed date

[Health summary strip: RAG/status counts + top caveat]

[Metric tile] [Metric tile] [Metric tile] [Milestone tile]

[Compact trend visual: velocity/bug context]
[Top risk drivers or unavailable-data caveats]

Footer
```

### 2. Workstream Snapshot

```text
Title: Workstream Health Snapshot
Subtitle: Visible dashboard scope

[Workstream card] [Workstream card]
[Workstream card] [Workstream card]

Each card:
- Workstream name
- 3-5 key metrics
- RAG/status cue
- Primary caveat or "No caveats"

Footer
```

If there are too many workstreams for one slide, paginate snapshot cards across multiple slides.

### 3. Existing Detail Slides

Existing slides remain but receive a readability pass:

- Program Summary
- Workstream Velocity
- Workstream Bug Burndown
- Workstream Overhead
- Workstream Milestones

Improvements should focus on label size, legend clarity, status panels, placeholder copy, and consistent footer/page numbering.

### 4. Rolling Metrics Appendix

```text
Title: Rolling Metrics Detail
Subtitle: Metric + scope + rolling window

[Summary value and status cue]

Table:
Sprint | Value | Rolling Avg | Inputs / caveat

Footer
```

### 5. Cycle-Time Appendix

```text
Title: Cycle Time Context
Subtitle: Program or workstream scope

Table:
Type | Average | Completed Count | Unavailable Count | Caveat

[Unavailable-data note]

Footer
```

### 6. Milestone / Partial Data Appendix

```text
Title: Data Coverage and Milestone Context

[Monthly milestone status]
[Quarterly milestone status]

Table:
Scope | Data available | Missing / partial context | Impact

Footer
```

## Readability Rules

- Avoid more than 4-6 dense cards per slide.
- Prefer tables for appendix evidence and native cards for snapshots.
- Use status color sparingly; labels must explain the meaning of color.
- Placeholder and caveat text should be readable at presentation scale.
- Do not rely on hover/tooltips in exported slides.
