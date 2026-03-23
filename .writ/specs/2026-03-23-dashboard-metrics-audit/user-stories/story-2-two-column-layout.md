# Story 2: Workstream Cards 2-Column Layout

**Spec:** [Dashboard Metrics Audit](../spec.md)  
**Story:** 2 of 5  
**Dependencies:** None  
**Priority:** Medium (layout improvement)  
> Status: Complete

## Context

The workstream cards grid currently uses a 4-column layout at large breakpoints (`lg: 4`). Each card is ~25% viewport width, which makes charts unreadable, story titles heavily truncated, and cards extremely tall with all their sub-sections (metrics + velocity chart + stories + overhead charts + item tables + milestones + burnup).

## User Story

As a dashboard user, I want workstream cards displayed in a 2-column layout so that charts are readable, text isn't truncated, and the overall information density is manageable.

## Acceptance Criteria

1. Given the dashboard loads on a large screen, When workstream cards render, Then they display in a 2-column grid (2 cards per row)
2. Given a small screen (mobile), When workstream cards render, Then they display in a single column (existing responsive behavior preserved)
3. Given charts within cards (velocity, overhead), When displayed in the new layout, Then they have sufficient width to be readable

## Implementation Tasks

- [x] Change `SimpleGrid cols` in `WorkstreamCardsGrid.tsx` from `{ base: 1, sm: 2, lg: 4 }` to `{ base: 1, lg: 2 }`
- [x] Verify chart readability at new width
- [x] Update snapshot/component tests if they assert grid column counts
- [x] Visual verification in Storybook or dev server

## Technical Notes

- This is a one-line CSS change in `WorkstreamCardsGrid.tsx`
- The `sm: 2` breakpoint can be kept or removed — at `sm` (48em/768px), 2 columns may still be too narrow for card content. Recommend `{ base: 1, lg: 2 }` (single column until lg breakpoint)

## Definition of Done

- [x] Cards display in 2-column grid at lg+ breakpoints
- [x] Single column on smaller screens
- [x] Charts are visually readable at new width
- [x] No broken layout or overflow issues
