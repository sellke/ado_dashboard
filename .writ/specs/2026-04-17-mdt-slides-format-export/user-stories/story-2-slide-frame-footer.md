# Story 2: Standard Slide Frame and Footer

**Status:** Completed ✅  
**Priority:** High  
**Dependencies:** Story 1  
**Effort:** M

## User Story

As a dashboard user exporting a report,  
I want every slide to use the Medtronic title area and standard footer (page number, title, date, classification, wordmark region),  
So that the deck matches corporate template expectations in PowerPoint.

## Acceptance Criteria

**Given** a completed export with N slides,  
**When** I open the file in PowerPoint,  
**Then** each slide shows a footer consistent with `mdt_slides` (page #, presentation title, date, classification line) and title/subtitle positions use navy 32pt regular title (not bold) where applicable.

**Given** slide 1 and slide N,  
**When** I compare footers,  
**Then** formatting is consistent; page numbers reflect slide order (1-based).

**Given** the export completes within the Phase 1F performance budget,  
**When** timing is measured on a typical dataset,  
**Then** total export remains under **5 seconds** (same order of magnitude as before this story).

**Given** wordmark image is unavailable or omitted,  
**When** I open the deck,  
**Then** behavior matches the documented decision (placeholder, text, or empty region) with no broken image icon.

**Given** the gold reference still `mockups/mdt-template-slide-reference.png`,  
**When** I compare a representative exported slide,  
**Then** the **structure** matches: left title band, large white content region, footer row with page # at far left + metadata line + wordmark bottom-right — exact pixel parity not required.

**Given** a slide has no subtitle text,  
**When** exported,  
**Then** no subtitle placeholder is shown and vertical spacing matches the spec (content area uses freed space — see `spec.md` Visual references).

## Implementation Tasks

- [x] 2.1 Write tests for footer helper(s) — e.g. page label formatting, title truncation rules if implemented as pure functions.
- [x] 2.2 Implement shared helpers (e.g. `addSlideTitle`, `addStandardFooter`) using `mdt-theme` constants; integrate with `lib/export/builder.ts` and each `slides/*.tsx` entry.
- [x] 2.3 Pass presentation metadata (program title, export date, classification string) from `ExportInput` / caller — extend `types.ts` only if needed.
- [x] 2.4 Handle wordmark: add asset under `public/` or document omission; wire `addImage` when present.
- [x] 2.5 Manual verification in PowerPoint against [`mockups/mdt-template-slide-reference.png`](../mockups/mdt-template-slide-reference.png) + acceptance criteria (structure, empty subtitle behavior).

## Technical Notes

- Reuse `LAYOUT_WIDE`; content area y/x from skill unless documented delta.
- Avoid duplicate footer renders on slides that call shared builders twice.

## Visual References

- [`mockups/mdt-template-slide-reference.png`](../mockups/mdt-template-slide-reference.png) — **primary** full-slide gold still (1280×720).  
- `.cursor/skills/mdt_slides.md` — Standard frame ASCII diagram; **typography** is authoritative over the raster if they differ.

## Context for Agents

- spec.md → Experience Design → State catalog.  
- technical-spec.md → pptxgenjs constraints, Shadow Paths.  
- Depends on Story 1 theme constants for positions/fonts.

## Definition of Done

- [x] All slide types in `lib/export/slides/` use shared frame/footer pattern.
- [x] Footers visible on first and last slide of a multi-slide export.
- [x] Performance budget validated or deviation documented with cause.
