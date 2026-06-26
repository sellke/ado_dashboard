import {
  mapStateToStatusGroup,
  STATUS_GROUP_ORDER,
  type StatusGroup,
} from '@/lib/sprints/status-mapping';

describe('mapStateToStatusGroup', () => {
  it.each<[string, StatusGroup]>([
    ['New', 'Planned'],
    ['Approved', 'Planned'],
    ['Committed', 'Planned'],
    ['Active', 'Active'],
    ['Testing', 'Testing'],
    ['Resolved', 'Resolved'],
    ['Closed', 'Completed'],
  ])('maps ADO state %s to %s', (state, expected) => {
    expect(mapStateToStatusGroup(state)).toBe(expected);
  });

  it.each(['Removed', 'SomeWeirdState', ''])('returns null for excluded state %s', (state) => {
    expect(mapStateToStatusGroup(state)).toBeNull();
  });
});

describe('STATUS_GROUP_ORDER', () => {
  it('orders lifecycle groups with Testing between Active and Resolved', () => {
    expect(STATUS_GROUP_ORDER).toEqual([
      'Planned',
      'Active',
      'Testing',
      'Resolved',
      'Completed',
    ]);
  });
});
