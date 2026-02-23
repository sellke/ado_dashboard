# Story 2: Program Summary Section

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Story 1

## User Story

**As a** product lead  
**I want to** see a clear program-level summary of sprint health  
**So that** I can quickly assess whether the program is on track

## Acceptance Criteria

- [x] Given program metrics are available, when the summary section renders, then velocity, overhead percent, predictability, and carry-over rate are displayed with RAG indicators. ✅
- [x] Given sprint metadata is available, when the summary section renders, then sprint name and `computedAt` freshness are visible. ✅
- [x] Given one or more metric values are null, when the summary section renders, then placeholders (for example `N/A`) appear with stable layout. ✅
- [x] Given values include percentages, when shown in summary tiles, then display formatting is consistent across all metrics. ✅

## Implementation Tasks

- [x] 2.1 Write component tests for populated, null-value, and mixed-RAG summary states. ✅
- [x] 2.2 Implement `ProgramSummarySection` using Mantine layout primitives and reusable metric display components. ✅
- [x] 2.3 Add summary-level metadata row for sprint label and data freshness timestamp. ✅
- [x] 2.4 Integrate RAG badge/chip rendering using shared theme mapping to avoid hardcoded colors. ✅
- [x] 2.5 Verify responsiveness and spacing for common desktop widths used in stakeholder demos. ✅

## Notes

- Program summary is the first visual region on the dashboard and sets interpretation context for workstream cards.
- Favor concise labels and avoid dense explanatory text in the MVP.

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Tests passing (100% — 23 dashboard tests, 0 failures) ✅
- [x] Code reviewed ✅
- [x] Documentation updated ✅
