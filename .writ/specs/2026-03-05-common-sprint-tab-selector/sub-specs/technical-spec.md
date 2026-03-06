# Common Sprint Tab Selector — Technical Specification

> **Spec:** 2026-03-05-common-sprint-tab-selector  
> **Created:** 2026-03-05  
> **Tech Stack:** Next.js 15.3.3 (App Router), React 19.1.0, Mantine 8.2.1, TypeScript 5.8.3 (strict), Jest 30 + RTL, Recharts 2.15.4

---

## 1. Component Specifications

### 1.1 SprintTabSelector (New Component)

**Location:** `components/Dashboard/SprintTabSelector.tsx`

**Purpose:** Shared sprint selector rendered above the workstream cards grid. Replaces four duplicate per-card tab bars with a single controlled Mantine Tabs component.

**Props Interface:**

```typescript
export interface SprintTabSelectorProps {
  /** Sprint list derived from sprintStoriesMap (first non-empty workstream) */
  sprints: SprintStoryViewModel[];
  /** Currently selected sprint ID (controlled) */
  activeSprintId: string;
  /** Called when user selects a different sprint tab */
  onSprintChange: (sprintId: string) => void;
  /** When true, render loading skeleton instead of tabs */
  loading?: boolean;
}
```

**Mantine Tabs Usage:**

- Use `Tabs` with `value={activeSprintId}` and `onChange={onSprintChange}` (controlled mode)
- `variant="outline"` to match existing dashboard UI
- `Tabs.List` contains one `Tabs.Tab` per sprint
- Mantine requires a `Tabs.Panel` per tab; use minimal content (e.g. `null` or empty fragment) since the actual story content is rendered inside each `SprintStoryListPanel` below

**Badge Rendering:**

- Each tab shows sprint name + story-count badge when `sprint.totalStories > 0`
- Badge: `Badge size="xs" variant="light"` (muted, matches `SprintStoryListPanel` style)
- Badge displays `sprint.totalStories`

**Current Sprint Indicator:**

- Sprint where `sprint.isCurrent === true` gets visual distinction
- Options: `(current)` suffix in tab label, or `Badge color="blue"` for current sprint tab
- Per Story 2: "The current sprint tab has visual distinction (e.g., '(current)' label or different badge color)"

**Edge Case Handling:**

- If `sprints.length === 0`: return `null` (selector hidden)
- If `loading === true`: return skeleton or `null` (parent may hide section)
- Single sprint: render one tab; selection is fixed

**Reference:** Story 2

---

### 1.2 SprintStoryListPanel (Refactored)

**Location:** `components/Dashboard/SprintStoryListPanel.tsx`

**Purpose:** Renders a single sprint's story list (status groups + story rows). No internal tab bar; controlled by parent via `activeSprintId`.

**New Props Interface:**

```typescript
export interface SprintStoryListPanelProps {
  /** Full sprint list for this workstream (used to find selected sprint) */
  sprints: SprintStoryViewModel[];
  /** ID of the sprint to display (controlled by parent) */
  activeSprintId: string;
  loading?: boolean;
  error?: string | null;
}
```

**Removed Elements:**

- `Tabs`, `Tabs.List`, `Tabs.Tab`, `Tabs.Panel` — all removed
- `defaultValue` / uncontrolled behavior — removed in Story 3 cleanup

**Rendering Logic:**

1. **Loading:** Same as before — `Skeleton` stack with `data-testid="sprint-story-list-panel"`
2. **Error:** Same as before — `Text c="red"` with error message
3. **Empty sprints:** Same as before — "No sprint data available"
4. **No matching sprint:** Find sprint by `sprints.find(s => s.id === activeSprintId)`. If not found, render fallback: "No stories for selected sprint" or empty state
5. **Match found:** Render `Stack` of `StatusSection` components for `sprint.statusGroups` (Planned, Active, Resolved, Completed order)
6. **Empty status groups:** "No user stories in this sprint"

**Sub-components (unchanged):**

