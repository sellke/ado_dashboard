# Delivery-to-Bug Ratio Metric (Lite)

> Source: .writ/specs/2026-06-04-delivery-to-bug-ratio-metric/spec.md
> Purpose: Efficient AI context for implementation

## For Coding Agents

**Deliverable:** Delivery-to-bug ratio = Σ completed delivery points ÷ Σ bug hours, shown as a
RAG-badged tile on each workstream card and the program top-line. Derived on-the-fly (no migration).

**Implementation Approach:**
- Mirror `velocityRate`: pure helper + sum-then-divide in `buildTrendSeries` (ws + program).
- Numerator = existing `completedPoints` (done-like, excl Bug/Spike), 1 SP = 1 hr.
- Denominator = existing `bugHours` (`completedWork ?? originalEstimate ?? 0`).
- RAG via `assignRag` over a NEW seeded `deliveryToBugRatio` ThresholdConfig + zero-bug wrapper.

**Files in Scope:**
- `lib/metrics/trend-service.ts` — `calculateDeliveryToBugRatio` + aggregation.
- `lib/metrics/rag.ts` — `assignDeliveryToBugRag` (Green when bugHours=0 & delivery>0).
- `prisma/seed.ts` — add `deliveryToBugRatio` threshold (Green≥4, Amber 2–3.99, Red<2).
- `app/api/metrics/route.ts` — surface ws ratio + program ratio + rag.
- `lib/dashboard/adapter.ts` + `types.ts` — "Delivery/Bug" + "Avg Total Delivery/Bug" tiles.
- `lib/metrics/definitions.ts` — `deliveryToBugRatio` MetricId + copy.

**Error Handling:**
- `bugHours=0 & delivery>0` → `—`, Green. `0/0` → `—`, null RAG. No snapshot → `N/A`.

---

## For Review Agents

**Acceptance Criteria:**
1. Card + program tiles match hand-computed Σ-points ÷ Σ-bug-hours.
2. Zero-bug rules: `>0` delivery → `—`+Green; `0/0` → `—`+no RAG; no data → `N/A`.
3. RAG matches seeded thresholds; aggregation sums-then-divides (never averages ratios).

**Business Rules:**
- 1 SP = 1 hour numerator; denominator = existing bugHours.
- Higher ratio = healthier (opposite of overhead direction).
- Program & card-window both sum-then-divide.
- No Prisma migration (completedPoints + bugHours already persisted).

**Experience Design:**
- Entry: always-visible tile (no interaction).
- Happy path: number to 2 decimals + RAG badge + definition tooltip.
- Moment of truth: instant read of delivery health vs. bug load.
- Feedback: re-renders with dashboard load/scope change.
- Error: `N/A` / `—` per rules; no new states.

---

## For Testing Agents

**Success Criteria:**
1. Calc + RAG unit coverage ≥80%; divide-by-zero paths 100%.
2. Adapter maps both tiles with correct format + RAG.
3. Existing suite still green.

**Shadow Paths to Verify:**
- **Happy path:** points + bug hours → ratio + threshold RAG.
- **Nil input:** null completedPoints/bugHours → `N/A`, no crash.
- **Empty input:** `bugHours=0` → `—` (Green if delivery>0, else null).
- **Upstream error:** metrics fetch fails → existing dashboard error view.

**Edge Cases:**
- `0/0` → `—`, null RAG (not Green).
- Ratio exactly 4.00 → Green; exactly 2.00 → Amber; 1.99 → Red.

**Coverage Requirements:** New code ≥80%; error/zero paths 100%.

**Test Strategy:** Unit (calc + rag + definitions), adapter mapping, route surface.
