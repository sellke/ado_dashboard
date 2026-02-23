# Story 3: API Extension

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Story 2

## User Story

**As a** dashboard frontend
**I want** `GET /api/milestones` to return progress data (completedSP, totalSP, burnupData) and a program-level roll-up
**So that** the UI can render burnup charts and the program summary can show monthly/quarterly milestone completion

## Acceptance Criteria

- [x] Given a GET request to `/api/milestones`, when milestones exist with linked ADO Features, then each milestone in the response includes `completedPoints`, `totalPoints`, `percentComplete`, and `burnupData` ✅
- [x] Given a GET request to `/api/milestones`, then the response includes a `programRollup` object with `currentMonth`, `currentMonthCompletionPercent`, `currentMonthTotalSP`, `currentMonthCompletedSP`, and `quarterlyMilestones` ✅
- [x] Given a milestone with no linked ADO Feature (`adoFeatureId=null`), when fetching progress, then `completedPoints=0`, `totalPoints=0`, `percentComplete=null`, `burnupData=[]` ✅
- [x] Given a `workstreamId` query param, when provided, then milestones and roll-up are scoped to that workstream ✅
- [x] Given the API route, when an error occurs during progress computation, then the error is caught and a 500 response is returned with the error message ✅

## Implementation Tasks

- [x] 3.1 Write tests for the extended GET `/api/milestones` response shape — progress fields present, burnupData array structure, programRollup present ✅
- [x] 3.2 Write tests for workstreamId filtering with the new response shape ✅
- [x] 3.3 Update `app/api/milestones/route.ts` GET handler: join Milestone → WorkItem (Feature) → child WorkItem (UserStory) → Sprint for burnup data ✅
- [x] 3.4 Call `computeMilestoneProgress()` and `computeProgramMilestoneRollup()` from `lib/milestones/calculator.ts` within the route handler ✅
- [x] 3.5 Update `lib/milestones/types.ts` to extend `ApiMilestone` with `completedPoints`, `totalPoints`, `percentComplete`, `burnupData`; add `ApiMilestonesResponse` wrapper type ✅
- [x] 3.6 Verify: GET /api/milestones returns correct data shape; existing tests pass with updated response shape ✅

## Notes

- DB query: `prisma.milestone.findMany` with `include: { workstream: true }` — then separately query child WorkItems by `parentAdoId IN (feature adoIds)`
- Sprint data for burnup: `prisma.sprint.findMany({ where: { id: { in: sprintIds } }, select: { id, name, startDate } })`
- Keep `formatMilestone` helper, extend it to accept progress data
- Response shape (top-level):
  ```typescript
  // GET /api/milestones response
  {
    milestones: ApiMilestoneWithProgress[];
    programRollup: ApiProgramMilestoneRollup;
  }
  ```
- This is a breaking change to the response shape — update all callers (`MilestonePanel`, dashboard page) to handle the new wrapper object
- The existing `POST /api/milestones` endpoint is unchanged (kept for any internal use)

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Tests passing (23 GET tests + 9 POST tests = 32 route tests; 100 milestones/dashboard tests) ✅
- [x] Code reviewed ✅
- [x] Documentation updated ✅
