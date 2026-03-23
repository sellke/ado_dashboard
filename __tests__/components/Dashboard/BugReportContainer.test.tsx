import { BugReportContainer } from '@/components/Dashboard/BugReportContainer';
import { render, screen, waitFor } from '@/test-utils';
import { createApiResponse } from './__fixtures__/dashboard-fixtures';

jest.mock('@/lib/charts', () => ({
  AppLineChart: () => <div data-testid="line-chart" />,
  AppBarChart: () => <div data-testid="bar-chart" />,
  ChartLegend: () => <div data-testid="chart-legend" />,
}));

const mockApiResponse = createApiResponse();
const originalFetch = global.fetch;

describe('BugReportContainer', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches metrics with dashboard=main filter', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    render(<BugReportContainer />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/metrics?dashboard=main');
    });
  });

  it('renders the Bug Report title', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    render(<BugReportContainer />);
    expect(screen.getByText('Bug Report')).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('shows error alert on fetch failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    render(<BugReportContainer />);

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('shows error alert on network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network failure'));

    render(<BugReportContainer />);

    await waitFor(() => {
      expect(screen.getByText('Network failure')).toBeInTheDocument();
    });
  });
});
