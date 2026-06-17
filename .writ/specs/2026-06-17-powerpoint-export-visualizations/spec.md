# PowerPoint Export Visualizations

> **Status:** Complete
> **Created:** 2026-06-17
> **Owner:** @AdamSellke
> **Origin:** Promoted from issue: `.writ/issues/features/2026-06-16-powerport-export-visualizations.md`
> **Contract Locked:** yes

## Specification Contract

**Deliverable:** Improve the dashboard PowerPoint export with a layered presentation deck that upgrades existing chart slides and adds concise program, workstream, and appendix-style detail visualizations for dashboard health, rolling metrics, cycle time, milestones, and partial data.

**Must Include:** Exported slides must communicate dashboard health, trend direction, RAG/status context, and metric caveats without requiring viewers to open the live dashboard.

**Hardest Constraint:** The deck needs more information without becoming unreadable or slow to generate. The existing export pipeline captures Recharts charts serially from React state, and current slide guidance also needs reconciliation between existing `LAYOUT_WIDE` usage and the MDT template's true 16 x 9 canvas.

### Experience Design

- **Entry point:** Existing `Export PPTX` button in the dashboard header.
- **Happy path:** User exports the loaded dashboard, opens the deck, sees an executive program snapshot first, scans compact workstream health snapshots, then uses detail and appendix slides for metric evidence.
- **Moment of truth:** A stakeholder can understand which workstreams are healthy, which metrics are driving risk, and where unavailable or partial data affects confidence without returning to the app.
- **Feedback model:** Existing export loading and error states remain; the generated deck itself uses clear labels, RAG cues, legends, source/date context, and unavailable-data callouts.
- **Error experience:** Missing metrics, missing rolling history, chart capture failures, and partial milestone/cycle-time data produce readable placeholder or caveat panels. A single failed chart must not block the rest of the deck.

### Business Rules

- The main deck stays presentation-friendly: program snapshot first, workstream snapshots next, then detailed slides only where they add explanatory value.
- Appendix-style detail slides may expand slide count, but must avoid repeating the same raw chart without additional context.
- Existing dashboard metric calculations, RAG thresholds, rolling-window rules, and cycle-time semantics remain the source of truth.
- Program `Avg Total Delivery/Bug` detail is program-only unless a later metric spec explicitly defines workstream delivery-to-bug drilldown.
- Unavailable cycle-time data must be visible as caveat context, not silently treated as zero.
- Export should use already loaded dashboard state where practical and must not introduce a new server-side export pipeline in this spec.
- Existing MDT slide chrome and footer conventions remain required for native slide elements.

### Success Criteria

1. Export produces a layered deck with a concise program snapshot, compact workstream snapshot slides, upgraded existing chart/detail slides, and appendix-style detail visuals.
2. Slides remain readable in PowerPoint: labels, legends, RAG/status cues, source date, and unavailable-data notes are visible at presentation scale.
3. Export continues to degrade gracefully when metrics, milestones, rolling rows, cycle-time fields, or chart captures are missing.
4. Export performance remains aligned with the existing budget unless implementation evidence proves a justified update is needed.
5. Existing PowerPoint download behavior, filename pattern, and dashboard export entry point remain intact.

### Scope Boundaries

- **Included:** New export visualization data contract, slide structure update, snapshot slides, chart readability pass, appendix/detail slides, graceful missing-data treatments, tests for export data mapping and slide builder behavior.
- **Included:** Reconciliation decision for export canvas/layout based on current MDT slide guidance and existing exported deck behavior.
- **Excluded:** Recalculating metric values, changing dashboard RAG thresholds, replacing pptxgenjs, server-side export generation, stakeholder-specific deck variants, and redesigning the live dashboard outside what is needed to supply export data.
- **Excluded:** Recoloring every embedded chart pixel unless needed for readability; native slide elements should follow the MDT export theme.

### Technical Concerns

- The current builder assumes `1 + workstreams * 4` slides. A layered deck will need a named slide-plan abstraction or equivalent so slide counts, footer page numbers, and tests remain stable.
- Chart capture is serial for DOM stability. Additional chart-heavy slides could push export time above the current `<5s` goal, so snapshot/detail slides should favor native pptx shapes and compact tables when chart capture is not necessary.
- `.cursor/skills/mdt_slides.md` defines a 16 x 9 inch MDT canvas, while the completed MDT export spec accepted pptxgenjs `LAYOUT_WIDE`. Implementation must make an explicit decision rather than mixing coordinate systems.
- Rolling metrics and cycle-time details are recent feature areas. The export spec should consume their view-model fields additively and avoid duplicating metric math in slide builders.

