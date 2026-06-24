import DashboardPage from '@/app/dashboard/page';
import StreamsDashboardPage from '@/app/dashboard/streams/page';
import { DashboardContainer } from '@/components/Dashboard/DashboardContainer';
import { loadDashboardWorkstreamScopeFromServerCookie } from '@/lib/dashboard/workstream-scope';
import { render, screen } from '@/test-utils';

jest.mock('@/components/Dashboard/DashboardContainer', () => ({
  DashboardContainer: jest.fn(() =>
    require('react').createElement('div', { 'data-testid': 'dashboard-container' })
  ),
}));

jest.mock('@/lib/dashboard/workstream-scope', () => ({
  loadDashboardWorkstreamScopeFromServerCookie: jest.fn(),
}));

describe('dashboard pages', () => {
  beforeEach(() => {
    jest.mocked(DashboardContainer).mockClear();
    jest.mocked(loadDashboardWorkstreamScopeFromServerCookie).mockReset();
  });

  it('passes main dashboard initial scope from the server cookie', async () => {
    jest.mocked(loadDashboardWorkstreamScopeFromServerCookie).mockResolvedValue(['ws-1']);

    render(await DashboardPage());

    expect(await screen.findByTestId('dashboard-container')).toBeInTheDocument();
    expect(loadDashboardWorkstreamScopeFromServerCookie).toHaveBeenCalledWith('main');
    expect(DashboardContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        dashboard: 'main',
        initialScopeIds: ['ws-1'],
        title: 'Dashboard',
      }),
      undefined
    );
  });

  it('passes streams dashboard initial scope from the streams cookie only', async () => {
    jest.mocked(loadDashboardWorkstreamScopeFromServerCookie).mockResolvedValue(['ws-streams']);

    render(await StreamsDashboardPage());

    expect(await screen.findByTestId('dashboard-container')).toBeInTheDocument();
    expect(loadDashboardWorkstreamScopeFromServerCookie).toHaveBeenCalledWith('streams');
    expect(loadDashboardWorkstreamScopeFromServerCookie).not.toHaveBeenCalledWith('main');
    expect(DashboardContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        dashboard: 'streams',
        initialScopeIds: ['ws-streams'],
        title: 'Streams Dashboard',
      }),
      undefined
    );
  });

  it('passes null when no valid server cookie scope exists', async () => {
    jest.mocked(loadDashboardWorkstreamScopeFromServerCookie).mockResolvedValue(null);

    render(await DashboardPage());

    expect(await screen.findByTestId('dashboard-container')).toBeInTheDocument();
    expect(DashboardContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        dashboard: 'main',
        initialScopeIds: null,
      }),
      undefined
    );
  });
});
