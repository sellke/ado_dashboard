/**
 * Explicit ADP month tags: `ADP-JAN` … `ADP-DEC` (three-letter MON only).
 * ADO often stores `ADP - JAN` (spaces) and may use Unicode dashes (`ADP – MAR` en dash).
 * Canonical display remains `ADP-JAN` after {@link normalizeTagDashes}.
 */
const ADP_MON_PART =
  /^ADP\s*-\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*$/i;

/** Year-prefixed ADP tag (e.g. 25ADP) — aligned with parseAdpTag pass 2 in milestone-features */
const YY_ADP_REGEX = /^\d{2}ADP$/i;

/** Explicit quarter plan: `Q1-PLAN` … `Q4-PLAN`, or `Q4 PLAN` (space). Hyphen may be Unicode. */
const Q_PLAN_PART = /^Q\s*([1-4])(?:\s*-\s*|\s+)PLAN\s*$/i;

/**
 * ADO tag lists use `;` or `,` between tags depending on source/API.
 */
export function splitTagSegments(tags: string): string[] {
  return tags
    .split(/[;,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Map en dash, em dash, and Unicode minus to ASCII hyphen so regexes match real ADO text.
 */
export function normalizeTagDashes(part: string): string {
  return part.replace(/[\u2013\u2014\u2212]/g, '-');
}

const CANON_TO_MONTH_INDEX: Record<string, number> = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11,
};

/**
 * Match a single semicolon-delimited tag part as `ADP-{MON}` (explicit 3-letter month).
 * Used by sync `parseAdpTag` for targetMonth; prefer `hasAdpMonTag` / `hasMilestoneRollupTag` on full tag strings.
 */
export function matchAdpMonthTagPart(part: string): { monthIndex: number; canonicalLabel: string } | null {
  const m = normalizeTagDashes(part.trim()).match(ADP_MON_PART);
  if (!m) {
    return null;
  }
  const mon = m[1].toUpperCase();
  const monthIndex = CANON_TO_MONTH_INDEX[mon];
  if (monthIndex === undefined) {
    return null;
  }
  return { monthIndex, canonicalLabel: `ADP-${mon}` };
}

/**
 * True if a tag part is an explicit `Q#-PLAN` / `Q# PLAN` (e.g. `Q2-PLAN`, `Q4 PLAN`).
 */
export function matchQPlanTagPart(part: string): { quarterDigit: string; canonicalLabel: string } | null {
  const m = normalizeTagDashes(part.trim()).match(Q_PLAN_PART);
  if (!m) {
    return null;
  }
  const d = m[1];
  return { quarterDigit: d, canonicalLabel: `Q${d}-PLAN` };
}

/**
 * Returns true if the semicolon-delimited tags string contains an explicit ADP-MON tag.
 */
export function hasAdpMonTag(tags: string | null): boolean {
  if (!tags) {
    return false;
  }
  return splitTagSegments(tags).some((t) => matchAdpMonthTagPart(t) !== null);
}

/**
 * Returns true if the tags string contains an explicit `Q#-PLAN` / `Q# PLAN` tag.
 */
export function hasQPlanTag(tags: string | null): boolean {
  if (!tags) {
    return false;
  }
  return splitTagSegments(tags).some((t) => matchQPlanTagPart(t) !== null);
}

/**
 * True when the work item should contribute to ADP Milestone metrics:
 * explicit `ADP-{MON}` and/or `Q#-PLAN` (or `Q# PLAN`).
 */
export function hasMilestoneRollupTag(tags: string | null): boolean {
  return hasAdpMonTag(tags) || hasQPlanTag(tags);
}

/**
 * Canonical `ADP-JAN`-style label from the first matching ADP month tag part, or null.
 */
export function extractAdpMonCanonicalLabel(tags: string | null): string | null {
  if (!tags) {
    return null;
  }
  for (const part of splitTagSegments(tags)) {
    const matched = matchAdpMonthTagPart(part);
    if (matched) {
      return matched.canonicalLabel;
    }
  }
  return null;
}

/**
 * Canonical `Q1-PLAN`-style label from the first matching quarter-plan tag part, or null.
 */
export function extractQPlanCanonicalLabel(tags: string | null): string | null {
  if (!tags) {
    return null;
  }
  for (const part of splitTagSegments(tags)) {
    const matched = matchQPlanTagPart(part);
    if (matched) {
      return matched.canonicalLabel;
    }
  }
  return null;
}

/**
 * Badge label for milestones: prefer first ADP-MON on stories, else first Q#-PLAN on stories,
 * else Feature tags (same order).
 */
export function extractMilestoneTagBadgeLabel(
  featureTags: string | null | undefined,
  effectiveStories: { tags: string | null }[]
): string | null {
  for (const s of effectiveStories) {
    const adp = extractAdpMonCanonicalLabel(s.tags ?? null);
    if (adp) {
      return adp;
    }
  }
  for (const s of effectiveStories) {
    const qp = extractQPlanCanonicalLabel(s.tags ?? null);
    if (qp) {
      return qp;
    }
  }
  const ft = extractAdpMonCanonicalLabel(featureTags ?? null);
  if (ft) {
    return ft;
  }
  return extractQPlanCanonicalLabel(featureTags ?? null);
}

/**
 * True if tags indicate an ADP milestone Feature: ADP-{MON}, Q#-PLAN, or YYADP (sync compatibility).
 */
export function hasAdpMilestoneTag(tags: string | null): boolean {
  if (!tags) {
    return false;
  }
  if (hasMilestoneRollupTag(tags)) {
    return true;
  }
  return splitTagSegments(tags).some((t) => YY_ADP_REGEX.test(t.trim()));
}

/** Short month names for en-US */
const MONTHS: string[] = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Format target month as MMM YYYY (e.g. "Mar 2026") using UTC to avoid timezone drift.
 */
export function formatTargetMonth(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid';
  }
  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();
  return `${MONTHS[month]} ${year}`;
}
