# MDT Slides Format Export (Lite)

> Source: `.writ/specs/2026-04-17-mdt-slides-format-export/spec.md`  
> Purpose: Efficient AI context for implementation

## For Coding Agents

**Deliverable:** Apply Medtronic slide conventions from `.cursor/skills/mdt_slides.md` to **native** pptx elements via a shared `lib/export` theme module; standard footer + title frame on every slide; MDT table pattern; align `rag-colors.ts` to MDT semantic RAG hex.

**Implementation Approach:**
- **Gold layout still:** `mockups/mdt-template-slide-reference.png` — map regions to `LAYOUT_WIDE` via theme (see `spec.md` → Visual references); font rules remain `mdt_slides` (title regular, not bold).
- Add `mdt-theme.ts` (or equivalent): colors (no `#` where pptxgenjs expects bare hex), font sizes, margins, footer layout constants, wordmark box.
- Refactor slide builders to consume theme; dedupe title/subtitle/footer positioning vs magic numbers in `slides/*.tsx`.
- Update `ragColor()` / `RAG_COLORS` to MDT semantic values (`2E7D4F` / `D19E00` / `B3261E` / null gray per skill).
- **Do not** recolor embedded Recharts PNGs in this spec — chart pixels = separate issue.

**Files in Scope:**
- `lib/export/mdt-theme.ts` (new), `lib/export/rag-colors.ts`, `lib/export/builder.ts`, `lib/export/types.ts`, `lib/export/slides/*.tsx`, `lib/export/render/chart-image.tsx` (if footer overlaps layout)

**Error Handling:**
- pptxgenjs throw → unchanged: surfaced by `DashboardContainer` / `notifications` — theme code must not catch-and-ignore.

**Integration Points:**
- Phase 1F export pipeline unchanged (`buildPresentation` serial async); performance &lt; 5s preserved.

**Line Budget Constraints:** `spec-lite.md` total &lt; 100 lines.

---

## For Review Agents

**Acceptance Criteria:**
1. Every slide shows MDT footer pattern (page #, title, date, classification) and title/subtitle styling per skill.
2. `rag-colors` / native RAG chips match MDT semantic hex; no stray non-MDT accent colors on native elements.
3. Tables use navy header + alternating rows + horizontal rules only.
4. Theme module is the single source for export chrome constants.

**Business Rules:**
- Titles: 32pt regular navy — **not bold**.
- Layout: `LAYOUT_WIDE` (already set in `builder.ts`).
- Wordmark: document embed vs fallback if asset missing.

**Experience Design:**
- Entry: Export PPTX button (unchanged).
- Happy path: download opens in PowerPoint with MDT chrome on native elements.
- Feedback: same as Phase 1F (button states).
- Error: Mantine toast on failure.

---

## For Testing Agents

**Success Criteria:**
1. Unit tests: theme color strings, `ragColor()` for Green/Amber/Red/null.
2. Manual/visual: compare exported deck to `mdt_slides` + `mockups/` screenshots.
3. Export completes in &lt; 5s with typical data (regression vs Phase 1F).

**Shadow Paths to Verify:**
- **Happy path:** Full deck download, footers on slide 1 and last slide.
- **Nil input:** [OUT OF SCOPE — export assumes dashboard state]
- **Empty input:** Best-effort slides; chrome still MDT where slide renders.
- **Upstream error:** Chart capture failure → placeholder image; **footer still present**.

**Edge Cases:**
- Single workstream vs five — footer page numbers sequential.
- Long presentation title — truncation or shrink documented in implementation.

**Coverage Requirements:**
- New theme + `ragColor` ≥80% line coverage where practical.

**Test Strategy:**
- Vitest unit tests for theme + RAG; manual PowerPoint open for footer alignment.
