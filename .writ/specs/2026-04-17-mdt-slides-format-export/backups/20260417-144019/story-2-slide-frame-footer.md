# Story 2: Standard Slide Frame and Footer

**Status:** Not Started  
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

## Implementation Tasks

- [ ] 2.1 Write tests for footer helper(s) — e.g. page label formatting, title truncation rules if implemented as pure functions.
- [ ] 2.2 Implement shared helpers (e.g. `addSlideTitle`, `addStandardFooter`) using `mdt-theme` constants; integrate with `lib/export/builder.ts` and each `slides/*.tsx` entry.
- [ ] 2.3 Pass presentation metadata (program title, export date, classification string) from `ExportInput` / caller — extend `types.ts` only if needed.
- [ ] 2.4 Handle wordmark: add asset under `public/` or document omission; wire `addImage` when present.
- [ ] 2.5 Manual verification in PowerPoint against `mockups/` references; verify acceptance criteria.

## Technical Notes

- Reuse `LAYOUT_WIDE`; content area y/x from skill unless documented delta.
- Avoid duplicate footer renders on slides that call shared builders twice.

## Visual References

- `mockups/` — screenshot(s) of expected footer and title band.  
- `.cursor/skills/mdt_slides.md` — Standard frame ASCII diagram.

## Context for Agents

- spec.md → Experience Design → State catalog.  
- technical-spec.md → pptxgenjs constraints, Shadow Paths.  
- Depends on Story 1 theme constants for positions/fonts.

## Definition of Done

- [ ] All slide types in `lib/export/slides/` use shared frame/footer pattern.
- [ ] Footers visible on first and last slide of a multi-slide export.
- [ ] Performance budget validated or deviation documented with cause.
