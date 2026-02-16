# Story 1: Milestone API and Validation

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** None (Prisma Milestone model already exists)

## User Story

**As a** Scrum Master / Program Lead  
**I want to** create, read, update, and delete milestones via validated API endpoints  
**So that** I can manage feature-level monthly milestones for each workstream programmatically and from the upcoming UI.

## Acceptance Criteria

- [x] Given a GET request to `/api/milestones`, when milestones exist, then return all milestones with workstream relation included, ordered by targetMonth ✅
- [x] Given a GET request to `/api/milestones?workstreamId=xyz`, when a valid workstreamId is provided, then return only milestones for that workstream ✅
- [x] Given a POST request to `/api/milestones` with valid body (title, workstreamId, targetMonth), then create a new milestone with status defaulting to NotStarted and return 201 ✅
- [x] Given a POST or PATCH request with missing required fields or invalid values, then return 400 with descriptive validation errors ✅
- [x] Given a PATCH request to `/api/milestones/[id]` with valid fields, then update the milestone and return the updated record; given a DELETE request, then delete the milestone and return 204 ✅

## Implementation Tasks

- [x] 1. Write API route tests for GET `/api/milestones` (list all, filter by workstreamId, empty state) in `__tests__/app/api/milestones/route.test.ts` ✅
- [x] 2. Write API route tests for POST `/api/milestones` (valid creation, missing fields, invalid workstreamId, invalid status) in `__tests__/app/api/milestones/route.test.ts` ✅
- [x] 3. Write API route tests for PATCH and DELETE in `__tests__/app/api/milestones/[id]/route.test.ts` (update fields, not found 404, delete success, delete not found, validation errors) ✅
- [x] 4. Implement GET and POST handlers in `app/api/milestones/route.ts` — GET returns milestones with `include: { workstream: true }`, POST validates and creates ✅
- [x] 5. Implement PATCH and DELETE handlers in `app/api/milestones/[id]/route.ts` — PATCH validates and updates, DELETE removes ✅
- [x] 6. Add shared validation helper in `lib/milestones/validation.ts` for request body validation (title required, workstreamId required, targetMonth required, status must be valid MilestoneStatus enum value) ✅
- [x] 7. Run all tests and verify acceptance criteria pass ✅

## Notes

- Use the existing Prisma client singleton from `lib/prisma.ts`
- Follow the same pattern as existing API routes (`app/api/metrics/route.ts`, `app/api/sync/ado/route.ts`)
- Include `workstream` relation in GET responses so the UI can display workstream names
- `targetMonth` is stored as DateTime in Prisma — accept ISO date strings from the client
- MilestoneStatus enum values: NotStarted, InProgress, Done
- Return proper HTTP status codes: 200 (GET/PATCH), 201 (POST), 204 (DELETE), 400 (validation), 404 (not found)
- Validation rules: `title` required, non-empty trimmed string; `workstreamId` required, must reference existing workstream; `targetMonth` required, valid ISO date; `status` optional on POST (defaults to NotStarted); `adoFeatureId` optional positive integer; `notes` optional string

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Tests passing (100%) ✅
- [x] Code reviewed ✅
- [x] Documentation updated ✅
