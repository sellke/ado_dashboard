/**
 * @jest-environment node
 */

import { GET } from '@/app/api/metrics/cycle-time/unavailable/route';
import { DEFAULT_ENGINE_CONFIG, DEFAULT_METRIC_RULE_CONFIGS } from '@/lib/metrics/types';

const selectedSprint = {
  id: 'sprint-2',
  startDate: new Date('2026-04-13T00:00:00Z'),
  endDate: new Date('2026-04-24T00:00:00Z'),
};

const priorSprint = {
  id: 'sprint-1',
  startDate: new Date('2026-03-30T00:00:00Z'),
  endDate: new Date('2026-04-10T00:00:00Z'),
};

jest.mock('@/lib/prisma', () => ({
  prisma: {
    metricSnapshot: {
      findFirst: jest.fn(),
    },
    sprint: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    workstream: {
      findMany: jest.fn(),
    },
    thresholdConfig: {
      findMany: jest.fn(),
    },
    metricEngineConfig: {
      findUnique: jest.fn(),
    },
    metricRuleConfig: {
      findMany: jest.fn(),
    },
    workItem: {
      findMany: jest.fn(),
    },
  },
}));

const { prisma } = require('@/lib/prisma');

describe('GET /api/metrics/cycle-time/unavailable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: selectedSprint.id });
    prisma.sprint.findUnique.mockResolvedValue(selectedSprint);
    prisma.sprint.findMany.mockResolvedValue([selectedSprint, priorSprint]);
    prisma.workstream.findMany.mockResolvedValue([{ id: 'ws-1' }, { id: 'ws-2' }]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);
    prisma.metricEngineConfig.findUnique.mockResolvedValue({
      ...DEFAULT_ENGINE_CONFIG,
      cycleTimeRollingWindow: 2,
    });
    prisma.metricRuleConfig.findMany.mockResolvedValue(DEFAULT_METRIC_RULE_CONFIGS);
    prisma.workItem.findMany.mockResolvedValue([]);
  });

  it('rejects unsupported cycle-time types', async () => {
    const res = await GET(
      new Request('http://localhost/api/metrics/cycle-time/unavailable?type=Task')
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/UserStory, Spike, or Bug/);
    expect(prisma.workItem.findMany).not.toHaveBeenCalled();
  });

  it('returns unavailable program items using the configured cycle-time window', async () => {
    prisma.workItem.findMany.mockResolvedValue([
      {
        adoId: 101,
        title: 'Missing activated date',
        type: 'UserStory',
        state: 'Closed',
        workstreamId: 'ws-1',
        workstream: { name: 'Action Tracker' },
        adoActivatedDate: null,
        adoClosedDate: new Date('2026-04-15T17:00:00Z'),
      },
      {
        adoId: 102,
        title: 'Complete lifecycle',
        type: 'UserStory',
        state: 'Closed',
        workstreamId: 'ws-2',
        workstream: { name: 'Pitch Tracker' },
        adoActivatedDate: new Date('2026-04-14T09:00:00Z'),
        adoClosedDate: new Date('2026-04-16T17:00:00Z'),
      },
      {
        adoId: 103,
        title: 'Missing closed date',
        type: 'UserStory',
        state: 'Done',
        workstreamId: 'ws-2',
        workstream: { name: 'Pitch Tracker' },
        adoActivatedDate: new Date('2026-04-18T09:00:00Z'),
        adoClosedDate: null,
      },
    ]);

    const res = await GET(
      new Request(
        'http://localhost/api/metrics/cycle-time/unavailable?type=UserStory&sprintId=sprint-2'
      )
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.count).toBe(2);
    expect(data.items).toEqual([
      {
        adoId: 101,
        adoUrl:
          'https://dev.azure.com/Operations-Innovation/Event%20Streaming%20Platform/_workitems/edit/101',
        title: 'Missing activated date',
        type: 'UserStory',
        state: 'Closed',
        workstreamId: 'ws-1',
        workstreamName: 'Action Tracker',
      },
      {
        adoId: 103,
        adoUrl:
          'https://dev.azure.com/Operations-Innovation/Event%20Streaming%20Platform/_workitems/edit/103',
        title: 'Missing closed date',
        type: 'UserStory',
        state: 'Done',
        workstreamId: 'ws-2',
        workstreamName: 'Pitch Tracker',
      },
    ]);
    expect(prisma.sprint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 2,
      })
    );
    expect(prisma.workItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'UserStory',
          workstreamId: { in: ['ws-1', 'ws-2'] },
        }),
        orderBy: { adoId: 'asc' },
      })
    );
  });

  it('filters workstream drilldown by the clicked workstream', async () => {
    await GET(
      new Request(
        'http://localhost/api/metrics/cycle-time/unavailable?type=Bug&sprintId=sprint-2&workstreamId=ws-2'
      )
    );

    expect(prisma.workItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'Bug',
          workstreamId: 'ws-2',
        }),
      })
    );
  });

  it('uses scoped workstreamIds for program drilldown', async () => {
    prisma.workstream.findMany
      .mockResolvedValueOnce([{ id: 'ws-1' }, { id: 'ws-2' }])
      .mockResolvedValueOnce([{ id: 'ws-2' }]);

    await GET(
      new Request(
        'http://localhost/api/metrics/cycle-time/unavailable?type=Spike&sprintId=sprint-2&workstreamIds=ws-2,stale'
      )
    );

    expect(prisma.workItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'Spike',
          workstreamId: { in: ['ws-2'] },
        }),
      })
    );
  });

  it('rejects empty scoped workstreamIds', async () => {
    const res = await GET(
      new Request('http://localhost/api/metrics/cycle-time/unavailable?type=Bug&workstreamIds=')
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/workstreamIds/i);
  });
});
