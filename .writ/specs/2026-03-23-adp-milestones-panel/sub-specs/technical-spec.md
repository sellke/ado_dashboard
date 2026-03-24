# Technical Spec: ADP Milestones Panel Pipeline Fix

## Architecture

This is a pure wiring fix across three existing layers. No new abstractions are introduced.

```
/api/milestones GET
  └─ returns ApiMilestoneWithProgress[] (each with workstreamBreakdown)
        │
        ▼
DashboardContainer (fetchMilestones)
  ├─ stores milestones: ApiMilestoneWithProgress[]     ← FIX: preserve workstreamBreakdown
  └─ computes milestoneQuarterGroups (new)             ← FIX: call groupMilestonesByQuarter
        │
        ▼
DashboardShell (props)
  └─ forwards milestoneQuarterGroups + loading/error   ← FIX: add props, forward to ProgramSummarySection
        │
        ▼
ProgramSummarySection
  └─ passes to MilestoneQuarterlyPanel                 ← already correct
```

## Change 1 — `lib/milestones/types.ts`

Add optional `workstreamBreakdown` to `ApiMilestoneWithProgress`:

```typescript
export interface ApiMilestoneWithProgress extends ApiMilestone {
  completedPoints: number;
  totalPoints: number;
  percentComplete: number | null;
  quarter: string | null;
  burnupData: ApiBurnupPoint[];
  workstreamBreakdown?: MilestoneWorkstreamBreakdown[];  // ADD THIS
}
```

`MilestoneWorkstreamBreakdown` is already defined in the same file — no new types needed.

## Change 2 — `components/Dashboard/DashboardContainer.tsx`

After `setMilestones(response.milestones ?? [])`, compute the quarter groups and add them to state:

```typescript
import { groupMilestonesByQuarter } from '@/lib/dashboard/adapter';
import type { MilestoneQuarterGroup } from '@/lib/dashboard/types';

// new state
const [milestoneQuarterGroups, setMilestoneQuarterGroups] = useState<MilestoneQuarterGroup[]>([]);

// in fetchMilestones, after setMilestones:
const ms = response.milestones ?? [];
setMilestones(ms);
setMilestoneQuarterGroups(groupMilestonesByQuarter(ms));

// pass to DashboardShell:
<DashboardShell
  ...
  milestoneQuarterGroups={milestoneQuarterGroups}
  milestonesLoading={milestonesLoading}
  milestonesError={milestonesError}
  ...
/>
```

Note: `milestoneQuarterGroups` should reset to `[]` on fetch error (same pattern as `setMilestones([])`).

## Change 3 — `components/Dashboard/DashboardShell.tsx`

Add `milestoneQuarterGroups` to `DashboardShellProps` and forward to `ProgramSummarySection`:

```typescript
export interface DashboardShellProps {
  ...
  milestoneQuarterGroups?: MilestoneQuarterGroup[];  // ADD
  milestonesLoading?: boolean;                        // already present
  milestonesError?: string | null;                    // already present
}

// in render:
<ProgramSummarySection
  viewModel={viewModel}
  programRollup={programRollup}
  milestoneQuarterGroups={milestoneQuarterGroups}
  milestonesLoading={milestonesLoading}
  milestonesError={milestonesError}
/>
```

Currently `ProgramSummarySection` is called with only `viewModel` and `programRollup` — the milestone props are already defined on its interface but just not passed through.

## Data Flow: `groupMilestonesByQuarter`

The existing function in `lib/dashboard/adapter.ts` handles the transformation:

```
ApiMilestoneWithProgress[] (with workstreamBreakdown)
  → groups by milestone.quarter (e.g., "Q4")
  → for each group: MilestoneFeatureViewModel[] (title, adoFeatureId, workstreams[])
  → sorted Q1→Q4, Untagged last
```

Features with `workstreamBreakdown.length === 0` are skipped — this is intentional (no progress to show).

## Error Handling

