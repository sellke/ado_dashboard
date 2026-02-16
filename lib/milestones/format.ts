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
