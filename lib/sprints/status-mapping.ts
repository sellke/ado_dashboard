/**
 * Maps ADO work item states to display-friendly status groups.
 * Shared between the sprint stories API route and adapter layer.
 */

export type StatusGroup = 'Planned' | 'Active' | 'Testing' | 'Resolved' | 'Completed';

const STATUS_MAP: Record<string, StatusGroup> = {
  New: 'Planned',
  Approved: 'Planned',
  Committed: 'Planned',
  Active: 'Active',
  Testing: 'Testing',
  Resolved: 'Resolved',
  Closed: 'Completed',
};

export const STATUS_GROUP_ORDER: StatusGroup[] = [
  'Planned',
  'Active',
  'Testing',
  'Resolved',
  'Completed',
];

/** Returns the display group for an ADO state, or null if the state should be excluded. */
export function mapStateToStatusGroup(state: string): StatusGroup | null {
  return STATUS_MAP[state] ?? null;
}
