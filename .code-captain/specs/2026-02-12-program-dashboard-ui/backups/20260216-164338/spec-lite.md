# Program Dashboard UI Specification (Lite)

> Source: `spec.md`
> Purpose: Compact AI context
> Created: 2026-02-12
> Contract Locked: Yes

## Core Objective

Deliver a Mantine dashboard that shows program-level sprint health and per-workstream health cards using `GET /api/metrics`, with no client-side metric recomputation.

## Must-Have UI

- Program summary section with sprint metadata and 4 core metrics
- Four workstream health cards in responsive layout
- RAG-based status presentation (from API values)
- Single "Sync Now" action that triggers full ADO refresh on click
- Automatic metrics refetch after sync completion
- Loading, empty, error, and null-value handling

## Data Contract

- Source endpoint: `GET /api/metrics`
- Trigger endpoint: `POST /api/sync/ado` (full sync only for dashboard action)
- Primary response usage:
  - `sprint` metadata
  - `program.metrics`
  - `workstreams[].metrics` and `workstreams[].detail`
  - `computedAt` freshness display
- Null-safe rendering required for all metric fields

## Non-Goals

- New metric formulas or backend aggregation logic
- Milestone entry workflows
- pptx export implementation

## Story Breakdown

1. Dashboard data contract and shell
2. Program summary section
3. Workstream health cards
4. State coverage, Storybook, and tests
5. Dashboard sync trigger and automatic refresh

## Quality Gates

- Component/unit tests for populated, empty, error, and null-value states
- Integration tests for sync click, in-flight disable, completion auto-refresh, and sync failure handling
- Storybook stories for healthy, mixed-RAG, and no-data snapshots
- Dashboard remains visually consistent with existing Mantine theme
