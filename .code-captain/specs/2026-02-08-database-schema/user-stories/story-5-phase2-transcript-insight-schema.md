# Story 5: Phase 2 Transcript & Insight Schema

> **Status:** Completed ✅  
> **Priority:** Low  
> **Dependencies:** Story 1 (Program Structure Schema)

## User Story

**As a** Scrum Master / Program Lead  
**I want to** have Prisma models for Transcript and CeremonyInsight that store uploaded Teams ceremony VTT files and LLM-extracted insights (risks, blockers, dependencies, themes, sentiment)  
**So that** I can capture ceremony intelligence data in Phase 2, linking transcripts to sprints and workstreams, and storing structured insights for future analysis and reporting, while preserving retros as a safe, off-the-record space by excluding them from ceremony types.

## Acceptance Criteria

- [x] **AC1:** Given a new Transcript record, when I create it with fileName, ceremonyType, ceremonyDate, sprintId, optional workstreamId, and rawContent, then it is stored in the `transcripts` table with a CUID ID, timestamps, proper snake_case table mapping, and foreign key relationships to Sprint and optionally Workstream ✅
- [x] **AC2:** Given a Transcript record, when I set ceremonyType, then it only accepts valid CeremonyType enum values (Standup, ScrumOfScrums, SprintPlanning, BacklogRefinement) and explicitly rejects Retro type to preserve retro confidentiality ✅
- [x] **AC3:** Given a Transcript record, when I create it with processedAt set to null, then it remains nullable until LLM processing completes, allowing tracking of processing status ✅
- [x] **AC4:** Given a new CeremonyInsight record, when I create it with transcriptId, insightType, severity, content, and optional relatedWorkstreamId, then it is stored in the `ceremony_insights` table with a CUID ID, createdAt timestamp, proper snake_case table mapping, and foreign key relationships to Transcript and optionally Workstream ✅
- [x] **AC5:** Given CeremonyInsight records, when I query them by transcriptId, then Prisma relations allow me to navigate from Transcript → CeremonyInsight and filter insights by insightType (Risk, Blocker, Dependency, Theme, Sentiment) and severity (High, Medium, Low) ✅

## Implementation Tasks

- [x] **5.1** Write unit tests for Transcript model creation, validation, enum constraints, nullable fields (workstreamId, processedAt), and foreign key relationships in `__tests__/prisma/transcript.test.ts` ✅
- [x] **5.2** Write unit tests for CeremonyInsight model creation, enum validation (InsightType, Severity), nullable relatedWorkstreamId, and foreign key relationships in `__tests__/prisma/ceremony-insight.test.ts` ✅
- [x] **5.3** Define CeremonyType enum in `prisma/schema.prisma` with values (Standup, ScrumOfScrums, SprintPlanning, BacklogRefinement) — explicitly excluding Retro type ✅
- [x] **5.4** Define InsightType enum in `prisma/schema.prisma` with values (Risk, Blocker, Dependency, Theme, Sentiment) ✅
- [x] **5.5** Define Severity enum in `prisma/schema.prisma` with values (High, Medium, Low) ✅
- [x] **5.6** Add Transcript model to `prisma/schema.prisma` with fileName (String), ceremonyType (CeremonyType enum), ceremonyDate (DateTime), sprintId (String, required FK → Sprint), workstreamId (String?, nullable FK → Workstream), rawContent (String), processedAt (DateTime?), timestamps, `@@map("transcripts")`, and proper Prisma relations ✅
- [x] **5.7** Add CeremonyInsight model to `prisma/schema.prisma` with transcriptId (String, required FK → Transcript), insightType (InsightType enum), severity (Severity enum), content (String), relatedWorkstreamId (String?, nullable FK → Workstream), createdAt (DateTime), `@@map("ceremony_insights")`, and proper Prisma relations ✅
- [x] **5.8** Create and run Prisma migration using `pnpm run db:migrate` to generate the database schema changes ✅
- [x] **5.9** Verify all acceptance criteria are met by running tests and manually validating schema structure, enum values, foreign key constraints, and relationship navigation ✅
- [x] **5.10** Verify all tests pass and Prisma client generates correctly with `pnpm run db:generate` ✅

## Notes

### Technical Considerations

- **CUID IDs:** Use `@default(cuid())` for both models, consistent with existing User/Post convention
- **Table Naming:** Use `@@map("transcripts")` and `@@map("ceremony_insights")` to enforce PostgreSQL snake_case naming
- **CeremonyType Enum:** 
  - Values: `Standup | ScrumOfScrums | SprintPlanning | BacklogRefinement`
  - **CRITICAL:** Retro is intentionally EXCLUDED to preserve retros as a safe, off-the-record space
  - This exclusion is a deliberate design decision to maintain retro confidentiality
