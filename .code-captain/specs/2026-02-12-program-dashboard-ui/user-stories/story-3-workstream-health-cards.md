# Story 3: Workstream Health Cards

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Story 1

## User Story

**As a** delivery manager  
**I want to** compare health across all workstreams in one grid  
**So that** I can identify risk concentration and follow-up areas quickly

## Acceptance Criteria

- [x] Given workstream metric data exists, when the cards render, then one card is shown per workstream with 4 core metrics and RAG status. ✅
- [x] Given detail fields are available, when cards render, then supporting values (planned/completed points, carry-over items) are displayed in a compact format. ✅
- [x] Given viewport width changes, when the grid reflows, then card layout remains readable and does not overlap or truncate key labels. ✅
- [x] Given metric values are null or unavailable, when cards render, then placeholders are shown and RAG display does not break. ✅

## Implementation Tasks

- [x] 3.1 Write tests for card rendering across full-data, partial-data, and null-data workstream payloads. ✅
- [x] 3.2 Build reusable `WorkstreamHealthCard` component with metric rows and detail block. ✅
- [x] 3.3 Implement responsive card grid container and map over API-provided workstreams. ✅
- [x] 3.4 Add consistent metric formatting utilities shared between summary and card views. ✅
- [x] 3.5 Validate visual output in Storybook using mock payloads for all four workstreams. ✅

## Notes

- Workstream order should be deterministic to aid stakeholder orientation between demos.
- Card components should remain export-friendly for upcoming slide generation work.

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Tests passing (100%) ✅
- [x] Code reviewed ✅
- [x] Documentation updated ✅
