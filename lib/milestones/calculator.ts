/**
 * Progress Calculator (Story 2 — Phase 1E).
 *
 * Pure functions for computing milestone progress from child UserStory WorkItems,
 * deriving milestone status from progress percentage, and aggregating
 * program-level monthly/quarterly rollup.
 *
 * No Prisma imports — these are pure computation functions.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BurnupDataPoint {
  sprintName: string;
  sprintId: string;
  /** Cumulative completed SP through the end of this sprint. */
  cumulativeCompletedSP: number;
  /** Total SP for the entire milestone (flat reference line). */
  totalSP: number;
}

export interface MilestoneProgress {
  adoFeatureId: number;
  totalSP: number;
  completedSP: number;
  /** null when totalSP === 0 (no story points to measure against). */
  percentComplete: number | null;
  burnupData: BurnupDataPoint[];
}

export interface ProgramMilestoneRollup {
  /** e.g. "February 2026" */
  currentMonth: string;
  /** null when current-month milestones have no story points. */
  currentMonthCompletionPercent: number | null;
  currentMonthTotalSP: number;
  currentMonthCompletedSP: number;
  /** The quarter tag (e.g. "Q4") from milestones, or null if none have quarter tags. */
  quarter: string | null;
  quarterlyMilestones: {
    total: number;
    /** percentComplete === 100 */
    complete: number;
    /** 0 < percentComplete < 100 */
    inProgress: number;
    /** percentComplete === 0 or null */
    notStarted: number;
  };
}

/** Subset of WorkItem needed for progress calculation. */
export interface ChildStoryInput {
  state: string;
  storyPoints: number | null;
  sprint: {
    id: string;
    name: string;
    startDate: Date;
  } | null;
}

