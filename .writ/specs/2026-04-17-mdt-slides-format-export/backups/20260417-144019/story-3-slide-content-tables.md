# Story 3: Slide Content and Table Styling

**Status:** Not Started  
**Priority:** Medium  
**Dependencies:** Story 2  
**Effort:** M

## User Story

As a stakeholder reviewing an exported deck,  
I want body copy, section headers, and tables to follow Medtronic table and typography rules,  
So that non-chart content matches the corporate template (navy table headers, alternating rows, horizontal rules only).

## Acceptance Criteria

**Given** a slide includes a table built with `slide.addTable()`,  
**When** viewed in PowerPoint,  
**Then** the header row is navy with white bold text; body rows alternate white and `F2F2F2`; borders use thin horizontal rules (`D9D9D9`) per skill.

**Given** section or column headers in native text shapes,  
**When** styled via theme,  
**Then** accent headers use blue `1E22AA` at the prescribed size (e.g. 28pt section headers per skill) where the slide structure includes them.

**Given** body text in native shapes,  
**When** compared to skill,  
**Then** body uses black `000000` at 14pt regular unless a different size is required for density — document any exception.

**Given** chart images from Recharts,  
**When** viewed on the slide,  
**Then** they remain dashboard-accurate PNGs — **no** forced recolor in this story.

## Implementation Tasks

- [ ] 3.1 Write unit tests for table row builders (if extracted as pure functions — alternating fill, header row shape).
- [ ] 3.2 Sweep `lib/export/slides/*.tsx` for hard-coded colors/fonts; replace with `mdt-theme` / `rag-colors`.
- [ ] 3.3 Apply MDT table pattern to all tabular export content; remove vertical borders if present.
- [ ] 3.4 Align any KPI tiles or RAG badges that use native shapes with MDT RAG semantic colors.
- [ ] 3.5 Verify acceptance criteria; run tests; spot-check deck vs `mockups/`.

## Technical Notes

- If a slide has no table, focus on text/shape styling only.
- Coordinate with Story 2 so content area coordinates do not overlap footer.

## Visual References

- `mockups/component-inventory.md` — table and KPI components.  
- `.cursor/skills/mdt_slides.md` — Tables section.

## Context for Agents

- spec.md → Detailed requirements → Tables.  
- spec-lite → For Review Agents → Acceptance criteria (tables, native RAG).  
- Predecessor Phase 1F: chart images stay PNG — do not modify `renderChartToPng` for MDT palette.

## Definition of Done

- [ ] No stray legacy hex from pre-MDT export in scoped slide files (except chart image pipeline).
- [ ] Tables match MDT pattern where tables exist.
- [ ] Tests pass; manual spot-check completed.