| Scenario | Behavior |
|---|---|
| `/api/milestones` 500 | `milestonesError` set, `milestoneQuarterGroups` = `[]`, panel shows error text |
| `/api/milestones` returns empty array | `milestoneQuarterGroups` = `[]`, panel shows "No milestone data available" |
| `/api/milestones` returns milestones with no `workstreamBreakdown` | `groupMilestonesByQuarter` skips them, panel shows empty |
| Metrics API fails but milestones succeed | Panel loading/error is independent; milestones still render |

## Change 4 — ADP-MON Tag Filter in `/api/milestones` (Story 2)

Filter child User Stories to only those with a conforming `ADP-MON` tag before computing milestone progress and workstream breakdown. Stories with no tags or non-conforming tags are excluded.

### Helper: `hasAdpMonTag` in `lib/milestones/format.ts`

```typescript
const ADP_MON_RE = /\bADP-(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/i;

/**
 * Returns true if the semicolon-delimited tags string contains an ADP-MON tag.
 * Returns false for null, empty, or tags with no ADP-MON match.
 */
export function hasAdpMonTag(tags: string | null): boolean {
  if (!tags) return false;
  return tags.split(';').some((t) => ADP_MON_RE.test(t.trim()));
}
```

### Route changes in `app/api/milestones/route.ts`

**1. Add `tags` to the WorkItem select:**

```typescript
select: {
  parentAdoId: true,
  state: true,
  storyPoints: true,
  workstreamId: true,
  tags: true,                          // ADD THIS
  workstream: { select: { id: true, name: true } },
  sprint: { select: { id: true, name: true, startDate: true } },
},
```

**2. Filter in `storiesByFeature` population:**

```typescript
for (const story of childStories) {
  if (story.parentAdoId === null) continue;
  if (!hasAdpMonTag(story.tags)) continue;   // ADD THIS — skip non-ADP-MON stories
  const list = storiesByFeature.get(story.parentAdoId) ?? [];
  list.push({ ... });
  storiesByFeature.set(story.parentAdoId, list);
}
```

This single filter point means both `computeMilestoneProgress` and `buildWorkstreamBreakdown` automatically receive only ADP-MON-tagged stories — no changes needed in the calculator or breakdown builder.

### Error handling

| Scenario | Behavior |
|---|---|
| Feature has child stories, none with ADP-MON tags | `storiesByFeature` has no entry → progress `totalSP=0`, `workstreamBreakdown=[]` → feature excluded from panel |
| Feature has mixed tagged/untagged stories | Only tagged stories count; untagged stories silently excluded |
| `WorkItem.tags` is null | `hasAdpMonTag(null)` returns false → story excluded |

## Test Strategy

**`DashboardContainer.test.tsx`**
- Given mock `/api/milestones` response with `workstreamBreakdown` data, `milestoneQuarterGroups` should be computed and non-empty
- Given fetch error, `milestoneQuarterGroups` should be `[]`
- `milestoneQuarterGroups` should be passed to `DashboardShell` prop

**`DashboardShell.test.tsx`**
- Given `milestoneQuarterGroups` prop with data, `ProgramSummarySection` should receive it
- Given `milestonesLoading=true`, `ProgramSummarySection` should receive `milestonesLoading=true`

**`adapter.test.ts`**
- Verify `groupMilestonesByQuarter` correctly handles `workstreamBreakdown` typed as part of `ApiMilestoneWithProgress` (not just intersection type)

**`route.test.ts`** (Story 2 additions)
- Given a Feature with mixed child stories (some `ADP-MAR`-tagged, some untagged), the response `workstreamBreakdown` counts only the ADP-tagged stories
- Given a Feature whose child stories are all untagged, `workstreamBreakdown` is empty and the feature does not appear in the panel
- Given a Feature with `tags: null` on all child stories, same result as untagged
- `hasAdpMonTag` unit tests: null → false; `"ADP-MAR"` → true; `"Sprint Goal; ADP-APR"` → true; `"ADP-SPRINT"` → false; `"adp-mar"` (lowercase) → true