/** A milestone with its pre-computed progress, for program rollup. */
export interface MilestoneProgressInput {
  /** UTC date representing the first of the target month. */
  targetMonth: Date;
  /** Explicit quarter tag (e.g. "Q4") from ADO Feature, or null if untagged. */
  quarter: string | null;
  progress: MilestoneProgress | null;
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const DONE_STATES = new Set(['Done', 'Closed', 'Resolved']);

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// ---------------------------------------------------------------------------
// computeMilestoneProgress
// ---------------------------------------------------------------------------

/**
 * Compute progress metrics for a single ADO Feature from its child UserStory WorkItems.
 *
 * - `totalSP`: sum of storyPoints across all child stories (null treated as 0)
 * - `completedSP`: sum of storyPoints for Done / Closed / Resolved child stories
 * - `percentComplete`: completedSP / totalSP × 100, or null when totalSP === 0
 * - `burnupData`: cumulative completed SP per sprint, ordered by sprint.startDate ascending;
 *   stories without a sprint are excluded from burnup but counted in SP totals
 */
export function computeMilestoneProgress(
  adoFeatureId: number,
  childStories: ChildStoryInput[]
): MilestoneProgress {
  if (childStories.length === 0) {
    return { adoFeatureId, totalSP: 0, completedSP: 0, percentComplete: null, burnupData: [] };
  }

  let totalSP = 0;
  let completedSP = 0;

  // Map<sprintId, { name, startDate, completedSP }>
  const sprintMap = new Map<string, { name: string; startDate: Date; completedSP: number }>();

  for (const story of childStories) {
    const sp = story.storyPoints ?? 0;
    totalSP += sp;

    const isDone = DONE_STATES.has(story.state);
    if (isDone) {
      completedSP += sp;
    }

    if (story.sprint) {
      const { id, name, startDate } = story.sprint;
      const existing = sprintMap.get(id);
      if (existing) {
        if (isDone) {
          existing.completedSP += sp;
        }
      } else {
        sprintMap.set(id, { name, startDate, completedSP: isDone ? sp : 0 });
      }
    }
  }

  const percentComplete = totalSP > 0 ? (completedSP / totalSP) * 100 : null;

  // Sort sprints by startDate ascending, then build cumulative series
  const sortedSprints = Array.from(sprintMap.entries()).sort(
    ([, a], [, b]) => a.startDate.getTime() - b.startDate.getTime()
  );

  let cumulative = 0;
  const burnupData: BurnupDataPoint[] = sortedSprints.map(([sprintId, sprint]) => {
    cumulative += sprint.completedSP;
    return {
      sprintId,
      sprintName: sprint.name,
      cumulativeCompletedSP: cumulative,
      totalSP,
    };
  });

  return { adoFeatureId, totalSP, completedSP, percentComplete, burnupData };
}

// ---------------------------------------------------------------------------
// deriveMilestoneStatus
// ---------------------------------------------------------------------------

/**
 * Derive a milestone status from its progress percentage.
 *
 * - null or 0   → 'NotStarted'
 * - 1 – 99      → 'InProgress'
 * - 100+        → 'Done'
 */
export function deriveMilestoneStatus(
  percentComplete: number | null
): 'NotStarted' | 'InProgress' | 'Done' {
  if (percentComplete === null || percentComplete === 0) {
    return 'NotStarted';
  }
  if (percentComplete >= 100) {
    return 'Done';
  }
  return 'InProgress';
}

// ---------------------------------------------------------------------------
// computeProgramMilestoneRollup
// ---------------------------------------------------------------------------

/** Returns the inclusive [startMonth, endMonth] (0-indexed) for the calendar quarter of `month`. */
function calendarQuarterRange(month: number): [number, number] {
  const start = Math.floor(month / 3) * 3;
  return [start, start + 2];
}

/**
 * Compute program-level monthly and quarterly rollup from milestones with progress.
 *
 * - `currentMonth`: formatted label for the month containing `today` (e.g. "February 2026")
 * - `currentMonthCompletionPercent`: aggregate SP completion for milestones targeting this month
 * - `quarter`: the Qx tag value from milestones (e.g. "Q4"), or null if no milestones have quarter tags
 * - `quarterlyMilestones`: total/complete/inProgress/notStarted counts for milestones
 *   with an explicit `Qx` quarter tag. Milestones without a quarter tag are excluded.
 *
 * Uses UTC month/year for `targetMonth` comparisons (dates stored as UTC midnight).
 */
export function computeProgramMilestoneRollup(
  milestones: MilestoneProgressInput[],
  today: Date = new Date()
): ProgramMilestoneRollup {
  const todayYear = today.getUTCFullYear();
  const todayMonth = today.getUTCMonth(); // 0-indexed

  const currentMonth = `${MONTH_NAMES[todayMonth]} ${todayYear}`;

  // ── Current-month SP aggregation ──────────────────────────────────────────
  let currentMonthTotalSP = 0;
  let currentMonthCompletedSP = 0;

  for (const m of milestones) {
    const d = m.targetMonth;
    if (d.getUTCFullYear() === todayYear && d.getUTCMonth() === todayMonth && m.progress) {
      currentMonthTotalSP += m.progress.totalSP;
      currentMonthCompletedSP += m.progress.completedSP;
    }
  }

  const currentMonthCompletionPercent =
    currentMonthTotalSP > 0 ? (currentMonthCompletedSP / currentMonthTotalSP) * 100 : null;

  // ── Quarterly counts (driven by explicit Qx tags) ─────────────────────────
  let complete = 0;
  let inProgress = 0;
  let notStarted = 0;
  let total = 0;
  let quarter: string | null = null;

  for (const m of milestones) {
    if (!m.quarter) {
      continue;
    }

    if (!quarter) {
      quarter = m.quarter;
    }

    total++;
    const pct = m.progress?.percentComplete ?? null;
    if (pct !== null && pct >= 100) {
      complete++;
    } else if (pct !== null && pct > 0) {
      inProgress++;
    } else {
      notStarted++;
    }
  }

  return {
    currentMonth,
    currentMonthCompletionPercent,
    currentMonthTotalSP,
    currentMonthCompletedSP,
    quarter,
    quarterlyMilestones: { total, complete, inProgress, notStarted },
  };
}
