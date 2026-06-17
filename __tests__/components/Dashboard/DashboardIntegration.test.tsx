/**
 * Integration tests for dashboard state transitions and resilience behavior.
 * Uses shared fixtures from __fixtures__/dashboard-fixtures.
 */

import { DashboardContainer } from '@/components/Dashboard/DashboardContainer';
import { render, screen, userEvent, waitFor } from '@/test-utils';
import {
  createApiResponse,
  createEmptyApiResponse,
  createMixedRagApiResponse,
} from './__fixtures__/dashboard-fixtures';

const EMPTY_PROGRAM_ROLLUP = {
  currentMonth: 'February 2026',
  currentMonthCompletionPercent: null,
  currentMonthTotalSP: 0,
  currentMonthCompletedSP: 0,
  quarterlyMilestones: { total: 0, complete: 0, inProgress: 0, notStarted: 0 },
};

const mockMilestonesEmpty = () =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ milestones: [], programRollup: EMPTY_PROGRAM_ROLLUP }),
  });

const mockMilestonesWithData = () =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        milestones: [
          {
            id: 'm1',
            title: 'Platform Phase 1',
            workstreamId: 'ws-1',
            targetMonth: '2026-03-01T00:00:00.000Z',
            status: 'InProgress',
            adoFeatureId: 12345,
            notes: 'Key deliverable',
            createdAt: '2026-02-01T00:00:00.000Z',
            updatedAt: '2026-02-01T00:00:00.000Z',
            workstream: { id: 'ws-1', name: 'Platform' },
            completedPoints: 0,
            totalPoints: 0,
            percentComplete: null,
            burnupData: [],
            /** Required for program-level quarterly ADP panel (`groupMilestonesByQuarter`). */
            quarter: 'Q1',
            workstreamBreakdown: [],
          },
        ],
        programRollup: EMPTY_PROGRAM_ROLLUP,
      }),
  });

