# Visible Tabs Need Full Five-Sprint Rolling Window

> **Type:** Improvement
> **Priority:** Normal
> **Effort:** Medium
> **Created:** 2026-06-05
> **spec_ref:** .writ/specs/2026-06-05-five-sprint-window-visible-tabs/spec.md

## TL;DR

Ensure every visible sprint tab is backed by a complete five-sprint rolling window of data.

## Current State

- The shared sprint tab selector derives the visible tab list from available sprint story data.
- Existing sprint-tab design assumes workstreams share the same rolling five-sprint window.
- When data is missing or filtered unevenly, a visible tab can represent less than the full five-sprint context needed for that tab.

## Expected Outcome

- Each visible tab has a complete five-sprint rolling window available for the dashboard content it drives.
- The rolling window is anchored consistently so tab selection does not change the number or identity of supporting sprints unexpectedly.
- Tabs with insufficient backing data are either completed from the server response or handled explicitly instead of rendering partial context.

## Relevant Files

- `components/Dashboard/WorkstreamCardsGrid.tsx` - Derives the visible sprint tabs and applies the active sprint across workstream cards.
- `lib/dashboard/sprint-utils.ts` - Central helper for deriving the shared sprint list used by the tab selector.
- `app/api/metrics/route.ts` - Metrics endpoint likely responsible for providing the sprint-backed trend/window data consumed by dashboard tabs.

## Notes

- Related design context exists in `.writ/specs/2026-03-05-common-sprint-tab-selector/sub-specs/technical-spec.md`, which documents the original shared rolling-window assumption.
