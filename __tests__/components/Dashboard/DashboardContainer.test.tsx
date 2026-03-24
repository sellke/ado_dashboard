/**
 * Tests for DashboardContainer – fetch lifecycle and mocked API payloads.
 */

import { DashboardContainer } from '@/components/Dashboard/DashboardContainer';
import { render, screen, userEvent } from '@/test-utils';

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
  sprint: { id: 's1', name: 'Sprint 26.21', startDate: '2026-01-06', endDate: '2026-01-19' },
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

    expect(await screen.findByText(/Sprint 26\.21/)).toBeInTheDocument();
    expect(screen.getByText('Action Tracker')).toBeInTheDocument();
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

    expect(await screen.findByText(/Sprint 26\.21/)).toBeInTheDocument();
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
      if (url.includes('/api/milestones'))
        return new Promise(() => {}); // never resolves
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
});
