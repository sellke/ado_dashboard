# Phase 1C: API Specification

> Spec: .code-captain/specs/2026-02-19-workstream-velocity/spec.md

## Endpoint: `GET /api/metrics`

No new endpoints — Phase 1C extends the existing response shape with additive fields.

## Response Shape Changes

### Per-Workstream Object (Extended)

**Current shape:**
```typescript
{
  workstreamId: string;
  workstreamName: string;
  metrics: { velocity, overheadPercent, predictability, carryOverRate };
  detail: { plannedPoints, completedPoints, carryOverItems, carryOverPoints, overheadHours, grossHours };
  trends: {
    sprints: Array<{
      sprintId: string;
      sprintName: string;
      velocity: number | null;
      velocityRate: number | null;
      activeBugs: number;
      bugsClosed: number;
      mode: 'actual';
    }>;
  };
}
```

**Extended shape (additive):**
```typescript
{
  workstreamId: string;
  workstreamName: string;
  metrics: { velocity, overheadPercent, predictability, carryOverRate };
  detail: { plannedPoints, completedPoints, carryOverItems, carryOverPoints, overheadHours, grossHours };
  trends: {
    sprints: Array<{
      sprintId: string;
      sprintName: string;
      velocity: number | null;
      velocityRate: number | null;
      activeBugs: number;
      bugsClosed: number;
      mode: 'actual';
      // NEW: per-sprint bug items
      bugs: Array<{
        adoId: number;
        title: string;
        state: string;
      }>;
    }>;
  };
  // NEW: per-workstream prediction
  prediction: {
    velocity: number | null;
    velocityRate: number | null;
    mode: 'predicted';
    formula: string;
  };
}
```

### New Fields Detail

#### `prediction` (per workstream)

| Field | Type | Description |
|-------|------|-------------|
| `velocity` | `number \| null` | Predicted velocity for current sprint: `avgVelocityRate × netCapacityHours` |
| `velocityRate` | `number \| null` | Average velocity rate from completed sprints in rolling window |
| `mode` | `'predicted'` | Always `'predicted'` |
| `formula` | `string` | Human-readable formula description |

**Null conditions:**
- `velocity` is null when `avgVelocityRate` or `currentNetCapacity` is null
- `velocityRate` is null when no completed sprints have valid velocity rates

#### `bugs` (per trend sprint)

| Field | Type | Description |
|-------|------|-------------|
| `adoId` | `number` | ADO work item ID |
| `title` | `string` | Bug title from ADO |
| `state` | `string` | Current ADO state (e.g., "Active", "Closed", "Resolved") |

**Sorting:** Bugs are sorted by `adoId` ascending within each sprint.

**Empty state:** When a sprint has no Bug-type work items, `bugs` is an empty array `[]`.

## Data Source

### Bug Items Query

Extends the existing `trendBugs` query in the API route:

```typescript
// Current query (counts only)
const trendBugs = await prisma.workItem.findMany({
  where: {
    type: 'Bug',
    sprintId: { in: rollingSprintIds },
    ...wsFilter,
  },
  select: {
    sprintId: true,
    workstreamId: true,
    state: true,
    adoChangedDate: true,
  },
});

// Extended query (includes item details)
const trendBugs = await prisma.workItem.findMany({
  where: {
    type: 'Bug',
    sprintId: { in: rollingSprintIds },
    ...wsFilter,
  },
  select: {
    sprintId: true,
    workstreamId: true,
    state: true,
    adoChangedDate: true,
    adoId: true,       // NEW
    title: true,       // NEW
  },
  orderBy: { adoId: 'asc' },  // NEW: consistent ordering
});
```

### Prediction Source

`buildTrendSeries()` already returns `prediction` and `averageVelocityRate` per workstream:

```typescript
const trends = buildTrendSeries({
  rollingSprintsDesc: rollingSprints,
  currentSprintId: currentRollingSprintId,
  snapshots: trendSnapshots,
  bugItems: trendBugInputs,
  workstreamId: s.workstreamId,
});
// trends.prediction = { velocity, mode, formula }
// trends.averageVelocityRate = number | null
```

Attach to response:
```typescript
formatted.prediction = {
  velocity: trends.prediction.velocity,
  velocityRate: trends.averageVelocityRate,
  mode: 'predicted',
  formula: trends.prediction.formula,
};
```

## Backward Compatibility

All changes are **additive**:
- New `prediction` field on workstream objects (did not exist before)
- New `bugs` array on trend sprint objects (did not exist before)
- All existing fields remain unchanged in shape and semantics
- Existing API consumers that don't read the new fields are unaffected

## Example Response Fragment

```json
{
  "workstreams": [
    {
      "workstreamId": "ws-1",
      "workstreamName": "Action Tracker",
      "metrics": { "...existing..." },
      "detail": { "...existing..." },
      "trends": {
        "sprints": [
          {
            "sprintId": "sp-1",
            "sprintName": "Sprint 1",
            "velocity": 15,
            "velocityRate": 0.85,
            "activeBugs": 2,
            "bugsClosed": 1,
            "mode": "actual",
            "bugs": [
              { "adoId": 12001, "title": "Login timeout on slow networks", "state": "Closed" },
              { "adoId": 12045, "title": "Export button misaligned on mobile", "state": "Active" },
              { "adoId": 12052, "title": "Null pointer in user settings", "state": "Active" }
            ]
          }
        ]
      },
      "prediction": {
        "velocity": 14.2,
        "velocityRate": 0.88,
        "mode": "predicted",
        "formula": "average velocity rate × current sprint net capacity hours"
      }
    }
  ]
}
```
