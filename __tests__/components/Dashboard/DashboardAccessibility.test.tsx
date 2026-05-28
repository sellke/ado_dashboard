/**
 * Accessibility tests for dashboard components.
 * Verifies heading order, loading skeleton aria-label, error alert structure,
 * empty state text, and retry button labeling.
 */

import { DashboardContainer } from '@/components/Dashboard/DashboardContainer';
import { DashboardShell } from '@/components/Dashboard/DashboardShell';
import { render, screen } from '@/test-utils';
import { createDashboardViewModel } from './__fixtures__/dashboard-fixtures';

describe('Dashboard accessibility', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('has correct heading order: h1 Dashboard, h2 Program Summary, h2 Workstreams', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          sprint: {
            id: 's1',
            name: 'Sprint 27.1',
            startDate: '2026-01-06',
            endDate: '2026-01-19',
          },
          workstreams: [
            {
              workstreamId: 'ws-1',
              workstreamName: 'Platform',
              metrics: {
                velocity: { value: 45, avg: 42, rag: 'Green' },
                overheadPercent: { value: 28, avg: 26, rag: 'Green' },
                predictability: { value: 92, avg: 88, rag: 'Green' },
                carryOverRate: { value: 12, avg: 10, rag: 'Green' },
              },
              detail: {
                plannedPoints: 50,
                completedPoints: 45,
                carryOverPoints: 6,
                overheadHours: 22,
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
        }),
    });

    render(<DashboardContainer />);

    await screen.findByText(/Sprint 27\.1/);

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(/dashboard/i);

    const h2s = screen.getAllByRole('heading', { level: 2 });
    const h2Texts = h2s.map((h) => h.textContent);
    expect(h2Texts).toContain('Program Summary');
    expect(h2Texts).toContain('Workstreams');
  });

  it('loading skeleton has aria-label', () => {
    const viewModel = createDashboardViewModel('loading');
    render(<DashboardShell viewModel={viewModel} onRetry={() => {}} />);

    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });

  it('error alert has proper title and message structure', () => {
    const viewModel = createDashboardViewModel('error', {
      errorMessage: 'Custom error message',
    });
    render(<DashboardShell viewModel={viewModel} onRetry={() => {}} />);

    expect(screen.getByText('Error loading metrics')).toBeInTheDocument();
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('empty state text is readable and present', () => {
    const viewModel = createDashboardViewModel('empty');
    render(<DashboardShell viewModel={viewModel} onRetry={() => {}} />);

    const emptyText = screen.getByText(/no metrics data/i);
    expect(emptyText).toBeInTheDocument();
    expect(emptyText.textContent?.trim().length).toBeGreaterThan(0);

    const syncText = screen.getByText(/Run a sync and compute metrics to see program health here/i);
    expect(syncText).toBeInTheDocument();
  });

  it('retry button is properly labeled', () => {
    const viewModel = createDashboardViewModel('error');
    render(<DashboardShell viewModel={viewModel} onRetry={() => {}} />);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });
});
