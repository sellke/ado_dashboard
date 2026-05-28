# Align ADP milestones with Q1 FY'27

> **Type:** Improvement
> **Priority:** Normal
> **Effort:** Medium
> **Created:** 2026-05-18
> **spec_ref:** .writ/specs/2026-05-18-adp-milestones-q1-fy27/spec.md

## TL;DR

Bring milestone goal data and presentation in line with **Q1, FY'27** so the dashboard reflects the current fiscal quarter instead of stale FY26 or prior-quarter context.

## Current State

- Feature goal sync pulls ADO Features under each workstream area and derives milestones from **ADP-{MON}** tags and related rules (`lib/sync/milestone-features.ts`).
- `Milestone` records include an optional **`quarter`** field (`prisma/schema.prisma`); grouping/display may still assume an older quarter.
- Local seed data still references **Q4 FY26** sprints in places (`prisma/seed.ts`), which can mislead dev/test unless refreshed.

## Expected Outcome

- Milestone goals panel and APIs surface **Q1 FY'27** as the active quarter where users expect it (titles, grouping, or filters as designed).
- ADO-backed Features used for the rolling quarter use **ADP tags / metadata** appropriate for Q1 FY'27 months (per team practice).
- Seeds, fixtures, and tests updated so local behavior matches production intent for FY'27 Q1.
- Document or encode the **org fiscal calendar** (Q1 FY'27 boundary dates) if logic must key off dates, not only labels.

## Relevant Files

- `lib/sync/milestone-features.ts` — WIQL + ADP tag parsing and milestone upsert from ADO Features
- `lib/milestones/format.ts` — ADP / tag matching helpers shared with the milestones API
- `components/Dashboard/MilestoneGoalsPanel.tsx` — milestone grouping UI (if quarter labels need changing)

## Notes

- **ADP** here matches repo usage (ADO Feature tags like `ADP-MAR`), not a separate product named ADP.
- Scope may be **data-only** (retag in ADO + re-sync) plus small test/seed fixes, or **code** if quarter detection should be automatic—confirm during spec.