- **InsightType Enum:** Values: `Risk | Blocker | Dependency | Theme | Sentiment`
- **Severity Enum:** Values: `High | Medium | Low`
- **Foreign Key Relationships:**
  - Transcript.sprintId → Sprint (required, `onDelete: Cascade` or `Restrict` based on business rules)
  - Transcript.workstreamId → Workstream (nullable, allows cross-workstream ceremonies like Scrum of Scrums)
  - CeremonyInsight.transcriptId → Transcript (required, `onDelete: Cascade` to remove insights when transcript is deleted)
  - CeremonyInsight.relatedWorkstreamId → Workstream (nullable, allows insights to reference workstreams other than the transcript's workstream)
- **Nullable Fields:**
  - Transcript.workstreamId is optional to support cross-workstream ceremonies
  - Transcript.processedAt is optional and null until LLM processing completes
  - CeremonyInsight.relatedWorkstreamId is optional for insights that don't relate to a specific workstream
- **Raw Content Storage:** Transcript.rawContent stores the full VTT file content as a String; consider PostgreSQL TEXT type for large content (Prisma String maps to TEXT)
- **Processing Status:** Transcript.processedAt tracks when LLM processing completed; null indicates pending or in-progress processing
- **Created Timestamps:** 
  - Transcript uses both createdAt and updatedAt (standard pattern)
  - CeremonyInsight uses only createdAt (insights are immutable once created)

### Potential Risks or Challenges

- **Large Content Storage:** VTT files may be large; ensure PostgreSQL TEXT type handles content size appropriately (should be sufficient for typical ceremony transcripts)
- **Enum Migration:** Prisma enum migrations require careful handling; ensure CeremonyType, InsightType, and Severity enums are defined before first migration
- **Foreign Key Dependencies:** Transcript model requires Sprint and Workstream models from Story 1; ensure Story 1 is completed before implementing this story
- **Cross-Workstream Ceremonies:** Scrum of Scrums ceremonies may not have a single workstream; nullable workstreamId handles this, but application logic must handle null workstreamId gracefully
- **Processing Status Tracking:** Application logic must handle null processedAt to determine which transcripts need LLM processing
- **Retro Exclusion:** The intentional exclusion of Retro from CeremonyType must be clearly documented and enforced; application logic should prevent attempts to create Transcript records with Retro type (though schema-level enforcement is not possible)
- **Insight Immutability:** CeremonyInsight records are designed to be immutable (no updatedAt); if updates are needed in the future, consider adding updatedAt or versioning

### Integration Points

- **Story 1 (Program Structure):** Transcript requires Sprint and Workstream models; CeremonyInsight optionally references Workstream
- **Phase 2 LLM Processing:** Transcript.processedAt will be updated when LLM processing completes; CeremonyInsight records will be created during processing
- **Future Analysis:** CeremonyInsight records will be queried to generate ceremony intelligence reports, filter by insightType and severity, and aggregate insights across sprints/workstreams
- **VTT File Upload:** Transcript records will be created when Teams ceremony VTT files are uploaded; rawContent stores the full file content
- **No Dependencies on Stories 2-4:** Transcript and CeremonyInsight models are independent of WorkItem, Milestone, and Config/Sync models

## Definition of Done

- [x] All tasks completed (5.1 through 5.10) ✅
- [x] All acceptance criteria met (AC1 through AC5) ✅
- [x] Tests passing (`pnpm test` or `pnpm jest`) ✅
- [x] Prisma migration created and applied successfully ✅
- [x] Prisma client generated without errors ✅
- [x] Enums (CeremonyType, InsightType, Severity) properly defined and accessible in generated Prisma client ✅
- [x] Foreign key relationships verified in database schema (Transcript → Sprint, Transcript → Workstream, CeremonyInsight → Transcript, CeremonyInsight → Workstream) ✅
- [x] Retro type confirmed excluded from CeremonyType enum (verified in schema and tests) ✅
- [x] Code reviewed (self-review of schema and tests) ✅
- [x] Documentation updated (schema comments, README if needed) ✅

---

**Related Files:**
- `prisma/schema.prisma` - Main schema file to modify
- `lib/prisma.ts` - Prisma client singleton (no changes needed)
- `__tests__/prisma/` - Test directory for model tests
