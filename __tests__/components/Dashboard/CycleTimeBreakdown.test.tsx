import { CycleTimeBreakdown } from '@/components/Dashboard/CycleTimeBreakdown';
import type { CycleTimeTypeViewModel } from '@/lib/dashboard/types';
import { render, screen, userEvent, waitFor } from '@/test-utils';

const cycleTimeItems: CycleTimeTypeViewModel[] = [
  {
    type: 'UserStory',
    label: 'User Stories',
    totalBusinessDays: 12,
    averageBusinessDays: 4,
    completedItemCount: 3,
    unavailableItemCount: 1,
    totalLabel: '12 days',
    averageLabel: '4 days',
    unavailableLabel: '1 unavailable',
  },
  {
    type: 'Spike',
    label: 'Spikes',
    totalBusinessDays: 0,
    averageBusinessDays: null,
    completedItemCount: 0,
    unavailableItemCount: 2,
    totalLabel: '0 days',
    averageLabel: 'N/A',
    unavailableLabel: '2 unavailable',
  },
  {
    type: 'Bug',
    label: 'Bugs',
    totalBusinessDays: 5,
    averageBusinessDays: 2.5,
    completedItemCount: 2,
    unavailableItemCount: 3,
    totalLabel: '5 days',
    averageLabel: '2.5 days',
    unavailableLabel: '3 unavailable',
  },
];

function mockFetchResponse(payload: unknown, ok = true, status = 200) {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(payload),
  });
}

describe('CycleTimeBreakdown', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens unavailable item modal and renders linked ADO rows', async () => {
    const user = userEvent.setup();
    mockFetchResponse({
      count: 1,
      items: [
        {
          adoId: 12345,
          adoUrl:
            'https://dev.azure.com/Operations-Innovation/Event%20Streaming%20Platform/_workitems/edit/12345',
          title: 'Missing activated date',
          type: 'UserStory',
          state: 'Closed',
          workstreamName: 'Action Tracker',
        },
      ],
    });

    render(
      <CycleTimeBreakdown
        title="Program Cycle Time"
        items={cycleTimeItems}
        drilldownContext={{
          dashboard: 'main',
          sprintId: 'sprint-1',
          workstreamIds: ['ws-1', 'ws-2'],
          scopeLabel: 'Program',
        }}
      />
    );

    await user.click(
      screen.getByRole('button', { name: 'Open unavailable User Stories cycle-time items' })
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/metrics/cycle-time/unavailable?type=UserStory&dashboard=main&sprintId=sprint-1&workstreamIds=ws-1%2Cws-2'
    );
    expect(await screen.findByText('Missing activated date')).toBeInTheDocument();
    expect(screen.getByText('Scope: Program')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '#12345' })).toHaveAttribute(
      'href',
      'https://dev.azure.com/Operations-Innovation/Event%20Streaming%20Platform/_workitems/edit/12345'
    );
  });

  it.each([
    ['Spikes', 'Spike'],
    ['Bugs', 'Bug'],
  ])('requests %s unavailable items with the clicked type', async (label, type) => {
    const user = userEvent.setup();
    mockFetchResponse({ count: 0, items: [] });

    render(
      <CycleTimeBreakdown
        title="Cycle Time"
        items={cycleTimeItems}
        drilldownContext={{
          dashboard: 'main',
          sprintId: 'sprint-1',
          workstreamId: 'ws-1',
          scopeLabel: 'Action Tracker',
        }}
      />
    );

    await user.click(
      screen.getByRole('button', { name: `Open unavailable ${label} cycle-time items` })
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/metrics/cycle-time/unavailable?type=${type}&dashboard=main&sprintId=sprint-1&workstreamId=ws-1`
    );
    expect(
      await screen.findByText('No unavailable items found for this badge.')
    ).toBeInTheDocument();
  });

  it('renders an error state and retries the drilldown request', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Database unavailable' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ count: 0, items: [] }),
      });

    render(
      <CycleTimeBreakdown
        title="Program Cycle Time"
        items={cycleTimeItems}
        drilldownContext={{ dashboard: 'main', sprintId: 'sprint-1' }}
      />
    );

    await user.click(
      screen.getByRole('button', { name: 'Open unavailable User Stories cycle-time items' })
    );

    expect(await screen.findByText('Database unavailable')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByText('No unavailable items found for this badge.')
    ).toBeInTheDocument();
  });

  it('leaves unavailable counts static when no drilldown context is provided', () => {
    render(<CycleTimeBreakdown title="Cycle Time" items={cycleTimeItems} />);

    expect(screen.getByText('1 unavailable')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Open unavailable User Stories cycle-time items' })
    ).not.toBeInTheDocument();
  });
});
