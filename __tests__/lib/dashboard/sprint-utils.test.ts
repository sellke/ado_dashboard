import { deriveSprintList } from '@/lib/dashboard/sprint-utils';
import type { SprintStoryViewModel } from '@/lib/dashboard/types';

function createSprint(overrides: Partial<SprintStoryViewModel> = {}): SprintStoryViewModel {
  return {
    id: 'sprint-1',
    name: 'Sprint 2026.05',
    startDate: '2026-02-24T00:00:00.000Z',
    endDate: '2026-03-07T00:00:00.000Z',
    isCurrent: true,
    statusGroups: [],
    totalStories: 0,
    ...overrides,
  };
}

describe('deriveSprintList', () => {
  it('returns [] for undefined', () => {
    expect(deriveSprintList(undefined)).toEqual([]);
  });

  it('returns [] for empty map', () => {
    expect(deriveSprintList({})).toEqual([]);
  });

  it('returns [] when all workstreams have empty arrays', () => {
    expect(deriveSprintList({ 'ws-1': [], 'ws-2': [] })).toEqual([]);
  });

  it('returns sprints when only one workstream has data', () => {
    const s1 = createSprint({ id: 's1', name: 'Sprint 05', totalStories: 3 });
    const s2 = createSprint({ id: 's2', name: 'Sprint 04', isCurrent: false, totalStories: 2 });
    const map = {
      'ws-1': [],
      'ws-2': [s1, s2],
    };

    const result = deriveSprintList(map);
    expect(result).toHaveLength(2);
    expect(result[0].totalStories).toBe(3);
    expect(result[1].totalStories).toBe(2);
  });

  it('sums totalStories across all workstreams for each sprint', () => {
    const map = {
      'ws-1': [
        createSprint({ id: 's1', name: 'Sprint 05', totalStories: 4 }),
        createSprint({ id: 's2', name: 'Sprint 04', isCurrent: false, totalStories: 2 }),
      ],
      'ws-2': [
        createSprint({ id: 's1', name: 'Sprint 05', totalStories: 7 }),
        createSprint({ id: 's2', name: 'Sprint 04', isCurrent: false, totalStories: 3 }),
      ],
    };

    const result = deriveSprintList(map);
    expect(result).toHaveLength(2);
    expect(result[0].totalStories).toBe(11);
    expect(result[1].totalStories).toBe(5);
  });

  it('preserves order from API response', () => {
    const s1 = createSprint({ id: 's1', name: 'Sprint 05' });
    const s2 = createSprint({ id: 's2', name: 'Sprint 04', isCurrent: false });
    const s3 = createSprint({ id: 's3', name: 'Sprint 03', isCurrent: false });
    const map = { 'ws-1': [s1, s2, s3] };

    const result = deriveSprintList(map);
    expect(result.map((s) => s.id)).toEqual(['s1', 's2', 's3']);
  });

  it('handles non-object input gracefully', () => {
    expect(deriveSprintList(null as unknown as undefined)).toEqual([]);
  });
});
