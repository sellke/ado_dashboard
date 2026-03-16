# Phase 1E: API Specification

> See [spec.md](../spec.md) for the full specification.

## Existing Endpoints (Unchanged Signature)

### POST /api/milestones
- Unchanged — kept for internal use, no longer surfaced in UI
- Creates a Milestone record manually

### PATCH /api/milestones/[id]
- Unchanged — kept for internal use
- Updates a Milestone record manually

### DELETE /api/milestones/[id]
- Unchanged — kept for internal use

---

## Modified Endpoint

### GET /api/milestones

**Query Parameters:**
- `workstreamId` (optional) — filter by workstream

**Response (new shape):**

```typescript
{
  milestones: ApiMilestoneWithProgress[];
  programRollup: ApiProgramMilestoneRollup;
}
```

**`ApiMilestoneWithProgress`:**

```typescript
interface ApiMilestoneWithProgress {
  // Existing fields
  id: string;
  title: string;
  workstreamId: string;
  targetMonth: string;         // ISO date string
  status: string;              // "NotStarted" | "InProgress" | "Done"
  adoFeatureId: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  workstream: { id: string; name: string };

  // New progress fields
  completedPoints: number;
  totalPoints: number;
  percentComplete: number | null;  // null if totalPoints === 0
  burnupData: Array<{
    sprintName: string;
    sprintId: string;
    cumulativeCompletedSP: number;
    totalSP: number;
  }>;
}
```

**`ApiProgramMilestoneRollup`:**

```typescript
interface ApiProgramMilestoneRollup {
  currentMonth: string;                     // "February 2026"
  currentMonthCompletionPercent: number | null;
  currentMonthTotalSP: number;
  currentMonthCompletedSP: number;
  quarterlyMilestones: {
    total: number;
    complete: number;       // percentComplete === 100
    inProgress: number;     // 0 < percentComplete < 100
    notStarted: number;     // percentComplete === 0 or null
  };
}
```

**Example Response:**

```json
{
  "milestones": [
    {
      "id": "clxxx123",
      "title": "Launch Feature X",
      "workstreamId": "ws-streams",
      "targetMonth": "2026-02-01T00:00:00.000Z",
      "status": "InProgress",
      "adoFeatureId": 12345,
      "notes": null,
      "createdAt": "2026-02-01T10:00:00.000Z",
      "updatedAt": "2026-02-20T08:30:00.000Z",
      "workstream": { "id": "ws-streams", "name": "Streams" },
      "completedPoints": 15,
      "totalPoints": 20,
      "percentComplete": 75,
      "burnupData": [
        { "sprintName": "Sprint 5", "sprintId": "sp-5", "cumulativeCompletedSP": 8, "totalSP": 20 },
        { "sprintName": "Sprint 6", "sprintId": "sp-6", "cumulativeCompletedSP": 15, "totalSP": 20 }
      ]
    }
  ],
  "programRollup": {
    "currentMonth": "February 2026",
    "currentMonthCompletionPercent": 62,
    "currentMonthTotalSP": 80,
    "currentMonthCompletedSP": 50,
    "quarterlyMilestones": {
      "total": 10,
      "complete": 2,
      "inProgress": 5,
      "notStarted": 3
    }
  }
}
```

**Error Responses:**
- `500 Internal Server Error` — `{ "error": "Error message" }`

---

## New Sync Trigger (via existing POST /api/sync/ado)

The Feature Goal Sync is included in the `Full` sync type. No new sync API endpoint is needed.

**POST /api/sync/ado** with `{ "syncType": "Full" }` now includes the milestone features sync step.

---

## Milestone → WorkItem Data Flow

```
GET /api/milestones
  1. milestones = prisma.milestone.findMany({ include: { workstream } })
  2. featureAdoIds = milestones.map(m => m.adoFeatureId).filter(Boolean)
  3. childStories = prisma.workItem.findMany({
       where: { parentAdoId: { in: featureAdoIds }, type: 'UserStory' },
       include: { sprint: { select: { id, name, startDate } } }
     })
  4. For each milestone: computeMilestoneProgress(featureAdoId, childStories, sprints)
  5. programRollup = computeProgramMilestoneRollup(milestonesWithProgress)
  6. Return { milestones: [...], programRollup }
```
