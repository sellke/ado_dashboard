# UI Wireframes — Manual Milestone Entry

> Parent Spec: `../spec.md`
> Created: 2026-02-13

## Placement

- Page: `/dashboard`
- Section position: below existing dashboard summary and workstream cards
- Container: Mantine `Paper` or `Card` matching current dashboard visual language

## Milestone Section Layout (MVP)

1. Section header
   - Title: `Milestones`
   - Actions: `Add milestone` button
2. Progress strip
   - `Not Started: N`
   - `In Progress: N`
   - `Done: N`
   - `Completion: X%`
3. Grouped list
   - Group heading per workstream (e.g., Streams)
   - Row/card per milestone with:
     - Title
     - Target month (`MMM YYYY`)
     - Status badge
     - Optional ADO feature ID
     - Optional notes preview
     - Row actions: edit/delete

## Entry/Edit Interaction

- Trigger: `Add milestone` or row `Edit`
- Form fields:
  - Title (required)
  - Workstream (required select)
  - Target month (required month/date input)
  - Status (enum select, default NotStarted)
  - ADO Feature ID (optional number input)
  - Notes (optional textarea)
- Submission:
  - inline validation message block
  - save -> refresh list

## State Wireframes

### Loading
- Section skeleton for progress strip + grouped rows

### Empty
- Message: `No milestones yet. Add your first milestone to start tracking.`
- Primary CTA button visible

### Error
- Inline alert in milestone section only
- Retry action for milestones fetch

## Accessibility / Usability Notes

- Status badges must have text labels, not color-only meaning
- Form validation errors should be announced and shown near fields
- Keyboard access for add/edit/delete actions
- Use clear destructive confirmation for delete

## Story Traceability

- Story 2: layout, grouped list, CRUD interactions
- Story 3: progress summary and all visual state coverage

