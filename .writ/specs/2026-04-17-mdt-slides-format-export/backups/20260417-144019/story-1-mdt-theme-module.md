# Story 1: MDT Export Theme Module

**Status:** Not Started  
**Priority:** High  
**Dependencies:** None  
**Effort:** S–M

## User Story

As a dashboard user exporting a health report,  
I want Medtronic color, typography, and RAG rules centralized in one module,  
So that every slide builder pulls consistent on-brand constants and RAG labels use the correct MDT semantic colors.

## Acceptance Criteria

**Given** the theme module exists,  
**When** a developer imports color or font constants for export,  
**Then** they come from `mdt-theme` / updated `rag-colors` — not duplicated hex literals.

**Given** RAG status Green, Amber, Red, or null,  
**When** `ragColor()` is called,  
**Then** returned hex matches `.cursor/skills/mdt_slides.md` semantic RAG colors (and null/missing state).

**Given** the theme defines footer-related constants,  
**When** slide builders need positions or font sizes,  
**Then** title, subtitle, and footer sizes match the skill table (or documented delta).

**Given** Avenir Next is unavailable in pptxgenjs,  
**When** font face is read from theme,  
**Then** primary face is **Calibri** with a code comment referencing brand intent per skill.

## Implementation Tasks

- [ ] 1.1 Write unit tests for `RAG_COLORS` / `ragColor()` — Green, Amber, Red, null, unknown key.
- [ ] 1.2 Create `lib/export/mdt-theme.ts` — export MDT palette, typography sizes, content margins, optional wordmark rect; document any intentional deviation from skill coordinates.
- [ ] 1.3 Update `lib/export/rag-colors.ts` to use MDT semantic hex from theme or re-export; keep `ragColor` API stable.
- [ ] 1.4 Add brief JSDoc on theme exports linking to `.cursor/skills/mdt_slides.md`.
- [ ] 1.5 Verify acceptance criteria and run unit tests.

## Technical Notes

- Bare hex strings for pptxgenjs (no `#`).
- Do not change chart PNG pipeline in this story.

## Visual References

- `mockups/README.md` — place stakeholder reference screenshots here.  
- Normative: `.cursor/skills/mdt_slides.md` color/typography tables.

## Context for Agents

- spec.md → Contract → Business rules (palette, titles not bold).  
- spec-lite → For Coding Agents → Implementation Approach.  
- technical-spec.md → Error & Rescue Map (wordmark load).  
- Existing: `lib/export/rag-colors.ts` (legacy greens/ambers — replace with MDT).

## Definition of Done

- [ ] Theme module exists and is imported by at least `rag-colors` (or slide stories consume both without duplication).
- [ ] All new/changed unit tests pass.
- [ ] No regression in export API surface (`buildPresentation` signature unchanged).
