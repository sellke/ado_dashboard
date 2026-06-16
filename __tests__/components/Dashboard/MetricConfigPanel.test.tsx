import { notifications } from '@mantine/notifications';
import { MetricConfigPanel } from '@/components/Dashboard/MetricConfigPanel';
import { act, renderWithNotifications as render, screen, userEvent, waitFor } from '@/test-utils';

const configResponse = {
  thresholds: [
    { metricName: 'overheadPercent', greenMin: 0, greenMax: 30, amberMin: 30.01, amberMax: 45 },
    { metricName: 'carryOverRate', greenMin: 0, greenMax: 10, amberMin: 10.01, amberMax: 25 },
    {
      metricName: 'deliveryToBugRatio',
      greenMin: 0,
      greenMax: 0.25,
      amberMin: 0.26,
      amberMax: 0.5,
    },
    { metricName: 'agingWipDays', greenMin: 0, greenMax: 5, amberMin: 5.01, amberMax: 10 },
  ],
  engine: {
    velocityGreenFloor: 1,
    velocityAmberFloor: 0.7,
    rollingWindow: 4,
    cycleTimeRollingWindow: 4,
  },
  rules: [],
};

const configWithRules = {
  ...configResponse,
  rules: [
    { category: 'deliveryPoints', workItemType: 'Bug', included: false },
    { category: 'deliveryPoints', workItemType: 'Spike', included: false },
    { category: 'deliveryPoints', workItemType: 'UserStory', included: true },
    { category: 'overheadHours', workItemType: 'Bug', included: true },
    { category: 'overheadHours', workItemType: 'Spike', included: true },
    { category: 'overheadHours', workItemType: 'Support', included: true },
  ],
};

