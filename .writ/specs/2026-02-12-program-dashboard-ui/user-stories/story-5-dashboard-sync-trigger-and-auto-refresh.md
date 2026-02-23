# Story 5: Dashboard Sync Trigger and Auto-Refresh

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Story 1, Story 4

## User Story

**As a** Scrum Master / operator  
**I want to** trigger a full ADO sync directly from the dashboard  
**So that** I can refresh rolling-window data and immediately see updated metrics without leaving the page

## Acceptance Criteria

- [x] Given the dashboard is loaded, when I click "Sync Now", then the UI immediately triggers `POST /api/sync/ado` with full refresh behavior.
- [x] Given sync is in progress, when I view the dashboard, then the sync control is disabled and provides visible in-flight feedback.
- [x] Given sync completes successfully, when the response returns, then the dashboard automatically refetches metrics and updates rendered values.
- [x] Given sync fails, when the request resolves, then the dashboard shows a clear non-blocking error message and allows retry.
- [x] Given sync succeeds but metrics refetch fails, when the post-sync refresh runs, then the UI communicates partial success and preserves stable layout.

## Implementation Tasks

- [x] 5.1 Add integration tests for sync click flow, in-flight locking, success auto-refresh, and failure paths.
- [x] 5.2 Add dashboard sync action UI element ("Sync Now") in the shell/header region.
- [x] 5.3 Implement immediate click behavior with no confirmation dialog and explicit in-progress visual state.
- [x] 5.4 Wire sync action to `POST /api/sync/ado` using full refresh mode only.
- [x] 5.5 Trigger automatic metrics refetch on sync completion and reconcile loading/error states.
- [x] 5.6 Add Storybook coverage for sync in-progress and sync failure states.

## Notes

- This story intentionally avoids a sync scope selector to keep operation simple and aligned with operator expectations.
- The sync endpoint contract remains unchanged; this is a UI integration on top of existing backend behavior.
- Auto-refresh should use existing dashboard fetch pathways to avoid duplicate data-loading logic.

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Code reviewed
- [x] Documentation updated
