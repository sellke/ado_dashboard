import { RollingMetricDetailModal } from '@/components/Dashboard/RollingMetricDetailModal';
import type { RollingMetricDetailViewModel } from '@/lib/dashboard/types';
import { render, screen, userEvent } from '@/test-utils';

jest.mock('@/lib/charts', () => ({
  AppLineChart: (props: Record<string, unknown>) => (
    <div
      data-testid="rolling-metric-chart"
      data-points={JSON.stringify(props.data)}
      data-series={JSON.stringify(props.series)}
      data-reference-lines={JSON.stringify(props.referenceLines)}
    />
  ),
  ChartLegend: ({
    items,
  }: {
    items: Array<{ label: string; color: string; dashed?: boolean }>;
  }) => <div data-testid="rolling-metric-legend" data-items={JSON.stringify(items)} />,
}));

const baseMetric: RollingMetricDetailViewModel = {
  metricId: 'overheadPercent',
  definitionMetricId: 'overheadPercent',
  title: 'Avg Total Overhead %',
  scope: 'program',
  scopeLabel: 'Program',
  summaryValue: '29.00%',
  rawSummaryValue: 29,
  unit: '%',
  rag: 'Amber',
  rollingWindowLabel: 'Rolling 5 sprints (current + 4 prior)',
  emptyMessage: 'No sprint history is available for Avg Total Overhead %.',
  rows: [
    {
      sprintId: 's1',
      sprintName: 'Sprint 1',
      value: '28.50%',
      rawValue: 28.5,
      rollingAverageValue: '26.20%',
      rawRollingAverageValue: 26.2,
    },
    {
      sprintId: 's2',
      sprintName: 'Sprint 2',
      value: 'N/A',
      rawValue: null,
      rollingAverageValue: '27.00%',
      rawRollingAverageValue: 27,
    },
  ],
};

describe('RollingMetricDetailModal', () => {
  it('renders populated rolling metric details', () => {
    render(<RollingMetricDetailModal opened metric={baseMetric} onClose={jest.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Avg Total Overhead %' })).toBeInTheDocument();
    expect(screen.getByText('Scope: Program')).toBeInTheDocument();
    expect(screen.getByText('Rolling 5 sprints (current + 4 prior)')).toBeInTheDocument();
    expect(screen.getByText('29.00%')).toBeInTheDocument();
    expect(screen.getByText(/Definition: Share of capacity spent/)).toBeInTheDocument();

    const chart = screen.getByTestId('rolling-metric-chart');
    expect(chart).toHaveAttribute(
      'data-points',
      JSON.stringify([{ sprint: 'Sprint 1', Value: 28.5 }, { sprint: 'Sprint 2' }])
    );
    expect(chart).toHaveAttribute(
      'data-series',
      JSON.stringify([{ name: 'Value', color: 'blue.6' }])
    );
    expect(chart).not.toHaveAttribute('data-reference-lines');
  });

  it('renders an explanatory empty state when there are no rows', () => {
    render(
      <RollingMetricDetailModal
        opened
        metric={{
          ...baseMetric,
          rows: [],
        }}
        onClose={jest.fn()}
      />
    );

    expect(
      screen.getByText('No sprint history is available for Avg Total Overhead %.')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('rolling-metric-chart')).not.toBeInTheDocument();
  });

  it('shows N/A for null row values without hiding available rows', () => {
    render(<RollingMetricDetailModal opened metric={baseMetric} onClose={jest.fn()} />);

    expect(
      screen.getByText((_, element) => element?.textContent === 'Sprint 2: N/A')
    ).toBeInTheDocument();
    expect(screen.queryByText(/rolling average/i)).not.toBeInTheDocument();
  });

  it('calls onClose from the modal close button', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(<RollingMetricDetailModal opened metric={baseMetric} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Close rolling metric detail' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