describe('MetricConfigPanel', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    act(() => {
      notifications.clean();
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(configResponse),
    });
  });

  afterEach(() => {
    act(() => {
      notifications.clean();
    });
    global.fetch = originalFetch;
  });

  it('loads dashboard-visible thresholds when opened', async () => {
    render(<MetricConfigPanel opened onClose={jest.fn()} />);

    expect(await screen.findByText('Overhead percent')).toBeInTheDocument();
    expect(screen.getByText('Carry-over rate')).toBeInTheDocument();
    expect(screen.getByText('Delivery-to-bug ratio')).toBeInTheDocument();
    expect(screen.queryByText('agingWipDays')).not.toBeInTheDocument();
    expect(screen.getByText(/Lower is healthier/i)).toBeInTheDocument();
  });

  it('blocks save and shows inline validation errors', async () => {
    const user = userEvent.setup();
    render(<MetricConfigPanel opened onClose={jest.fn()} />);

    const greenMinInput = await screen.findByLabelText('Overhead percent Green min');
    await user.clear(greenMinInput);
    await user.type(greenMinInput, '40');
    await user.click(screen.getByRole('button', { name: /save thresholds/i }));

    expect(await screen.findByText(/Green minimum/i)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('treats blank numeric fields as invalid instead of zero', async () => {
    const user = userEvent.setup();
    render(<MetricConfigPanel opened onClose={jest.fn()} />);

    const greenMaxInput = await screen.findByLabelText('Overhead percent Green max');
    await user.clear(greenMaxInput);
    await user.click(screen.getByRole('button', { name: /save thresholds/i }));

    expect(await screen.findByText(/greenMax must be a finite number/i)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('saves valid threshold edits and shows success feedback', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(configResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ thresholds: configResponse.thresholds.slice(0, 3) }),
      });

    render(<MetricConfigPanel opened onClose={jest.fn()} />);

    const greenMaxInput = await screen.findByLabelText('Overhead percent Green max');
    const amberMinInput = await screen.findByLabelText('Overhead percent Amber min');
    await user.clear(greenMaxInput);
    await user.type(greenMaxInput, '29');
    await user.clear(amberMinInput);
    await user.type(amberMinInput, '29.01');
    await user.click(screen.getByRole('button', { name: /save thresholds/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/metric-config/thresholds',
        expect.objectContaining({ method: 'PUT' })
      );
    });
    expect((global.fetch as jest.Mock).mock.calls).not.toContainEqual([
      '/api/metrics/compute',
      expect.anything(),
    ]);
    expect(await screen.findByText(/Metric thresholds saved/i)).toBeInTheDocument();
  });

  it('shows save errors as notifications without disabling the form', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(configResponse),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Save unavailable' }),
      });

    render(<MetricConfigPanel opened onClose={jest.fn()} />);

    expect(await screen.findByText('Overhead percent')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /save thresholds/i }));

    expect(await screen.findByText('Save unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save thresholds/i })).toBeEnabled();
    expect(screen.queryByText(/Metric configuration unavailable/i)).not.toBeInTheDocument();
  });

  it('shows recoverable load errors without rendering defaults into the form', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Config unavailable' }),
    });

    render(<MetricConfigPanel opened onClose={jest.fn()} />);

    expect(await screen.findByText('Config unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Overhead percent')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('saves inclusion rule edits', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(configWithRules),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            rules: [
              ...configWithRules.rules.filter(
                (rule) => !(rule.category === 'deliveryPoints' && rule.workItemType === 'Bug')
              ),
              { category: 'deliveryPoints', workItemType: 'Bug', included: true },
            ],
          }),
      });

    render(<MetricConfigPanel opened onClose={jest.fn()} />);

    await user.click(await screen.findByRole('tab', { name: /inclusion rules/i }));
    const bugDelivery = await screen.findByLabelText('Include Bug in delivery points');
    await user.click(bugDelivery);
    await user.click(screen.getByRole('button', { name: /save rules/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/metric-config/rules',
        expect.objectContaining({ method: 'PUT' })
      );
    });
    expect(await screen.findByText(/Metric rules saved/i)).toBeInTheDocument();
  });

  it('validates and saves velocity and rolling settings', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(configWithRules),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            engine: {
              velocityGreenFloor: 1.2,
              velocityAmberFloor: 0.8,
              rollingWindow: 2,
              cycleTimeRollingWindow: 3,
            },
          }),
      });

    render(<MetricConfigPanel opened onClose={jest.fn()} />);

    await user.click(await screen.findByRole('tab', { name: /velocity & rolling/i }));
    const greenFloor = await screen.findByLabelText('Velocity green floor');
    const amberFloor = await screen.findByLabelText('Velocity amber floor');
    const rollingWindow = await screen.findByLabelText('Rolling window');
    const cycleTimeWindow = await screen.findByLabelText('Cycle-time window');

    await user.clear(greenFloor);
    await user.type(greenFloor, '0.7');
    await user.clear(amberFloor);
    await user.type(amberFloor, '1');
    await user.click(screen.getByRole('button', { name: /save velocity/i }));

    expect(await screen.findByText(/less than or equal to green floor/i)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await user.clear(greenFloor);
    await user.type(greenFloor, '1.2');
    await user.clear(amberFloor);
    await user.type(amberFloor, '0.8');
    await user.clear(rollingWindow);
    await user.type(rollingWindow, '2');
    await user.clear(cycleTimeWindow);
    await user.type(cycleTimeWindow, '3');
    await user.click(screen.getByRole('button', { name: /save velocity/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/metric-config/engine',
        expect.objectContaining({ method: 'PUT' })
      );
    });
    expect(await screen.findByText(/Metric engine saved/i)).toBeInTheDocument();
  });

  it('recomputes saved config and refreshes the dashboard on success', async () => {
    const user = userEvent.setup();
    const onRecomputed = jest.fn();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(configWithRules),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            snapshotsCreated: 2,
            sprintName: 'Sprint 27.1',
          }),
      });

    render(
      <MetricConfigPanel
        opened
        onClose={jest.fn()}
        onRecomputed={onRecomputed}
        recalculateSprintId="sprint-1"
      />
    );

    await screen.findByText('Overhead percent');
    await user.click(screen.getByRole('button', { name: /recalculate now/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/metrics/compute',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ sprintId: 'sprint-1' }),
        })
      );
    });
    expect(onRecomputed).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText(/Updated 2 workstream snapshots for Sprint 27\.1/i)
    ).toBeInTheDocument();
  });

  it('shows recompute errors without refreshing dashboard data', async () => {
    const user = userEvent.setup();
    const onRecomputed = jest.fn();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(configWithRules),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ success: false, error: 'No sprints found' }),
      });

    render(<MetricConfigPanel opened onClose={jest.fn()} onRecomputed={onRecomputed} />);

    await screen.findByText('Overhead percent');
    await user.click(screen.getByRole('button', { name: /recalculate now/i }));

    expect(await screen.findByText(/No sprints found/i)).toBeInTheDocument();
    expect(onRecomputed).not.toHaveBeenCalled();
  });
});