- `StoryRow` — renders story link, title, assignee, points badge
- `StatusSection` — renders group label, badge count, story rows

**Reference:** Story 1, Story 3

---

## 2. State Management

### 2.1 State Location

- **Owner:** `WorkstreamCardsGrid`
- **Type:** `useState<string>` for `activeSprintId`
- **Scope:** Local component state; no global store

### 2.2 Initialization Strategy

**Problem:** Sprint data arrives asynchronously via `sprintStoriesMap`. Initial value must be computed when data first becomes available.

**Option A — useEffect (recommended):**

```typescript
const [activeSprintId, setActiveSprintId] = useState<string>('');

useEffect(() => {
  const sprints = deriveSprintList(sprintStoriesMap);
  if (sprints.length === 0) return;
  // Only set if not yet initialized or current selection is invalid
  setActiveSprintId((prev) => {
    if (!prev) {
      const current = sprints.find((s) => s.isCurrent);
      return current?.id ?? sprints[0].id;
    }
    const stillValid = sprints.some((s) => s.id === prev);
    return stillValid ? prev : (sprints.find((s) => s.isCurrent)?.id ?? sprints[0].id);
  });
}, [sprintStoriesMap]);
```

**Option B — Computed on render with ref:**

```typescript
const initializedRef = useRef(false);
const sprints = deriveSprintList(sprintStoriesMap);
const [activeSprintId, setActiveSprintId] = useState<string>(() => '');

// During render: if data just arrived and not yet initialized, use default
const effectiveId = activeSprintId || (sprints[0] ? (sprints.find(s => s.isCurrent)?.id ?? sprints[0].id) : '');
// Ref tracks first init; subsequent renders use state
```

**Recommendation:** Option A (useEffect) is clearer and handles async data arrival, re-fetches, and validation of current selection when sprint list changes.

### 2.3 Sprint List Derivation

See Section 4.

---

## 3. Props Changes

### 3.1 WorkstreamCardsGrid

**Current:**

```typescript
export interface WorkstreamCardsGridProps {
  cards: WorkstreamCardViewModel[];
  milestonesLoading?: boolean;
  milestonesError?: string | null;
  sprintStoriesMap?: Record<string, SprintStoryViewModel[]>;
  storiesLoading?: boolean;
  storiesError?: string | null;
}
```

**Target:** No interface change. Internal implementation adds:

- `useState<string>` for `activeSprintId`
- `useEffect` for initialization (or equivalent)
- `deriveSprintList(sprintStoriesMap)` call
- Renders `SprintTabSelector` above `SimpleGrid`
- Passes `activeSprintId` to each `WorkstreamHealthCard`

### 3.2 WorkstreamHealthCard

**Current:**

```typescript
export interface WorkstreamHealthCardProps {
  card: WorkstreamCardViewModel;
  milestonesLoading?: boolean;
  milestonesError?: string | null;
  sprintStories?: SprintStoryViewModel[];
  storiesLoading?: boolean;
  storiesError?: string | null;
}
```

**Target:**

```typescript
export interface WorkstreamHealthCardProps {
  card: WorkstreamCardViewModel;
  milestonesLoading?: boolean;
  milestonesError?: string | null;
  sprintStories?: SprintStoryViewModel[];
  /** ID of the sprint to display in SprintStoryListPanel (controlled by parent) */
  activeSprintId?: string;
  storiesLoading?: boolean;
  storiesError?: string | null;
}
```

- **New:** `activeSprintId?: string` — forwarded to `SprintStoryListPanel`
- When `activeSprintId` is undefined (e.g. loading, no sprint data), `SprintStoryListPanel` receives empty string or a safe fallback; panel handles missing match

### 3.3 SprintStoryListPanel

**Current:**

```typescript
export interface SprintStoryListPanelProps {
  sprints: SprintStoryViewModel[];
  loading?: boolean;
  error?: string | null;
}
```

**Target:**