describe('DashboardContainer integration', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('transitions loading → success with full data', async () => {
    const fullResponse = createApiResponse();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/milestones') && !url.includes('/api/milestones/'))
        return mockMilestonesEmpty();
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(fullResponse),
      });
    });

    render(<DashboardContainer />);

    expect(screen.getByLabelText(/loading dashboard/i)).toBeInTheDocument();

    expect(await screen.findByText(/Sprint 27\.1/)).toBeInTheDocument();
    expect(screen.getByText('Platform')).toBeInTheDocument();
    expect(screen.getByText('Apps')).toBeInTheDocument();
    expect(screen.getByText(/Program Summary/)).toBeInTheDocument();
    expect(screen.getByText(/Workstreams/)).toBeInTheDocument();
    expect(screen.getByText(/120\.5 pts/)).toBeInTheDocument();
  });

  it('renders program ADP milestone panel with mocked API when milestones exist', async () => {
    const fullResponse = createApiResponse();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/milestones') && !url.includes('/api/milestones/'))
        return mockMilestonesWithData();
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(fullResponse),
      });
    });

    render(<DashboardContainer />);

    expect(await screen.findByText(/Sprint 27\.1/)).toBeInTheDocument();
    expect(await screen.findByTestId('milestone-quarterly-panel')).toBeInTheDocument();
    expect((await screen.findAllByText('Platform Phase 1')).length).toBeGreaterThan(0);
    expect(screen.getByText('Q1')).toBeInTheDocument();
  });

  it('transitions loading → success with mixed RAG across workstreams', async () => {
    const mixedResponse = createMixedRagApiResponse();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/milestones') && !url.includes('/api/milestones/'))
        return mockMilestonesEmpty();
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mixedResponse),
      });
    });

    render(<DashboardContainer />);

    expect(await screen.findByText(/Sprint 27\.1/)).toBeInTheDocument();
    expect(screen.getByText('Platform')).toBeInTheDocument();
    expect(screen.getByText('Apps')).toBeInTheDocument();
    // RAG badges: G, A, R
    expect(screen.getAllByText('G').length).toBeGreaterThan(0);
    expect(screen.getAllByText('A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('R').length).toBeGreaterThan(0);
  });

  it('transitions loading → empty when API returns null payload', async () => {
    const emptyResponse = createEmptyApiResponse();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/milestones') && !url.includes('/api/milestones/'))
        return mockMilestonesEmpty();
      if (url.includes('/api/workstreams')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              workstreams: [{ id: 'ws-1', name: 'Platform', syncEnabled: true }],
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(emptyResponse),
      });
    });

    render(<DashboardContainer />);

    expect(await screen.findByText(/no metrics data/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Run Sync Now to pull Azure DevOps data/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /dashboard/i })).toBeInTheDocument();
  });

  it('transitions loading → error → retry → success', async () => {
    const fullResponse = createApiResponse();
    let metricsCallCount = 0;
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/milestones') && !url.includes('/api/milestones/'))
        return mockMilestonesEmpty();
      if (url.includes('/api/workstreams'))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ workstreams: [] }) });
      if (url.includes('/api/metrics')) {
        metricsCallCount += 1;
        if (metricsCallCount === 1)
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Server error' }),
          });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(fullResponse),
      });
    });

    render(<DashboardContainer />);

    expect(await screen.findByText(/server error/i)).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    await userEvent.click(retryButton);

    expect(await screen.findByText(/Sprint 27\.1/)).toBeInTheDocument();
  });

  it('handles network error when fetch throws', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.reject(new Error('Network request failed'))
    );

    render(<DashboardContainer />);

    expect((await screen.findAllByText(/network request failed/i)).length).toBeGreaterThan(0);
    const retryButtons = screen.getAllByRole('button', { name: /retry/i });
    expect(retryButtons.length).toBeGreaterThan(0);
  });

  it('shows explicit empty-state message with stable layout', async () => {
    const emptyResponse = createEmptyApiResponse();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/milestones') && !url.includes('/api/milestones/'))
        return mockMilestonesEmpty();
      if (url.includes('/api/workstreams')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              workstreams: [{ id: 'ws-1', name: 'Platform', syncEnabled: true }],
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(emptyResponse),
      });
    });

    render(<DashboardContainer />);

    const emptyText = await screen.findByText(/no metrics data/i);
    expect(emptyText).toBeInTheDocument();
    expect(emptyText).toHaveTextContent(/no metrics data/i);

    const syncText = screen.getByText(/Run Sync Now to pull Azure DevOps data/i);
    expect(syncText).toBeInTheDocument();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(/dashboard/i);
  });

  it('shows user-friendly error copy and retry affordance', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/milestones') && !url.includes('/api/milestones/'))
        return mockMilestonesEmpty();
      return Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      });
    });

    render(<DashboardContainer />);

    expect(await screen.findByText(/internal server error/i)).toBeInTheDocument();
    expect(screen.getByText(/Error loading metrics/i)).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  describe('Sync Now flow', () => {
    it('triggers POST /api/sync/ado on Sync Now click and auto-refetches metrics on success', async () => {
      const fullResponse = createApiResponse();
      const fetchMock = global.fetch as jest.Mock;
      fetchMock.mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/milestones') && !url.includes('/api/milestones/'))
          return mockMilestonesEmpty();
        if (url.includes('/api/sync/ado') && init?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                syncLogId: 'log-1',
                summary: { status: 'Success' },
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(fullResponse),
        });
      });

      render(<DashboardContainer />);

      expect(await screen.findByText(/Sprint 27\.1/)).toBeInTheDocument();

      const syncButton = screen.getByRole('button', { name: /sync now/i });
      expect(syncButton).toBeInTheDocument();

      await userEvent.click(syncButton);

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sync/ado',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ syncType: 'Full' }),
        })
      );

      expect(await screen.findByText(/Sprint 27\.1/)).toBeInTheDocument();
    });

    it('refetches milestones after successful sync so new milestones appear in program summary', async () => {
      const fullResponse = createApiResponse();
      const fetchMock = global.fetch as jest.Mock;
      let milestonesCallCount = 0;
      fetchMock.mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/milestones') && !url.includes('/api/milestones/')) {
          milestonesCallCount += 1;
          if (milestonesCallCount === 1) return mockMilestonesEmpty();
          return mockMilestonesWithData();
        }
        if (url.includes('/api/sync/ado') && init?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                syncLogId: 'log-1',
                summary: { status: 'Success' },
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(fullResponse),
        });
      });

      render(<DashboardContainer />);

      expect(await screen.findByText(/Sprint 27\.1/)).toBeInTheDocument();
      expect(screen.queryByTestId('milestone-quarterly-panel')).not.toBeInTheDocument();

      const syncButton = screen.getByRole('button', { name: /sync now/i });
      await userEvent.click(syncButton);

      expect(await screen.findByTestId('milestone-quarterly-panel')).toBeInTheDocument();
      expect((await screen.findAllByText('Platform Phase 1')).length).toBeGreaterThan(0);
    });

    it('disables Sync Now and shows in-flight feedback while sync is in progress', async () => {
      let resolveSync: (value: unknown) => void;
      const syncPromise = new Promise((resolve) => {
        resolveSync = resolve;
      });

      const fullResponse = createApiResponse();
      const fetchMock = global.fetch as jest.Mock;
      fetchMock.mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/milestones') && !url.includes('/api/milestones/'))
          return mockMilestonesEmpty();
        if (url.includes('/api/sync/ado') && init?.method === 'POST') {
          return syncPromise;
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(fullResponse),
        });
      });

      render(<DashboardContainer />);

      expect(await screen.findByText(/Sprint 27\.1/)).toBeInTheDocument();

      const syncButton = screen.getByRole('button', { name: /sync now/i });
      await userEvent.click(syncButton);

      expect(syncButton).toBeDisabled();
      expect(screen.getByText(/syncing/i)).toBeInTheDocument();

      resolveSync!({
        ok: true,
        json: () =>
          Promise.resolve({ success: true, syncLogId: 'log-1', summary: { status: 'Success' } }),
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sync now/i })).not.toBeDisabled();
      });
    });

    it('shows non-blocking error message and allows retry when sync fails', async () => {
      const fullResponse = createApiResponse();
      const fetchMock = global.fetch as jest.Mock;
      let syncCallCount = 0;
      fetchMock.mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/milestones') && !url.includes('/api/milestones/'))
          return mockMilestonesEmpty();
        if (url.includes('/api/sync/ado') && init?.method === 'POST') {
          syncCallCount += 1;
          if (syncCallCount === 1) {
            return Promise.resolve({
              ok: false,
              status: 500,
              json: () => Promise.resolve({ success: false, error: 'ADO connection failed' }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                syncLogId: 'log-2',
                summary: { status: 'Success' },
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(fullResponse),
        });
      });

      render(<DashboardContainer />);

      expect(await screen.findByText(/Sprint 27\.1/)).toBeInTheDocument();

      const syncButton = screen.getByRole('button', { name: /sync now/i });
      await userEvent.click(syncButton);

      expect(await screen.findByText(/ADO connection failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Sprint 27\.1/)).toBeInTheDocument();

      const retrySyncButton = screen.getByRole('button', { name: /sync now/i });
      await userEvent.click(retrySyncButton);

      expect(await screen.findByText(/Sprint 27\.1/)).toBeInTheDocument();
    });

    it('shows partial-success message when sync succeeds but metrics refetch fails', async () => {
      const fullResponse = createApiResponse();
      let metricsCallCount = 0;
      const fetchMock = global.fetch as jest.Mock;
      fetchMock.mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/milestones') && !url.includes('/api/milestones/'))
          return mockMilestonesEmpty();
        if (url.includes('/api/sync/ado') && init?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                syncLogId: 'log-1',
                summary: { status: 'Success' },
              }),
          });
        }
        if (url.includes('/api/metrics')) {
          metricsCallCount += 1;
          if (metricsCallCount === 2) {
            return Promise.resolve({
              ok: false,
              status: 500,
              json: () => Promise.resolve({ error: 'Metrics service unavailable' }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(fullResponse),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });

      render(<DashboardContainer />);

      expect(await screen.findByText(/Sprint 27\.1/)).toBeInTheDocument();

      const syncButton = screen.getByRole('button', { name: /sync now/i });
      await userEvent.click(syncButton);

      expect(
        await screen.findByText(/sync completed.*metrics refresh failed/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Sprint 27\.1/)).toBeInTheDocument();
    });
  });
});
