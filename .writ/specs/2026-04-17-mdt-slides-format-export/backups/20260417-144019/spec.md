# MDT Slides Format for Exported PPTX

> **Status:** Not Started  
> **Date:** 2026-04-17  
> **Origin:** Promoted from `.writ/issues/improvements/2026-04-17-mdt-slides-format-export.md`  
> **Predecessor:** `.writ/specs/2026-04-16-powerpoint-export/` (Complete — chart capture + export pipeline)

---

## Contract (Locked)

**Deliverable:** Align client-generated `.pptx` **slide chrome** (layout, Medtronic palette usage, typography, tables, standard footer) with the conventions in `.cursor/skills/mdt_slides.md`, using a **single shared theme module** in `lib/export/` so future changes stay on-brand.

**Must Include:** MDT-style **non-bold 32pt navy titles**, subtitle styling, **standard footer** (page number, presentation title, date, classification), **navy header + alternating-row** table pattern where tables exist, **Calibri** as practical font (Avenir Next documented as brand intent), and **reconciliation** of native RAG hex values with the skill vs `lib/export/rag-colors.ts`.

**Hardest Constraint:** **pptxgenjs** cannot rely on Avenir Next; stakeholders must accept **Calibri** (or a documented substitute). **Chart areas** are **Recharts PNG captures** from the dashboard (Phase 1F); changing pixels *inside* chart images to MDT semantic colors is **out of scope** unless explicitly added — coordinate with `.writ/issues/improvements/2026-04-16-pptx-charts-match-dashboard.md`.

**Success Criteria:**

- Exported decks use **LAYOUT_WIDE** with **white** backgrounds and MDT **native** typography/frame rules on titles, subtitles, footers, and tables.
- **Every** exported slide includes the **standard footer pattern** per `mdt_slides` (within pptxgenjs positioning limits).
- **One module** centralizes MDT export tokens (colors, font sizes, margins, footer format); slide builders consume it instead of ad hoc hex.
- **Documented** wordmark approach: embedded image, text fallback, or placeholder — if a binary asset cannot ship in the browser bundle.

**Scope Boundaries:**

- **Included:** Theme module, `rag-colors` alignment to MDT semantic RAG hex for **native** shapes/text, footer + title frame helpers, table styling, updates across `lib/export/slides/*.tsx` and `builder.ts` as needed.
- **Excluded:** Dashboard on-screen styling, server-side PPTX, stakeholder-specific deck variants, recoloring **embedded chart PNGs** (unless pulled in explicitly later).

---

## Relationship to Phase 1F (PowerPoint Export)

Phase 1F delivered: dynamic import, `buildPresentation()`, Recharts → PNG capture, 21-slide structure, performance budget (&lt; 5s), filename pattern. It **explicitly excluded** deep branding beyond dashboard-adjacent colors.

This spec **does not replace** Phase 1F; it **layers** Medtronic corporate template rules on **native** pptx elements. Chart image parity remains governed by the earlier spec and the related charts issue.

---

## Normative reference

Authoritative visual rules: **`.cursor/skills/mdt_slides.md`** (palette, typography table, standard frame diagram, table pattern, footer positions). Implementation may use slightly adjusted coordinates if pptxgenjs requires it; document any intentional deltas in `sub-specs/technical-spec.md`.

---

## Experience Design

### Entry point

Unchanged: user clicks **Export PPTX** in the dashboard header (`ExportControl` / `DashboardContainer`).

### Happy path

1. User exports as today.
2. Downloaded `.pptx` opens in PowerPoint.
3. **Native** slide elements (titles, subtitles, KPI text, tables, footers) read as **MDT template–aligned** per skill.

### Feedback model

No change to button behavior required unless theme work affects export duration — stay within the **&lt; 5 second** total budget from Phase 1F.

### Error experience

Export failures remain **Mantine notification** + button idle; theme code must not swallow errors or degrade unrelated dashboard UI.

### State catalog

| State | Chrome behavior |
| --- | --- |
| Success | All slides show MDT footer + title rules |
| Partial (chart capture fallback) | Unchanged from Phase 1F — placeholder image; **footer/title still MDT** |

---

## Business rules

1. **Palette discipline:** Use MDT roles from the skill (Navy `1C1F4D`, Blue `1E22AA`, body-muted `5A5A5A`, row-alt `F2F2F2`, rule `D9D9D9`, White `FFFFFF`). Do not introduce extra accent colors except MDT **semantic RAG** (Green `2E7D4F`, Amber `D19E00`, Red `B3261E`) for status indicators.
2. **Titles are not bold** — 32pt regular navy for slide titles.
3. **RAG mapping:** Replace legacy `rag-colors.ts` values with MDT semantic hex **for native pptx text/shapes** that represent RAG; keep helper API stable (`ragColor(rag)`).
4. **Footer content:** Include page number, presentation title string, date (export date or spec-defined), and classification line (e.g. `Internal use only` unless product requires configurable copy — default fixed string acceptable for MVP).
5. **Wordmark:** If image embedding is blocked by bundle or licensing, document **text fallback** or **omission** with explicit stakeholder note in spec-lite / README.

---

## Detailed requirements

### Theme module

- New module (e.g. `lib/export/mdt-theme.ts`) exports: color constants, font face name(s), title/subtitle/footer font sizes, content-area margins, footer layout constants, optional wordmark dimensions/position.
- Unit tests for: color string format (no `#` where pptxgenjs expects none), stable RAG mapping.

### Builder + slides

- `builder.ts` continues to set `prs.layout = 'LAYOUT_WIDE'`.
- Shared helpers apply **standard frame** (title y/x, subtitle, footer bar) so each slide type does not duplicate magic numbers.
- Each slide builder in `lib/export/slides/` uses theme for: title, any section headers, body text, table header/body rows.

### Tables

- Any `slide.addTable()` usage uses **navy** header row, **alternating** body fills, **horizontal rules only** per skill.

### Performance

- No additional full-document passes that risk exceeding **5s**; prefer O(slides) single-pass layout.

---

## Implementation approach

1. Add **mdt-theme** module + tests; migrate `rag-colors` to MDT semantic values (or thin re-export from theme).
2. Add **layout/footer helpers**; wire **all** slide types.
3. Sweep **slide content** (tables, remaining hard-coded colors/fonts).

---

## Verification

- Manual: export with loaded data; spot-check first, middle, last slides for footer + title.
- Automated: theme unit tests; optional snapshot tests if project already uses them for export strings (not required if absent).

---

## Visual references

User-selected **screenshots** live under `mockups/` — see `mockups/README.md` and `mockups/component-inventory.md`. Corporate design tokens also summarized in `.writ/docs/design-system.md` where applicable; **mdt_slides** overrides for export-specific chrome.
