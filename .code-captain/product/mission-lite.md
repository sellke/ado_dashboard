# Product Mission (Lite)

> Source: Complete mission.md
> Purpose: Efficient AI context for development

## Core Value

LiveLink Health Report automates weekly program health reporting for Medtronic's Unified LiveLink program by pulling data from Azure DevOps, calculating derived sprint/capacity metrics, and producing a live dashboard with PowerPoint slide export — replacing hours of manual report assembly with minutes of review.

## Target Users

Single operator (Scrum Master) runs the tool locally, produces reports consumed by POs, Directors, and Senior Directors via live demos and exported slides.

## Program Structure

- **Program:** Unified LiveLink (production line data platform)
- **ADO Org/Project:** Operations-Innovation / Event Streaming Platform
- **Team:** Yellow Boxers
- **4 Workstreams (5 Epics):**
  - Streams — real-time data ingestion
  - Pitch Tracker — pitch lifecycle management
  - Action Tracker — operational actions from data
  - KPI Services — KPI aggregation (area path: Tier Boards)
  - UCM — Unified Configuration Manager (area path: Unified Configuration Manager)
- **Sprint cadence:** 2-week, synchronized, Q4 FY26 Sprint 1 starting Feb 2026

## Key Differentiator

Combines quantitative ADO sprint metrics with AI-extracted qualitative ceremony insights in a single stakeholder-ready dashboard — something no off-the-shelf ADO reporting tool provides.

## Health Metrics

- **Execution:** Velocity (SP), overhead% (ceremony+bug+spike+support ÷ gross hours), net hours, velocity rate
- **Assessment:** Sprint predictability (actual ÷ planned), carry-over rate, aging WIP, scope creep index
- **Qualitative (Phase 2):** Risks, blockers, cross-team dependencies, recurring themes, sentiment from ceremony transcripts (VTT)

## Success Definition

Report generation goes from hours of manual assembly to < 15 minutes of review and export.

## Current Phase

**Phase 1 (MVP):** ADO data sync → metric engine → dashboard UI → milestone entry → PowerPoint export

## Technical Stack

Next.js 15 (App Router) + Mantine 8 + Prisma 6 + PostgreSQL 16. ADO data via installed MCP server. Local deployment only. PowerPoint via pptxgenjs.