```typescript
export interface SprintStoryListPanelProps {
  sprints: SprintStoryViewModel[];
  activeSprintId: string;
  loading?: boolean;
  error?: string | null;
}
```

- **New (required):** `activeSprintId: string`

---

## 4. Sprint List Derivation

### 4.1 deriveSprintList Function

**Location:** `lib/dashboard/sprint-utils.ts` (new) or inline in `WorkstreamCardsGrid`

```typescript
import type { SprintStoryViewModel } from './types';

/**
 * Extracts a unified sprint list from sprintStoriesMap.
 * Uses the first non-empty workstream's sprints (all workstreams share the same rolling 5-sprint window).
 */
export function deriveSprintList(
  sprintStoriesMap: Record<string, SprintStoryViewModel[]> | undefined
): SprintStoryViewModel[] {
  if (!sprintStoriesMap || typeof sprintStoriesMap !== 'object') {
    return [];
  }
  const firstNonEmpty = Object.values(sprintStoriesMap).find(
    (sprints) => Array.isArray(sprints) && sprints.length > 0
  );
  return firstNonEmpty ?? [];
}
```

### 4.2 Edge Cases

| Case | Behavior |
|------|----------|
| `sprintStoriesMap` undefined | Return `[]` |
| `sprintStoriesMap` empty `{}` | Return `[]` |
| All workstreams have empty `[]` | Return `[]` |
| First non-empty has sprints | Return that array (order preserved from API) |
| Mismatched sprint IDs across workstreams | Use first workstream's list; each card finds its own sprint by ID. If a workstream lacks that ID, it shows empty state |
| Async data arrival | `deriveSprintList` is called on each render; when data arrives, sprint list updates; `useEffect` syncs `activeSprintId` |

---

## 5. Edge Cases

### 5.1 No Data

- `sprintStoriesMap` empty or undefined → `deriveSprintList` returns `[]`
- `SprintTabSelector` receives `sprints={[]}` → returns `null` (hidden)
- Cards still render; `SprintStoryListPanel` receives `sprintStories={[]}` or `undefined` → "No sprint data available"

### 5.2 Loading State

- `storiesLoading === true` → `SprintTabSelector` can receive `loading={true}` and render nothing or skeleton
- `SprintStoryListPanel` already handles `loading` — shows skeleton
- Selector hidden until data loads (optional: show skeleton placeholder)

### 5.3 Single Sprint

- One sprint in list → one tab; `activeSprintId` set to that sprint's ID
- No tab switching possible; UI still consistent

### 5.4 Mismatched Sprint IDs

- Rare: different workstreams have different sprint sets (API change, bug)
- Each card has `sprintStories` for its workstream
- Card finds `sprintStories.find(s => s.id === activeSprintId)`
- If not found → render "No stories for selected sprint" or empty state
- User can still switch tabs; other workstreams with matching ID will show data

### 5.5 Async Data Arrival

- Initial render: `sprintStoriesMap` is `{}` → no selector, no stories
- After fetch: `sprintStoriesMap` populated → `useEffect` runs, sets `activeSprintId` to current sprint
- Selector appears; all cards show selected sprint's stories

---

## 6. Test Strategy

### 6.1 SprintTabSelector (Unit)

| Test | Description |
|------|--------------|
| Renders tabs for each sprint | Given `sprints` with 3 items, renders 3 tabs with correct names |
| Shows badge when totalStories > 0 | Badge displays count |
| Hides badge when totalStories === 0 | No badge rendered |
| Marks current sprint | Sprint with `isCurrent: true` has visual indicator |
| Calls onSprintChange when tab clicked | User clicks tab → `onSprintChange` called with sprint ID |
| Returns null when sprints empty | `sprints={[]}` → renders nothing |
| Handles loading state | `loading={true}` → skeleton or null |
| Controlled value | `activeSprintId` prop determines which tab is active |

### 6.2 SprintStoryListPanel (Unit)

