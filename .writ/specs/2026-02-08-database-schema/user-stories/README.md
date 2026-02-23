# User Stories Overview

> **Specification:** Database Schema
> **Created:** 2026-02-08
> **Status:** Completed ✅

## Stories Summary

| Story | Title | Status | Tasks | Progress | Priority |
|---|---|---|---|---|---|
| 1 | Program Structure Schema | Completed ✅ | 7 | 7/7 | High |
| 2 | ADO Work Item Schema | Completed ✅ | 9 | 9/9 | High |
| 3 | ADP Milestone Schema | Completed ✅ | 7 | 7/7 | High |
| 4 | Configuration & Sync Infrastructure | Completed ✅ | 9 | 9/9 | Medium |
| 5 | Phase 2 Transcript & Insight Schema | Completed ✅ | 10 | 10/10 | Low |
| 6 | Schema Cleanup, Seed Data & Migration | Completed ✅ | 12 | 12/12 | High |

**Total Progress:** 54/54 tasks (100%)

## Story Dependencies

```
Story 1 (Program Structure) ─── No dependencies (start here)
  ├── Story 2 (Work Items) ─── Depends on Story 1
  ├── Story 3 (Milestones) ─── Depends on Story 1
  └── Story 5 (Phase 2) ──── Depends on Story 1

Story 4 (Config & Sync) ─────── No dependencies (can parallel with Story 1)

Story 6 (Cleanup & Seed) ────── Depends on Stories 1–5 (final integration)
```

### Recommended Build Order

1. **Story 1** + **Story 4** in parallel (no dependencies)
2. **Story 2** + **Story 3** + **Story 5** in parallel (all depend only on Story 1)
3. **Story 6** last (integrates everything, removes boilerplate, seeds data)

## Quick Links

- [Story 1: Program Structure Schema](./story-1-program-structure-schema.md)
- [Story 2: ADO Work Item Schema](./story-2-ado-work-item-schema.md)
- [Story 3: ADP Milestone Schema](./story-3-adp-milestone-schema.md)
- [Story 4: Configuration & Sync Infrastructure](./story-4-config-and-sync-infrastructure.md)
- [Story 5: Phase 2 Transcript & Insight Schema](./story-5-phase2-transcript-insight-schema.md)
- [Story 6: Schema Cleanup, Seed Data & Migration](./story-6-cleanup-seed-migration.md)

## Key Design Decisions

- **Raw data only** — No pre-computed metric snapshots; calculate from WorkItem data on the fly
- **Manual sprint snapshots** — Operator enters plannedPoints/completedPoints per SprintWorkstream
- **ADP Commitments** — Milestones linked to ADO Features tagged "ADP Commitment"
- **Auto RAG** — Calculated from configurable thresholds (no manual override)
- **Single program** — Workstream is top-level entity (no Program table)
- **Phase 2 included** — Transcript + CeremonyInsight tables created now

## Models Created

| # | Model | Table | Phase |
|---|---|---|---|
| 1 | Workstream | workstreams | 1 |
| 2 | Sprint | sprints | 1 |
| 3 | SprintWorkstream | sprint_workstreams | 1 |
| 4 | WorkItem | work_items | 1 |
| 5 | Milestone | milestones | 1 |
| 6 | ThresholdConfig | threshold_configs | 1 |
| 7 | SyncLog | sync_logs | 1 |
| 8 | Transcript | transcripts | 2 |
| 9 | CeremonyInsight | ceremony_insights | 2 |

**Removed:** User (users), Post (posts) — boilerplate from Mantine template