### Recommendations

- Use a layered deck model:
  1. Program Health Snapshot
  2. Workstream Health Snapshot section
  3. Existing per-workstream chart slides, upgraded for readability
  4. Appendix-style detail slides for rolling metrics, cycle time, milestone context, and unavailable data
- Prefer native pptx visual summaries for snapshot and appendix slides; reserve Recharts PNG capture for true chart visuals.
- Centralize export-specific data shaping near `lib/export/types.ts` or a small adapter so slide builders do not infer business meaning from formatted labels.
- Add focused tests around slide-plan generation, export input mapping, missing-data handling, and footer/page numbering.

### Cross-Spec Overlap

- `.writ/specs/2026-04-16-powerpoint-export/` (Complete) owns the existing export button, pptxgenjs pipeline, chart capture strategy, filename, and 21-slide baseline.
- `.writ/specs/2026-04-17-mdt-slides-format-export/` (Complete) owns MDT native slide chrome, theme constants, RAG native colors, and footer/title helpers.
- `.writ/specs/2026-06-16-rolling-metrics-modal/` (Complete) adds rolling metric rows and drilldown data that should feed appendix/detail export visuals.
- `.writ/specs/2026-06-15-cycle-time-stories-spikes-bugs/` (In progress or recently authored) adds program/workstream cycle-time fields and unavailable-data semantics that the export must preserve.

## Detailed Requirements

### Program Health Snapshot

- Present the current sprint/window label, computed date, and an executive summary of program metric health.
- Include RAG/status distribution or equivalent status cue so stakeholders can scan risk without reading each tile.
- Include rolling-window context and metric caveats when values are projected, partial, or unavailable.
- Include compact trend context for velocity and bug health without making the first slide visually dense.

### Workstream Health Snapshots

- Provide compact per-workstream visual cards that include workstream name, key metric values, RAG/status cue, and the most important caveat.
- Support all visible scoped workstreams, not a hard-coded five-workstream list.
- Avoid forcing a full chart for every metric in the snapshot section; use small native indicators and concise labels.
- Keep detail slides available for workstreams that need deeper explanation.

### Rolling Metric Context

- Export rolling-window evidence for velocity rate, overhead %, carry-over %, and program delivery-to-bug where data exists.
- Use the same display-ready rows from dashboard view models or an export adapter derived from them.
- Null and missing rows render as `N/A` or explanatory text, not zeros.
- Workstream delivery-to-bug drilldown remains out of scope unless another spec defines the data.

### Cycle-Time Context

- Include program and workstream cycle-time summaries for User Story, Spike, and Bug.
- Show unavailable counts or caveats prominently enough that averages are not mistaken as complete coverage.
- Linkable ADO item drilldown remains a live-dashboard interaction; the deck should summarize missing-data impact rather than trying to embed every item.

### Milestone Context

- Preserve existing milestone slide behavior while improving labels, sizing, and context.
- Include quarterly/monthly progress signals where program rollup data is available.
- Handle sparse milestone data with explicit placeholders and source caveats.

### Existing Slide Readability

- Review existing `program-summary`, `velocity`, `bug-burndown`, `overhead`, and `milestone` slides for label size, legend clarity, chart scaling, panel wording, RAG/status cue visibility, and empty-state copy.
- Existing chart capture failure behavior remains: place a readable placeholder and continue deck generation.
- Ensure title, footer, date, classification, and page numbering still render on every generated slide.

## Implementation Approach

1. Introduce a slide-plan abstraction that describes ordered slide sections and total slide count before slides are built.
2. Extend `ExportInput` only with display-ready fields needed for snapshots and appendices.
3. Add export adapter helpers if dashboard view models do not already provide stable data shapes for slide summaries.
4. Add new slide builders for program snapshot, workstream snapshot, rolling metrics appendix, cycle-time appendix, and milestone/partial-data context as needed.
5. Refactor existing slide builders only where required for readability, page numbering, layout consistency, or shared helpers.
6. Update tests to cover slide plan, data mapping, missing-data behavior, and no-regression export orchestration.

## Visual References

- Use `.cursor/skills/mdt_slides.md` as the brand/layout reference for new native slide elements.
- Use existing `lib/export/mdt-theme.ts`, `slide-frame.ts`, and current exported dashboard slide patterns as implementation constraints.
- Store current-state notes in `mockups/current/README.md`; generated wireframes are not required for this spec.
