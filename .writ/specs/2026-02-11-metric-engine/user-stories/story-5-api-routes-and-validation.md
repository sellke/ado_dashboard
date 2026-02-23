# Story 5: API Routes and Metric Validation

> **Status:** Not Started
> **Priority:** Medium
> **Dependencies:** Story 4 (MetricSnapshot must be populated)

## User Story

**As a** dashboard frontend
**I want to** fetch computed metrics via API endpoints
**So that** I can display sprint health data without computing metrics client-side

## Acceptance Criteria

- [ ] Given MetricSnapshot data exists, when calling GET /api/metrics, then it returns all 4 metrics for all workstreams + program aggregate for the latest completed sprint
- [ ] Given a sprintId query parameter, when calling GET /api/metrics?sprintId=X, then it returns metrics for that specific sprint
- [ ] Given no MetricSnapshot data exists, when calling GET /api/metrics, then it returns a 200 with empty/null metrics and a message indicating no data
- [ ] Given MetricSnapshot history exists, when calling GET /api/metrics/history, then it returns metrics across the rolling window with sprint metadata
- [ ] Given a workstreamId filter, when calling GET /api/metrics/history?workstreamId=X, then it returns only that workstream's history
- [ ] Given at least 1 known historical sprint with manually verified data, when computing metrics and querying via API, then results match expected values within 0.1% tolerance

## Implementation Tasks

- [ ] 5.1 Write tests for GET /api/metrics route (happy path, specific sprint, no data, invalid params)
- [ ] 5.2 Implement `app/api/metrics/route.ts` -- GET handler querying MetricSnapshot + Sprint metadata
- [ ] 5.3 Write tests for GET /api/metrics/history route (all history, filtered by workstream, filtered by metric)
- [ ] 5.4 Implement `app/api/metrics/history/route.ts` -- GET handler for historical metric data
- [ ] 5.5 Create validation test: seed known work items for 1 sprint, run engine, verify API output matches hand-calculated expected values
- [ ] 5.6 Document API response shapes in spec and verify error handling (400 for bad params, 500 for server errors)

## Notes

- API routes are Next.js App Router handlers (app/api/metrics/route.ts)
- Response shape for GET /api/metrics:
  ```json
  {
    "sprint": { "id": "...", "name": "Sprint 26.20", "startDate": "...", "endDate": "..." },
    "workstreams": [
      {
        "workstreamId": "...",
        "workstreamName": "Streams",
        "metrics": {
          "velocity": { "value": 42, "rag": "Green", "rollingAverage": 38.5 },
          "overheadPercent": { "value": 28, "rag": "Green", "rollingAverage": 31.2 },
          "predictability": { "value": 88, "rag": "Green", "rollingAverage": 82.5 },
          "carryOverRate": { "value": 12, "rag": "Amber", "rollingAverage": 8.3, "carryOverCount": 3 }
        }
      }
    ],
    "program": {
      "metrics": {
        "velocity": { "value": 120, "rag": "Gray", "rollingAverage": 110.5 },
        "overheadPercent": { "value": 30.5, "rag": "Amber", "rollingAverage": 29.8 },
        "predictability": { "value": 85, "rag": "Green", "rollingAverage": 80.2 },
        "carryOverRate": { "value": 15, "rag": "Amber", "rollingAverage": 11.5 }
      }
    },
    "computedAt": "2026-02-11T12:00:00Z"
  }
  ```
- Validation test is critical -- confirms the entire pipeline produces correct results
- Known sprint data should include edge cases: items with null points, mixed states, bugs with completedWork

## Definition of Done

- [ ] All tasks completed
- [ ] All acceptance criteria met
- [ ] Tests passing (API routes + validation test)
- [ ] Code reviewed
- [ ] No linter errors
- [ ] API response matches documented shape
- [ ] At least 1 sprint validated against hand-calculated expected values
