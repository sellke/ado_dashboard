# Story 2: View Models & Adapter Layer

> **Status:** Complete
> **Priority:** High
> **Dependencies:** Story 1 (API response shape)

## User Story

**As a** frontend developer
**I want to** have typed view models and an adapter for sprint story data
**So that** the UI component can consume well-structured, display-ready data

## Acceptance Criteria

- [x] SprintStoryViewModel type defines sprint tabs with story groups
- [x] StoryRowViewModel type includes all display fields (adoId, title, assignedTo, storyPoints, state, statusGroup, adoUrl)
- [x] Adapter maps API response to SprintStoryViewModel array
- [x] ADO URLs are correctly constructed from adoId
- [x] adoId is formatted as "#12345" for display
- [x] Story points display "—" when null/undefined
- [x] Status groups are ordered: Planned → Active → Resolved → Completed
- [x] Empty status groups are excluded from the view model

## Implementation Tasks

- [x] 2.1 Write adapter tests (mapping, formatting, empty states, status group ordering, ADO URL construction)
- [x] 2.2 Add SprintStoriesApiResponse, SprintStoryViewModel, StoryRowViewModel types to types.ts
- [x] 2.3 Implement sprint-stories-adapter.ts with mapSprintStoriesResponse()
- [x] 2.4 Add ADO URL builder utility
- [x] 2.5 Verify all acceptance criteria against test results

## Notes

- Follow the existing adapter pattern from `lib/dashboard/adapter.ts`
- ADO URL: `https://dev.azure.com/Operations-Innovation/Event%20Streaming%20Platform/_workitems/edit/{adoId}`
- Consider exporting the ADO URL builder for reuse (overhead items also have adoIds)

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Code reviewed
- [x] Types exported from types.ts
