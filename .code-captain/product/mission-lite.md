# Product Mission (Lite)

> Source: Complete mission.md
> Purpose: Efficient AI context for development
> Last Updated: 2026-02-18

## Core Value

LiveLink Health Report automates weekly program health reporting for Medtronic's Unified LiveLink program by pulling data from Azure DevOps, calculating derived sprint/capacity metrics, and producing a live dashboard with PowerPoint slide export — replacing hours of manual report assembly with minutes of review.

## Target Users

Single operator (Scrum Master) runs the tool locally, produces reports consumed by POs, Directors, and Senior Directors via live demos and exported slides.

## Program Structure

- **Program:** Unified LiveLink (production line data platform)
- **ADO Org/Project:** Operations-Innovation / Event Streaming Platform
- **Team:** Yellow Boxers
- **5 Workstreams (5 Epics):**
  - Streams — real-time data ingestion
  - Pitch Tracker — pitch lifecycle management
  - Action Tracker — operational actions from data
  - KPI Services — KPI aggregation (area path: Tier Boards)
  - UCM — Unified Configuration Manager (area path: Unified Configuration Manager)
- **Sprint cadence:** 2-week, synchronized, Q4 FY26 Sprint 2, Week 2

## Key Differentiator

Combines quantitative ADO sprint metrics with AI-extracted qualitative ceremony insights in a single stakeholder-ready dashboard — something no off-the-shelf ADO reporting tool provides.

## Report Structure (4 Sections)

1. **Program Summary** — Avg Velocity, Avg Velocity Rate, Carry-over %, Overhead %, Monthly Milestone Completion %, Quarterly Milestone Progress (all RAG-coded)
2. **Workstream Velocity** — Per-workstream velocity, velocity rate, carry-over with trends. Current sprint shows predicted values based on historical averages × available hours.
3. **Workstream Overhead** — Per-workstream overhead % composition (ceremony/bug/support/spike) plus individual bug and support item listings (title, hours, status)
4. **Workstream Milestones** — ADO Features tagged with monthly goals, tracked by child story SP completion. Monthly targets (end of month), quarterly roll-up.

## Health Metrics

- **Execution:** Velocity (SP), overhead% (ceremony+bug+spike+support / gross hours), net hours, velocity rate
- **Assessment:** Sprint predictability (actual / planned), carry-over rate, aging WIP, scope creep index
- **Milestones:** Monthly goal completion % (completed SP / total SP per tagged Feature), quarterly progress roll-up
- **Qualitative (Phase 2):** Risks, blockers, cross-team dependencies, recurring themes, sentiment from ceremony transcripts (VTT)

## Milestone Model

ADO Features tagged with monthly goal identifiers (e.g., `Feb-Goal`). Child User Stories and their story points are the unit of progress. % Complete = completed SP / total SP. Total SP is a living number. Target = end of tagged month.

## Success Definition

Report generation goes from hours of manual assembly to < 15 minutes of review and export.

## Current Phase

**Phase 1A (Done):** ADO data sync → metric engine → APIs — fully operational.
**Phase 1B–1F (Next):** Report UI (Program Summary → Workstream Velocity → Workstream Overhead → Workstream Milestones → PowerPoint Export).

## Technical Stack

Next.js 15 (App Router) + Mantine 8 + Prisma 6 + PostgreSQL 16. ADO data via installed MCP server. Local deployment only. PowerPoint via pptxgenjs.
