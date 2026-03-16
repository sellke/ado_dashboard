# Debug Session: ADP-Tagged Milestones Not Appearing on Dashboard

## Problem
After implementing the workstream milestones feature (Phase 1 & 2, Stories 1-10), ADP-tagged milestones were not appearing on the dashboard after syncing. The Action Tracker workstream was specifically called out as expected to show milestones.

## Root Cause (Confirmed via Runtime Logs)

Two layers of issues were discovered through systematic instrumentation:

### 1. ADO WIQL `CONTAINS` Behavior (Primary)
The WIQL filter `System.Tags CONTAINS 'ADP-'` performs **starts-with matching on individual tags**, not substring matching. The actual ADO tags use the format `25ADP` (year-prefixed Annual Development Plan), which starts with `25`, not `ADP`. So WIQL never matched any Features.

- **KPI Services (Tier Boards):** 9 Features tagged `25ADP` (e.g., `"25ADP; KPI Group 1; MVP"`)
- **Pitch Tracker:** 2 Features tagged `25ADP`
- **Action Tracker:** 2 Features tagged `Q4 PLAN` (no ADP tag at all)
- **Streams, UCM:** No ADP-related tags

### 2. Tag Format Mismatch (Secondary)
The spec assumed `ADP-MAR` (month-specific) format and exact `Q4` quarter tags, but real ADO data uses:
- `25ADP` — year-prefixed ADP identifier (no month)
- `Q4 PLAN` — quarter with trailing text (not bare `Q4`)

## Fix Applied (3 Changes in `lib/sync/milestone-features.ts`)

### 1. WIQL: Removed Tag Filter
Removed the tag filter from WIQL entirely. Now fetches ALL Features per workstream and filters by ADP tags **in code** using true substring matching (`tags.toLowerCase().includes('adp')`). Feature counts per workstream are small (14-41), so performance impact is negligible.

### 2. `parseAdpTag`: Added `{YY}ADP` Format
Added a second pass in the parser that recognizes year-prefixed format:
- Pass 1 (existing): `ADP-{MON}` → specific month (e.g., `ADP-MAR` → March 2026)
- Pass 2 (new): `{YY}ADP` → first of current month (e.g., `25ADP` → 2026-03-01 when run in March)
- Regex: `/^\d{2}ADP$/i`

### 3. `parseQuarterTag`: Relaxed to Prefix Match
Changed regex from `/^Q[1-4]$/i` (exact) to `/^(Q[1-4])(?:\s|$)/i` (prefix with space or end). Now `Q4 PLAN` → `Q4`.

## Files Modified
| File | Change |
|------|--------|
| `lib/sync/milestone-features.ts` | WIQL filter removal, code-level ADP filter, `parseAdpTag` `{YY}ADP` support, `parseQuarterTag` relaxation |
| `__tests__/lib/sync/milestone-features.test.ts` | New tests for `25ADP` format, `Q4 PLAN` parsing, `parseQuarterTag` unit tests, updated integration tests |

## Files NOT Modified (instrumentation was added then removed)
- `lib/sync/orchestrator.ts`
- `app/api/milestones/route.ts`
- `components/Dashboard/DashboardContainer.tsx`

## Test Status
- **77 tests passing** (was 78 before removing 1 redundant WIQL test)
- All instrumentation removed
- No linter errors

## Key ADO Data Reference
| Workstream | Area Path | ADP Features | Tags |
|---|---|---|---|
| KPI Services | `...\Tier Boards` | 9 | `25ADP; KPI Group 1; MVP`, `25ADP; KPI Group 2`, `25ADP` |
| Pitch Tracker | `...\Pitch Tracker` | 2 | `25ADP` |
| Action Tracker | `...\Action Tracker` | 0 (has `Q4 PLAN` but no ADP) | `Q4 PLAN`, `UCM`, `Phase 1`, etc. |
| Streams | `...\Streams` | 0 | (none) |
| UCM | `...\Unified Configuration Manager` | 0 | (none) |

## Open Items / Follow-ups
- **Action Tracker** still has no ADP-tagged Features. Its 2 Features with `Q4 PLAN` tags lack any ADP identifier, so they won't create milestones. To include them, either add a `25ADP` or `ADP-MAR` tag in ADO, or further broaden the code to treat `Q4 PLAN` as a milestone trigger.
- The `{YY}ADP` format uses **current month** as `targetMonth` since no month is specified in the tag. This means all `25ADP` milestones share the same target month (whatever month the sync runs in). If per-feature month targeting is needed, Features should use the `ADP-{MON}` format.
- Spec documents (story-1, story-7, story-8, spec-lite.md) reference the old `ADP-{MON}` strict format and may need updating to reflect `{YY}ADP` support.

## Prior Conversation
This debug session is a continuation of implementation work from chat [Milestone Debug Session](22ac65c8-a0c6-438b-ac7f-422fad5a0f3d).
