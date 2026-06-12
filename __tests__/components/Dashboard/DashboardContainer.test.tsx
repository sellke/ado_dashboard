/**
 * Tests for DashboardContainer – fetch lifecycle and mocked API payloads.
 */

import { DashboardContainer } from '@/components/Dashboard/DashboardContainer';
import { render, screen, userEvent, waitFor } from '@/test-utils';

const mockMilestonesWithBreakdown = {
  milestones: [
    {
      id: 'ms-1',
      title: 'Q4 Feature Alpha',
      workstreamId: 'ws-1',
      targetMonth: '2026-12-01',
      status: 'Active',
      adoFeatureId: 101,
      notes: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      workstream: { id: 'ws-1', name: 'Action Tracker' },
      completedPoints: 5,
      totalPoints: 10,
      percentComplete: 50,
      quarter: 'Q4',
      burnupData: [],
      workstreamBreakdown: [
        {
          workstreamId: 'ws-1',
          workstreamName: 'Action Tracker',
          totalStories: 4,
          inProgressCount: 1,
          inProgressPercent: 25,
          completedCount: 2,
          completedPercent: 50,
        },
      ],
    },
  ],
  programRollup: {
    currentMonth: 'March 2026',
    currentMonthCompletionPercent: 50,
    currentMonthTotalSP: 10,
    currentMonthCompletedSP: 5,
    quarter: 'Q4',
    quarterlyMilestones: { total: 1, complete: 0, inProgress: 1, notStarted: 0 },
  },
};

const mockEmptyResponse = {
  sprint: null,
  workstreams: [] as const,
  program: null,
  computedAt: null,
};

const mockSuccessResponse = {
  sprint: { id: 's1', name: 'Sprint 27.1', startDate: '2026-04-27', endDate: '2026-05-08' },
  workstreams: [
    {
      workstreamId: 'ws-1',
      workstreamName: 'Action Tracker',
      metrics: {
        velocity: { value: 34, avg: 31.5, rag: 'Green' },
        overheadPercent: { value: 28.5, avg: 26.2, rag: 'Green' },
        predictability: { value: 85, avg: 82, rag: 'Amber' },
        carryOverRate: { value: 8.5, avg: 11, rag: null },
      },
      detail: {
        plannedPoints: 40,
        completedPoints: 34,
        carryOverPoints: 6,
        overheadHours: 22.8,
        grossHours: 80,
      },
    },
  ],
  program: {
    metrics: {
      velocity: { value: 128, avg: 120.5, rag: 'Green' },
      overheadPercent: { value: 31.2, avg: 29, rag: 'Amber' },
      predictability: { value: 82, avg: 80.5, rag: 'Green' },
      carryOverRate: { value: 12, avg: 13.5, rag: 'Amber' },
    },
  },
  computedAt: '2026-02-11T18:30:00.000Z',
};

