---

# Phase 1D: Workstream Overhead — API Specification

> Spec: `../spec.md`
> Related stories: `../user-stories/story-2-api-extension.md`

## Endpoint: `GET /api/metrics`

No new endpoints. Phase 1D extends the existing `GET /api/metrics` response.

---

## Extended Response Shape

### `ApiWorkstream` — New Field

```typescript
currentSprintOverheadItems?: {
  bugs: ApiOverheadItem[];
  support: ApiOverheadItem[];
}

interface ApiOverheadItem {
  adoId: number;
  title: string;
  state: string;
  hours: number | null;   // completedWork ?? originalEstimate ?? null
}
```

- `bugs` — Bug-type work items in the current sprint for this workstream, ordered by `adoId` asc
- `support` — Support-type work items in the current sprint for this workstream, ordered by `adoId` asc
- "Current sprint" = the `sprintId` used for the MetricSnapshot in this response (not the live date)
- Both arrays are always present (empty `[]` when no items, never `null`)

### `ApiTrendSprint` — New Field

```typescript
overheadComposition?: {
  ceremonyHours: number | null;
  bugHours: number | null;
  spikeHours: number | null;
  supportHours: number | null;
  totalOverheadHours: number | null;
  overheadPercent: number | null;
}
```

- Data sourced from the new `ceremonyHours`, `bugHours`, `spikeHours`, `supportHours` columns on `MetricSnapshot`
- Values are `null` for snapshots computed before Story 1 migration (pre-breakdown data); the chart treats null as 0
- Present on both per-workstream trend sprints and program-level trend sprints (program level = sum across workstreams, sourced the same way)

---

## Example Response Fragment

```json
{
  "workstreams": [
    {
      "workstreamId": "ws-abc",
      "workstreamName": "Streams",
      "metrics": { "...": "..." },
      "detail": { "...": "..." },
      "trends": {
        "sprints": [
          {
            "sprintId": "sprint-1",
            "sprintName": "Sprint 1",
            "velocity": 32,
            "velocityRate": 0.85,
            "activeBugs": 3,
            "bugsClosed": 1,
            "mode": "actual",
            "bugs": [{ "adoId": 12345, "title": "Login crash", "state": "Active" }],
            "overheadComposition": {
              "ceremonyHours": 41.0,
              "bugHours": 12.5,
              "spikeHours": 4.0,
              "supportHours": 6.0,
              "totalOverheadHours": 63.5,
              "overheadPercent": 33.2
            }
          }
        ]
      },
      "prediction": { "...": "..." },
      "currentSprintOverheadItems": {
        "bugs": [
          { "adoId": 12345, "title": "Login crash on iOS", "state": "Active", "hours": 8.0 },
          { "adoId": 12389, "title": "Null pointer in data sync", "state": "Closed", "hours": 4.5 }
        ],
        "support": [
          { "adoId": 13001, "title": "Help request from team X", "state": "Done", "hours": 2.0 }
        ]
      }
    }
  ]
}
```

---

## Implementation Notes

### New DB Query for Support Items

A new `prisma.workItem.findMany` query parallel to the existing `trendBugs` query:

```typescript
const trendSupportItems = await prisma.workItem.findMany({
  where: {
    type: 'Support',
    sprintId: { in: rollingSprintIds },
    ...wsFilter,
  },
  select: {
    sprintId: true,
    workstreamId: true,
    state: true,
    adoId: true,
    title: true,
    completedWork: true,
    originalEstimate: true,
  },
  orderBy: { adoId: 'asc' },
});
```

### Extended `trendSnapshots` Select

Add to existing `trendSnapshots` query select:
```typescript
overheadPercent: true,
ceremonyHours: true,
bugHours: true,
spikeHours: true,
supportHours: true,
```

### Backward Compatibility

- All new fields are optional (`?`) — existing clients consuming the API will not break
- `overheadComposition` fields can be `null` for old snapshots — UI handles null as 0 for charts
- `currentSprintOverheadItems` is optional on `ApiWorkstream`; if absent, the panel is not shown
