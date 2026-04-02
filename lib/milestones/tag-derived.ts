/**
 * Tag-driven ADP milestone discovery (GET /api/milestones).
 * No dependency on the local `Milestone` table or ADO Milestone work items.
 */

import { hasAdpMilestoneTag } from '@/lib/milestones/format';
import {
  parseAdpTag,
  parseQuarterTag,
  quarterToTargetMonth,
} from '@/lib/sync/milestone-features';

/** Synthetic API id for a Feature-backed milestone row. */
export function adoFeatureMilestoneId(adoId: number): string {
  return `ado-feature-${adoId}`;
}

/**
 * A Feature appears in ADP metrics if its tags or any child story's tags qualify
 * ({@link hasAdpMilestoneTag} — ADP-MON, Q#-PLAN, or YYADP on the Feature).
 */
export function featureQualifiesForAdpMetrics(
  featureTags: string | null,
  allChildStories: { tags: string | null }[]
): boolean {
  if (hasAdpMilestoneTag(featureTags)) {
    return true;
  }
  return allChildStories.some((s) => hasAdpMilestoneTag(s.tags ?? null));
}

/**
 * When `?workstreamId=` is set: include the Feature if it belongs to that workstream,
 * or it has no workstream but at least one **rollup-tagged** child maps to that workstream.
 */
export function featureMatchesWorkstreamFilter(
  featureWorkstreamId: string | null,
  rollupTaggedChildren: { workstreamId: string | null }[],
  filterWorkstreamId: string | null
): boolean {
  if (!filterWorkstreamId) {
    return true;
  }
  if (featureWorkstreamId === filterWorkstreamId) {
    return true;
  }
  if (featureWorkstreamId != null && featureWorkstreamId !== filterWorkstreamId) {
    return false;
  }
  return rollupTaggedChildren.some((s) => s.workstreamId === filterWorkstreamId);
}

/**
 * Target month and explicit quarter tag for program rollup — same story-first priority
 * as {@link extractMilestoneTagBadgeLabel} (ADP on rollup stories, then Q-plan, then Feature).
 */
export function deriveTargetMonthAndQuarter(
  featureTags: string | null,
  effectiveRollupStories: { tags: string | null }[],
  today: Date
): { targetMonth: Date; quarter: string | null } {
  for (const s of effectiveRollupStories) {
    const t = s.tags;
    if (!t) {
      continue;
    }
    const d = parseAdpTag(t, today);
    if (d) {
      return {
        targetMonth: d,
        quarter: parseQuarterTag(t) ?? (featureTags ? parseQuarterTag(featureTags) : null),
      };
    }
  }
  for (const s of effectiveRollupStories) {
    const t = s.tags;
    if (!t) {
      continue;
    }
    const q = parseQuarterTag(t);
    if (q) {
      const tm = quarterToTargetMonth(q, today);
      if (tm) {
        return { targetMonth: tm, quarter: q };
      }
    }
  }
  if (featureTags) {
    const d = parseAdpTag(featureTags, today);
    if (d) {
      return { targetMonth: d, quarter: parseQuarterTag(featureTags) };
    }
    const q = parseQuarterTag(featureTags);
    if (q) {
      const tm = quarterToTargetMonth(q, today);
      if (tm) {
        return { targetMonth: tm, quarter: q };
      }
    }
  }
  return {
    targetMonth: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
    quarter: null,
  };
}