describe('DashboardContainer', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
    window.localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('shows loading state initially', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    render(<DashboardContainer />);

    expect(screen.getByLabelText(/loading dashboard/i)).toBeInTheDocument();
  });

  it('shows success state when API returns data', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSuccessResponse),
    });

    render(<DashboardContainer />);

    expect(await screen.findByText(/Sprint 27\.1/)).toBeInTheDocument();
    expect(screen.getByText('Action Tracker')).toBeInTheDocument();
  });

  it('opens metric configuration from the dashboard header', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/metric-config')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              thresholds: [
                {
                  metricName: 'overheadPercent',
                  greenMin: 0,
                  greenMax: 30,
                  amberMin: 30.01,
                  amberMax: 45,
                },
              ],
              engine: { velocityGreenFloor: 1, velocityAmberFloor: 0.7, rollingWindow: 4 },
              rules: [],
            }),
        });
      }
      if (url.includes('/api/milestones')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              milestones: [],
              programRollup: {
                currentMonth: 'March 2026',
                currentMonthCompletionPercent: null,
                currentMonthTotalSP: 0,
                currentMonthCompletedSP: 0,
                quarterlyMilestones: { total: 0, complete: 0, inProgress: 0, notStarted: 0 },
              },
            }),
        });
      }
      if (url.includes('/api/sprints/stories')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ sprints: [] }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSuccessResponse) });
    });

    render(<DashboardContainer />);

    await user.click(await screen.findByRole('button', { name: /metric configuration/i }));

    expect(await screen.findByText('Metric Configuration')).toBeInTheDocument();
    expect(await screen.findByText('Overhead percent')).toBeInTheDocument();
  });

  it('shows empty state when API returns empty payload', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockEmptyResponse),
    });

    render(<DashboardContainer />);

    expect(await screen.findByText(/no metrics data/i)).toBeInTheDocument();
  });

  it('shows error state and retry when API fails', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/milestones') && !url.includes('/api/milestones/'))
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              milestones: [],
              programRollup: {
                currentMonth: 'February 2026',
                currentMonthCompletionPercent: null,
                currentMonthTotalSP: 0,
                currentMonthCompletedSP: 0,
                quarterlyMilestones: { total: 0, complete: 0, inProgress: 0, notStarted: 0 },
              },
            }),
        });
      return Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      });
    });

    render(<DashboardContainer />);

    expect(await screen.findByText(/server error/i)).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSuccessResponse),
    });

    await userEvent.click(retryButton);

    expect(await screen.findByText(/Sprint 27\.1/)).toBeInTheDocument();
  });

  it('shows quarterly milestone panel when milestones have workstreamBreakdown', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/milestones'))
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMilestonesWithBreakdown),
        });
      if (url.includes('/api/sprints/stories'))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ sprints: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSuccessResponse) });
    });

    render(<DashboardContainer />);

    expect(await screen.findByTestId('milestone-quarterly-panel')).toBeInTheDocument();
  });

  it('shows "Loading milestone data..." when milestones are still loading', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/milestones')) return new Promise(() => {}); // never resolves
      if (url.includes('/api/sprints/stories'))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ sprints: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSuccessResponse) });
    });

    render(<DashboardContainer />);

    expect(await screen.findByText(/loading milestone data/i)).toBeInTheDocument();
  });

  it('shows milestones error when milestones API returns an error', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/milestones'))
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Milestones unavailable' }),
        });
      if (url.includes('/api/sprints/stories'))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ sprints: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSuccessResponse) });
    });

    render(<DashboardContainer />);

    const [errorEl] = await screen.findAllByText('Milestones unavailable');
    expect(errorEl).toBeInTheDocument();
  });

  it('handles null and mixed-RAG metric values without crashing', async () => {
    const nullMetricPayload = {
      sprint: { id: 's1', name: 'Sprint 1', startDate: '', endDate: '' },
      workstreams: [
        {
          workstreamId: 'ws-1',
          workstreamName: 'Test',
          metrics: {
            velocity: { value: null, avg: null, rag: null },
            overheadPercent: { value: null, avg: null, rag: 'Amber' },
            predictability: { value: 50, avg: 55, rag: 'Red' },
            carryOverRate: { value: null, avg: null, rag: null },
          },
          detail: {
            plannedPoints: null,
            completedPoints: null,
            carryOverPoints: null,
            overheadHours: null,
            grossHours: null,
          },
        },
      ],
      program: null,
      computedAt: null,
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(nullMetricPayload),
    });

    render(<DashboardContainer />);

    expect(await screen.findByText('Test')).toBeInTheDocument();
    expect(screen.getByText(/Planned: N\/A/)).toBeInTheDocument();
  });

  it('restores saved workstream scope and sends it to metrics and milestones fetches', async () => {
    window.localStorage.setItem(
      'dashboardWorkstreamScope:v1:main',
      JSON.stringify({ includedWorkstreamIds: ['ws-2'], updatedAt: '2026-05-27T00:00:00.000Z' })
    );

    const scopedMetrics = {
      ...mockSuccessResponse,
      workstreams: [
        {
          ...mockSuccessResponse.workstreams[0],
          workstreamId: 'ws-2',
          workstreamName: 'Pitch Tracker',
        },
      ],
    };

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/workstreams')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              workstreams: [
                { id: 'ws-1', name: 'Action Tracker', adoAreaPath: 'Area\\Action Tracker' },
                { id: 'ws-2', name: 'Pitch Tracker', adoAreaPath: 'Area\\Pitch Tracker' },
              ],
            }),
        });
      }
      if (url.includes('/api/milestones')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              milestones: [],
              programRollup: {
                currentMonth: 'March 2026',
                currentMonthCompletionPercent: null,
                currentMonthTotalSP: 0,
                currentMonthCompletedSP: 0,
                quarterlyMilestones: { total: 0, complete: 0, inProgress: 0, notStarted: 0 },
              },
            }),
        });
      }
      if (url.includes('/api/sprints/stories')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ sprints: [] }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(scopedMetrics) });
    });

    render(<DashboardContainer />);

    expect(await screen.findByText('Pitch Tracker')).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/metrics?dashboard=main&workstreamIds=ws-2')
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/milestones?workstreamIds=ws-2')
      );
      expect(global.fetch).toHaveBeenCalledWith('/api/sprints/stories?workstreamId=ws-2');
    });
  });

  it('refetches metrics with sprintId for previous sprint tabs and omits it for current sprint', async () => {
    const user = userEvent.setup();
    const storiesPayload = {
      sprints: [
        {
          id: 's-current',
          name: 'Sprint 05',
          startDate: '2026-05-11T00:00:00.000Z',
          endDate: '2026-05-22T00:00:00.000Z',
          isCurrent: true,
          stories: [],
        },
        {
          id: 's-prev',
          name: 'Sprint 04',
          startDate: '2026-04-27T00:00:00.000Z',
          endDate: '2026-05-08T00:00:00.000Z',
          isCurrent: false,
          stories: [],
        },
      ],
    };

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/workstreams')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              workstreams: [
                { id: 'ws-1', name: 'Action Tracker', adoAreaPath: 'Area\\Action Tracker' },
              ],
            }),
        });
      }
      if (url.includes('/api/milestones')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              milestones: [],
              programRollup: {
                currentMonth: 'March 2026',
                currentMonthCompletionPercent: null,
                currentMonthTotalSP: 0,
                currentMonthCompletedSP: 0,
                quarterlyMilestones: { total: 0, complete: 0, inProgress: 0, notStarted: 0 },
              },
            }),
        });
      }
      if (url.includes('/api/sprints/stories')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(storiesPayload) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSuccessResponse) });
    });

    render(<DashboardContainer />);

    const previousTab = await screen.findByRole('tab', { name: /Sprint 04/ });
    await user.click(previousTab);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/metrics?dashboard=main&sprintId=s-prev')
      );
    });

    const currentTab = await screen.findByRole('tab', { name: /Sprint 05/ });
    await user.click(currentTab);

    await waitFor(() => {
      const metricsCalls = (global.fetch as jest.Mock).mock.calls
        .map(([url]) => String(url))
        .filter((url) => url.includes('/api/metrics'));
      expect(metricsCalls.at(-1)).toBe('/api/metrics?dashboard=main');
    });
  });

  it('uses sprintId when a selected sprint exists but no sprint is marked current', async () => {
    const storiesPayload = {
      sprints: [
        {
          id: 's-prev',
          name: 'Sprint 04',
          startDate: '2026-04-27T00:00:00.000Z',
          endDate: '2026-05-08T00:00:00.000Z',
          isCurrent: false,
          stories: [],
        },
        {
          id: 's-older',
          name: 'Sprint 03',
          startDate: '2026-04-13T00:00:00.000Z',
          endDate: '2026-04-24T00:00:00.000Z',
          isCurrent: false,
          stories: [],
        },
      ],
    };

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/workstreams')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              workstreams: [
                { id: 'ws-1', name: 'Action Tracker', adoAreaPath: 'Area\\Action Tracker' },
              ],
            }),
        });
      }
      if (url.includes('/api/milestones')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              milestones: [],
              programRollup: {
                currentMonth: 'March 2026',
                currentMonthCompletionPercent: null,
                currentMonthTotalSP: 0,
                currentMonthCompletedSP: 0,
                quarterlyMilestones: { total: 0, complete: 0, inProgress: 0, notStarted: 0 },
              },
            }),
        });
      }
      if (url.includes('/api/sprints/stories')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(storiesPayload) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSuccessResponse) });
    });

    render(<DashboardContainer />);

    expect(await screen.findByRole('tab', { name: /Sprint 04/ })).toBeInTheDocument();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/metrics?dashboard=main&sprintId=s-prev')
      );
    });
  });

  it('ignores stale metrics responses when a newer guarded request has completed', async () => {
    window.localStorage.setItem(
      'dashboardWorkstreamScope:v1:main',
      JSON.stringify({ includedWorkstreamIds: ['ws-2'], updatedAt: '2026-05-27T00:00:00.000Z' })
    );

    let resolveStaleMetrics:
      | ((value: { ok: boolean; json: () => Promise<typeof mockSuccessResponse> }) => void)
      | null = null;
    const scopedMetrics = {
      ...mockSuccessResponse,
      workstreams: [
        {
          ...mockSuccessResponse.workstreams[0],
          workstreamId: 'ws-2',
          workstreamName: 'Pitch Tracker',
        },
      ],
    };

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/workstreams')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              workstreams: [
                { id: 'ws-1', name: 'Action Tracker', adoAreaPath: 'Area\\Action Tracker' },
                { id: 'ws-2', name: 'Pitch Tracker', adoAreaPath: 'Area\\Pitch Tracker' },
              ],
            }),
        });
      }
      if (url.includes('/api/milestones')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              milestones: [],
              programRollup: {
                currentMonth: 'March 2026',
                currentMonthCompletionPercent: null,
                currentMonthTotalSP: 0,
                currentMonthCompletedSP: 0,
                quarterlyMilestones: { total: 0, complete: 0, inProgress: 0, notStarted: 0 },
              },
            }),
        });
      }
      if (url.includes('/api/sprints/stories')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ sprints: [] }) });
      }
      if (url.includes('/api/metrics?dashboard=main&workstreamIds=ws-2')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(scopedMetrics) });
      }
      return new Promise((resolve) => {
        resolveStaleMetrics = resolve;
      });
    });

    render(<DashboardContainer />);

    expect(await screen.findByText('Pitch Tracker')).toBeInTheDocument();

    expect(resolveStaleMetrics).toBeTruthy();
    (
      resolveStaleMetrics as unknown as (value: {
        ok: boolean;
        json: () => Promise<typeof mockSuccessResponse>;
      }) => void
    )({
      ok: true,
      json: () => Promise.resolve(mockSuccessResponse),
    });

    await waitFor(() => {
      expect(screen.getByText('Pitch Tracker')).toBeInTheDocument();
      expect(screen.queryByText('Action Tracker')).not.toBeInTheDocument();
    });
  });
});
