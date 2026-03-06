# Technical Specification — Sprint Story List

## Architecture Overview

This feature follows the existing dashboard data flow pattern:

```
Prisma DB → API Route → Adapter → View Model → Component
```

### New API Route

**`GET /api/sprints/stories`**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `workstreamId` | string (UUID) | Yes | Filter stories to a specific workstream |

**Response:** `200 OK`

```typescript
{
  sprints: Array<{
    id: string;
    name: string;
    startDate: string;      // ISO date
    endDate: string;        // ISO date
    isCurrent: boolean;
    stories: Array<{
      adoId: number;
      title: string;
      assignedTo: string | null;
      storyPoints: number | null;
      state: string;
      statusGroup: 'Planned' | 'Active' | 'Resolved' | 'Completed';
    }>;
  }>;
}
```

**Error responses:**
- `400` — Missing `workstreamId` parameter
- `500` — Database/server error

### Database Query Strategy

Single Prisma query with includes:

```typescript
const sprints = await prisma.sprint.findMany({
  where: {
    id: { in: rollingSprintIds },
    workItems: {
      some: { workstreamId, type: 'UserStory' }
    }
  },
  include: {
    workItems: {
      where: { workstreamId, type: 'UserStory', state: { notIn: ['Removed'] } },
      select: { adoId: true, title: true, assignedTo: true, storyPoints: true, state: true }
    }
  },
  orderBy: { startDate: 'desc' }
});
```

The rolling 5-sprint window IDs come from the same logic used in `lib/metrics/trend-service.ts`. Consider extracting the sprint window query into a shared utility.

### Status Mapping

```typescript
const STATUS_MAP: Record<string, string> = {
  'New': 'Planned',
  'Approved': 'Planned',
  'Committed': 'Planned',
  'Active': 'Active',
  'Resolved': 'Resolved',
  'Closed': 'Completed',
};
```

States not in this map are excluded from the response.

### ADO Deep Link Construction

```typescript
const ADO_BASE_URL = 'https://dev.azure.com/Operations-Innovation/Event%20Streaming%20Platform';

function buildAdoWorkItemUrl(adoId: number): string {
  return `${ADO_BASE_URL}/_workitems/edit/${adoId}`;
}
```

This should live in a shared utility (e.g., `lib/ado/urls.ts`) since overhead items also reference ADO IDs.

## Component Architecture

### SprintStoryListPanel

```
SprintStoryListPanel (props: SprintStoryListPanelProps)
├── Mantine Tabs
│   ├── Tabs.List → one Tabs.Tab per sprint
│   └── Tabs.Panel (per sprint)
│       └── StatusGroupSection (per non-empty status group)
│           ├── Group header (status label + count badge)
│           └── StoryRow (per story)
│               ├── Title (clickable → ADO link)
│               ├── Assignee badge
│               ├── Story points
│               └── State badge
└── Empty state ("No user stories in this sprint")
```

### Props Interface

```typescript
interface SprintStoryListPanelProps {
  sprints: SprintStoryViewModel[];
  loading?: boolean;
  error?: string | null;
}
```

### Visual Treatment

| Status Group | Mantine Color | Section Header Style |
|--------------|--------------|---------------------|
| Planned | gray | `color="gray"` text |
| Active | blue | `color="blue"` text |
| Resolved | yellow | `color="yellow"` text |
| Completed | green | `color="green"` text |

## Data Flow Integration

```
DashboardContainer
  ├── fetchMetrics()     → rawMetrics state
  ├── fetchMilestones()  → milestones state
  └── fetchSprintStories() → sprintStories state (NEW)
       ├── Called after metrics load (need workstream IDs)
       ├── One fetch per workstream: GET /api/sprints/stories?workstreamId={id}
       └── Stored as Map<workstreamId, SprintStoryViewModel[]>

WorkstreamHealthCard
  ├── card: WorkstreamCardViewModel (existing)
  ├── sprintStories: SprintStoryViewModel[] (NEW prop)
  ├── storiesLoading: boolean (NEW prop)
  └── storiesError: string | null (NEW prop)
```

### Fetch Strategy

Progressive loading — sprint stories fetch after the main metrics load:

1. Dashboard loads → fetch metrics + milestones (existing)
2. Metrics arrive → extract workstream IDs → fetch sprint stories per workstream
3. Stories arrive → render panels (each workstream card independently)

This avoids blocking the initial dashboard render.

## Testing Strategy

| Layer | Test File | Coverage |
|-------|-----------|----------|
| API Route | `__tests__/app/api/sprints/stories/route.test.ts` | Query params, Prisma query, status mapping, response shape, errors |
| Adapter | `__tests__/lib/dashboard/sprint-stories-adapter.test.ts` | View model mapping, formatting, ADO URLs, empty states |
| Component | `__tests__/components/Dashboard/SprintStoryListPanel.test.ts` | Tab rendering, default tab, status groups, story rows, ADO links, empty states |
| Integration | Existing `WorkstreamHealthCard.test.tsx` extended | Panel placement, data flow, loading/error states |

## Performance Considerations

- **Query efficiency:** Single Prisma query per workstream with selective fields (no full WorkItem fetch)
- **Payload size:** ~5 sprints × ~20 stories each = ~100 story objects per workstream. Negligible.
- **Progressive loading:** Stories don't block initial dashboard render
- **No pagination needed:** 5-sprint window limits the maximum data volume

## Related User Stories

- [Story 1: Sprint Stories API Endpoint](../user-stories/story-1-sprint-stories-api.md)
- [Story 2: View Models & Adapter Layer](../user-stories/story-2-view-models-adapter.md)
- [Story 3: Sprint Story List Panel Component](../user-stories/story-3-story-list-panel-component.md)
- [Story 4: Workstream Card Integration](../user-stories/story-4-workstream-card-integration.md)
