# Writ Project Context

> Last Updated: 2026-06-26T00:00:00Z

## Active Spec

- **Spec:** 2026-06-26-testing-state-workstream-metrics — Add Testing State to Workstream Story Metrics
- **Status:** Complete
- **Story:** 2 of 2 — Testing Status Group — UI & Test Updates (Completed ✅)
- **Progress:** 12/12 tasks complete (100%)

## What Was Built

- Extended `StatusGroup` with `Testing` in `lib/sprints/status-mapping.ts` (map entry + lifecycle order)
- Sprint stories API now returns User Stories in ADO `Testing` state with `statusGroup: 'Testing'`
- `SprintStoryListPanel` renders Testing section with cyan badges between Active and Resolved
- New unit tests for status mapping; updated API, adapter, and panel tests
- Bug metrics unchanged (`BUG_RESOLVED_STATES` still treats Testing bugs as closed)

## Open Issues

- 1 feature issue in `.writ/issues/features/` (origin issue for this spec — may be closable)
