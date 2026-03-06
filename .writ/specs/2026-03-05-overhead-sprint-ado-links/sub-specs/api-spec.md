# API Specification: Overhead Items by Sprint

## Endpoint

**No new endpoint.** This modifies the existing `GET /api/metrics` response.

## Response Change

### Field Replaced

| Before | After |
|--------|-------|
| `workstreams[].currentSprintOverheadItems` | `workstreams[].overheadItemsBySprint` |

### New Field Schema

```typescript
overheadItemsBySprint: Array<{
  sprintId: string;                    // Sprint ID from the rolling 5-sprint window
  bugs: Array<{
    adoId: number;                     // Azure DevOps work item ID
    title: string;                     // Work item title
    state: string;                     // Current state (e.g., "Active", "Closed")
    hours: number | null;              // completedWork ?? originalEstimate ?? null
  }>;
  spikes: Array<{
    adoId: number;
    title: string;
    state: string;
    hours: number | null;              // completedWork ?? originalEstimate ?? null
  }>;
  support: Array<{
    adoId: number;
    title: string;
    state: string;
    hours: number | null;              // completedWork ?? originalEstimate ?? null
  }>;
}>
```

### Ordering

- `overheadItemsBySprint` array follows the same sprint order as `trends.sprints` (most recent first)
- Within each category, items are sorted by `adoId` ascending (matching current behavior)

### Empty States

- Sprints with no overhead items include empty arrays: `{ sprintId: "...", bugs: [], spikes: [], support: [] }`
- The `overheadItemsBySprint` array always contains entries for all rolling sprints (even if empty)

### Hours Calculation

For all three categories:
```
hours = workItem.completedWork ?? workItem.originalEstimate ?? null
```

This matches the existing bug/support pattern. Spikes use the same formula (not `storyPoints`, which is used in the aggregate overhead breakdown calculation).

### Data Source

All data sourced from existing Prisma queries in `app/api/metrics/route.ts`:
- `trendBugs`: `WorkItem` where `type = 'Bug'`, `sprintId in rollingSprintIds`
- `trendSpikes`: `WorkItem` where `type = 'Spike'`, `sprintId in rollingSprintIds`
- `trendSupport`: `WorkItem` where `type = 'Support'`, `sprintId in rollingSprintIds`

No new database queries required.
