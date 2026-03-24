/** Matches ADP-<month> tags (e.g. ADP-MAR, ADP-JAN) — case-insensitive */
const ADP_MON_REGEX = /^ADP-(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/i;

/**
 * Returns true if the semicolon-delimited tags string contains at least one ADP-MON tag.
 * Tags field in Prisma is String? — pass `story.tags ?? null` to handle undefined gracefully.
 */
export function hasAdpMonTag(tags: string | null): boolean {
  if (!tags) {
    return false;
  }
  return tags.split(';').some((t) => ADP_MON_REGEX.test(t.trim()));
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