| Test | Description |
|------|--------------|
| Renders status groups for active sprint | Given `activeSprintId` matching a sprint, renders its `statusGroups` |
| Shows empty state when no match | `activeSprintId` not in `sprints` → "No stories for selected sprint" or similar |
| Loading state | `loading={true}` → skeleton |
| Error state | `error="msg"` → error text |
| Empty sprints | `sprints={[]}` → "No sprint data available" |
| Story rows link to ADO | `StoryRow` renders `Anchor` with `adoUrl` |
| No internal tabs | No `Tabs.List` or `Tabs.Tab` in output |

### 6.3 WorkstreamCardsGrid (Unit / Integration)

| Test | Description |
|------|-------------|
| Renders SprintTabSelector when sprint data exists | `sprintStoriesMap` with data → selector visible |
| Hides SprintTabSelector when no sprint data | `sprintStoriesMap` empty → no selector |
| Passes activeSprintId to each card | Each `WorkstreamHealthCard` receives `activeSprintId` |
| Default is current sprint | On mount with data, `activeSprintId` is current sprint's ID |
| Tab change updates all cards | User changes tab → all cards re-render with new sprint's stories |

### 6.4 deriveSprintList (Unit)

| Test | Description |
|------|-------------|
| Returns [] for undefined | `deriveSprintList(undefined)` → `[]` |
| Returns [] for empty map | `deriveSprintList({})` → `[]` |
| Returns first non-empty workstream's sprints | Map with ws1: [], ws2: [s1,s2] → returns [s1,s2] |
| Preserves order | Order matches API response |

### 6.5 Integration (SprintStoryListIntegration.test.tsx)

| Test | Description |
|------|-------------|
| Shared selector renders above cards | DOM structure correct |
| Selecting sprint updates all panels | Mock data, click tab, assert all panels show selected sprint |
| Default selection is current sprint | Assert initial `activeSprintId` matches `isCurrent` sprint |

---

## 7. File Change Summary

### Created

| File | Purpose |
|------|---------|
| `components/Dashboard/SprintTabSelector.tsx` | New shared sprint selector component |
| `lib/dashboard/sprint-utils.ts` | `deriveSprintList` utility (optional; can inline in grid) |
| `__tests__/components/Dashboard/SprintTabSelector.test.tsx` | Unit tests for SprintTabSelector |
| `__tests__/lib/dashboard/sprint-utils.test.ts` | Unit tests for deriveSprintList (if extracted) |

### Modified

| File | Changes |
|------|---------|
| `components/Dashboard/SprintStoryListPanel.tsx` | Add `activeSprintId` prop; remove Tabs; render single sprint |
| `components/Dashboard/WorkstreamCardsGrid.tsx` | Add state, deriveSprintList, render SprintTabSelector, pass activeSprintId |
| `components/Dashboard/WorkstreamHealthCard.tsx` | Add `activeSprintId` prop; forward to SprintStoryListPanel |
| `__tests__/components/Dashboard/SprintStoryListPanel.test.tsx` | Update for controlled mode, remove tab tests |
| `__tests__/components/Dashboard/SprintStoryListIntegration.test.tsx` | Add integration tests for shared selector |
| `__tests__/components/Dashboard/WorkstreamCardsGrid.test.tsx` | Add tests for selector rendering, activeSprintId passthrough |

### Unchanged

| File | Reason |
|------|--------|
| `components/Dashboard/DashboardContainer.tsx` | Fetches data; no changes |
| `components/Dashboard/DashboardShell.tsx` | Passes props through; no changes |
| `lib/dashboard/types.ts` | Types already sufficient |
| `lib/dashboard/sprint-stories-adapter.ts` | No changes |

---

## User Story References

- **Story 1:** Refactor SprintStoryListPanel to controlled mode — Section 1.2, 3.3, 6.2
- **Story 2:** Create SprintTabSelector component — Section 1.1, 6.1
- **Story 3:** Integrate shared selector into dashboard — Section 2, 3, 4, 5, 6.3, 6.5, 7
