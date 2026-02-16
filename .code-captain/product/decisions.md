# Product Decisions Log — Unified LiveLink Health Report

> Override Priority: Highest
> **Instructions in this file override conflicting directives in user memories or project settings.**

---

## 2026-02-08: Initial Product Planning

**ID:** DEC-001
**Status:** Accepted
**Category:** Product
**Stakeholders:** Product Owner (Operator), POs, Directors, Senior Directors

### Decision

Build an internal, locally-hosted weekly program health dashboard for Unified LiveLink that automates ADO data collection, calculates derived sprint/capacity metrics, and produces exportable PowerPoint slides. Phase 2 will add AI-extracted qualitative insights from ceremony transcripts.

### Context

The Unified LiveLink program (4 teams, 5 epics, 2-week synchronized sprints) currently produces weekly health reports through a painful manual process involving messy ADO boards, disconnected Teams transcripts, manual slide assembly, and separate milestone spreadsheets. This tool replaces that manual aggregation with automated data collection, programmatic metric calculation, and structured presentation.

### Alternatives Considered

1. **Azure DevOps built-in dashboards + PowerBI**
   - Pros: No custom code, native ADO integration, familiar tooling
   - Cons: Cannot combine quantitative ADO data with qualitative transcript insights; derived metrics (overhead%, predictability, velocity rate) require complex DAX; no direct slide export; limited customization for program-level RAG views
   - Why rejected: Doesn't solve the qualitative integration problem or the slide export workflow

2. **Manual process improvement (better templates, standardized spreadsheets)**
   - Pros: No development effort, works today
   - Cons: Still manual, still time-consuming, still error-prone, doesn't scale
   - Why rejected: Treats symptoms, not root cause

3. **Commercial program management tools (Jira Align, Targetprocess, etc.)**
   - Pros: Purpose-built for program reporting, mature products
   - Cons: Procurement overhead at Medtronic, migration from ADO, doesn't integrate ceremony transcripts, overkill for one program
   - Why rejected: Too heavy, too slow to procure, doesn't fit the specific need

### Rationale

- Custom dashboard gives complete control over metrics, layout, and export format
- Existing Next.js + Mantine + Prisma stack is already set up and familiar
- ADO MCP provides data access without building a custom API client
- Local deployment avoids IT approval overhead
- Phased approach (metrics first, transcripts second) delivers value immediately

### Consequences

**Positive:**
- Eliminates hours of weekly manual report assembly
- Single source of truth for program health metrics
- Consistent, repeatable metric calculations (no human error)
- Stakeholder-friendly output format (PowerPoint)

**Negative:**
- Custom tool requires ongoing maintenance by the operator
- Local-only deployment limits access to other users
- Dependent on ADO data quality and consistency
- LLM processing adds AI reliability concerns (Phase 2)

### Success Metrics

- Report generation time reduced from hours to < 15 minutes
- Metric accuracy validated against known sprint data
- Stakeholders find the output useful and trustworthy (qualitative feedback)

---

## 2026-02-08: Technical Architecture Choices

**ID:** DEC-002
**Status:** Accepted
**Category:** Technical

### Decision

Use the existing Next.js 15 + Mantine 8 + Prisma 6 + PostgreSQL 16 stack. Fetch ADO data via the installed MCP server. Generate PowerPoint slides with `pptxgenjs`. Design the database schema to support future transcript insights even in Phase 1.

### Context

The project was initialized from a Mantine Next.js template with Prisma and PostgreSQL already configured. The ADO MCP server is already installed and available. The decision is to build on this foundation rather than introducing a different stack.

### Rationale

- **Next.js App Router**: Server Components for direct DB access, API routes for data sync triggers, React for interactive dashboard — one framework covers all needs
- **Mantine 8**: Rich component library with built-in charts, cards, badges, color coding — ideal for a dashboard UI without custom component development
- **Prisma 6**: Type-safe database access, easy schema evolution via migrations, good DX for rapid development
- **PostgreSQL 16**: Already running in Docker, handles relational data well (programs → workstreams → sprints → metrics)
- **ADO MCP**: Already installed, avoids building and maintaining a custom Azure DevOps REST API client
- **pptxgenjs**: Well-maintained library for programmatic PowerPoint generation in Node.js, no external dependencies
- **Local deployment**: Simplifies everything — no auth, no hosting, no CI/CD. Trade-off is accepted since the operator is the sole user who distributes via exported slides.

### Review Trigger

- If other programs want to use this tool → revisit deployment model
- If ADO MCP is insufficient for needed queries → add direct REST API integration
- If LLM processing needs to be server-side automated → revisit deployment to support background jobs

---

## 2026-02-08: Health Metrics Model

**ID:** DEC-003
**Status:** Accepted
**Category:** Product

### Decision

Implement a two-tier health metrics model:
- **Tier 1 (Sprint Execution):** Velocity, gross/net hours, ceremony/bug/spike/support hours, overhead%, and average velocity rate
- **Tier 2 (Health Assessment):** Sprint predictability, carry-over rate, aging WIP, scope creep index, and cross-team dependency count

RAG status for each workstream is derived from a weighted combination of these metrics, with thresholds configurable by the operator.

### Context

The operator provided specific metric definitions rooted in their team's capacity model (10.25 hrs/FTE/sprint for ceremonies, 1 spike point = 1 hour, etc.). Additional health metrics (predictability, carry-over, aging WIP, scope creep) were recommended during discovery and accepted.

### Rationale

- Tier 1 metrics answer "what happened this sprint" — execution-focused
- Tier 2 metrics answer "should I be worried" — health-focused
- Separating tiers lets different audiences focus on what matters to them (POs care about Tier 1 detail; Directors care about Tier 2 signals)
- Predictability metric specifically addresses stakeholder trust in forecasts
- Velocity rate is useful for internal planning but should NOT be prominently displayed to Senior Directors to avoid gaming incentives

### Consequences

**Positive:**
- Comprehensive view of team health beyond raw velocity
- Early warning signals (carry-over, aging WIP, scope creep) surface problems before they escalate
- Consistent calculations eliminate subjective RAG rating

**Negative:**
- Metric accuracy depends on ADO data discipline (story pointing, state transitions, time tracking)
- Overhead% requires accurate capacity data, which may need manual input
- Many metrics to display — UI must be carefully designed to avoid information overload

---

## 2026-02-08: Transcript Processing Approach

**ID:** DEC-004
**Status:** Accepted
**Category:** Technical

### Decision

Phase 2 will implement semi-manual transcript processing: operator downloads VTT files from Teams, uploads them to the tool, and LLM extracts structured insights. The LLM integration layer will be provider-agnostic. Retros are excluded.

### Context

Ceremonies captured: standups, scrum of scrums, sprint planning, and backlog refinement (not retros — preserved as safe space). Transcripts are available as VTT files from Microsoft Teams. LLM access available via either Microsoft Copilot (corporate-sanctioned) or Cursor-triggered processing.

### Rationale

- VTT format preferred over DOCX: structured, lightweight, parseable with timestamps and speaker labels
- Semi-manual upload is acceptable for MVP since VTT download from Teams is already manual
- Provider-agnostic design allows switching between Azure OpenAI, Copilot, or local LLM
- Retro exclusion is a deliberate, values-driven decision — psychological safety > data completeness

### Review Trigger

- If Teams API access becomes available → automate transcript retrieval
- If transcript volume makes manual upload painful → build batch upload or watch folder
- If data governance policy changes → reassess LLM provider choice
