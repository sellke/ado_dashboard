/**
 * Tests for ProgramSummarySection component.
 * Verifies populated state, null values, RAG indicators, sprint metadata,
 * trend chart rendering, and empty states.
 */
import { ProgramSummarySection } from '@/components/Dashboard/ProgramSummarySection';
import type { DashboardViewModel, MetricTileViewModel } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';

jest.mock('@mantine/charts', () => ({
  LineChart: (props: Record<string, unknown>) => (
    <div
      data-testid="line-chart"
      data-series={JSON.stringify(props.series)}
      data-points={JSON.stringify(props.data)}
      data-with-legend={String(!!props.withLegend)}
    />
  ),
  BarChart: (props: Record<string, unknown>) => (
    <div data-testid="bar-chart" data-series={JSON.stringify(props.series)} data-type={props.type as string} />
  ),
}));

describe('ProgramSummarySection', () => {
  const populatedViewModel: DashboardViewModel = {
    state: 'success',
    sprintLabel: 'Sprint 26.21',
    rollingWindowLabel: 'Rolling 5 sprints (current + 4 prior)',
    computedAtLabel: '2/11/2026, 6:30:00 PM',
    programMetrics: [
      {
        label: 'Avg Total Velocity',
        value: '120.5 pts',
        rawValue: 120.5,
        unit: 'pts',
        rag: 'Green',
        avgLabel: null,
      },
      {
        label: 'Avg Total Velocity Rate',
        value: '0.85 pts/hr',
        rawValue: 0.85,
        unit: 'pts/hr',
        rag: null,
        avgLabel: null,
      },
      {
        label: 'Avg Total Overhead %',
        value: '29%',
        rawValue: 29,
        unit: '%',
        rag: 'Amber',
        avgLabel: null,
      },
      {
        label: 'Avg Total Carry-Over %',
        value: '13.50%',
        rawValue: 13.5,
        unit: '%',
        rag: 'Green',
        avgLabel: null,
      },
    ],
    programTrendSprints: [
      {
        sprintId: 's1',
        sprintName: 'Sprint 1',
        velocity: '120 pts',
        velocityRate: '1.40 pts/hr',
        activeBugs: '10',
        bugsClosed: '14',
        rawVelocity: 120,
        rawVelocityRate: 1.4,
        rawActiveBugs: 10,
        rawBugsClosed: 14,
      },
      {
        sprintId: 's2',
        sprintName: 'Sprint 2',
        velocity: '126 pts',
        velocityRate: '1.55 pts/hr',
        activeBugs: '8',
        bugsClosed: '15',
        rawVelocity: 126,
        rawVelocityRate: 1.55,
        rawActiveBugs: 8,
        rawBugsClosed: 15,
      },
    ],
    sprint5Prediction: {
      velocity: '132 pts',
      rawVelocity: 132,
      sprintLabel: 'Sprint 26.21',
      isPredicted: true,
    },
    workstreamCards: [],
  };

  it('renders 4 avg metrics with values, RAG indicators', () => {
    render(<ProgramSummarySection viewModel={populatedViewModel} />);

    expect(screen.getByText('Program Summary')).toBeInTheDocument();
    expect(screen.getByText(/Sprint 26\.21/)).toBeInTheDocument();
    expect(screen.getByText(/2\/11\/2026/)).toBeInTheDocument();

    expect(screen.getByText('Avg Total Velocity')).toBeInTheDocument();
    expect(screen.getByText('120.5 pts')).toBeInTheDocument();

    expect(screen.getByText('Avg Total Velocity Rate')).toBeInTheDocument();
    expect(screen.getByText('0.85 pts/hr')).toBeInTheDocument();

    expect(screen.getByText('Avg Total Overhead %')).toBeInTheDocument();
    expect(screen.getByText('29%')).toBeInTheDocument();

    expect(screen.getByText('Avg Total Carry-Over %')).toBeInTheDocument();
    expect(screen.getByText('13.50%')).toBeInTheDocument();

    expect(screen.queryByText('Predictability')).not.toBeInTheDocument();
    expect(screen.queryByText('Monthly Milestone %')).not.toBeInTheDocument();
    expect(screen.queryByText('Quarterly Milestone Progress')).not.toBeInTheDocument();

    expect(screen.getAllByText('G').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders velocity chart with predicted sprint and bug burndown', () => {
    render(<ProgramSummarySection viewModel={populatedViewModel} />);

    expect(screen.getByText('Sprint Trend')).toBeInTheDocument();
    expect(screen.getByText('Velocity (Completed Points)')).toBeInTheDocument();
    expect(screen.getByText('Bug Burndown')).toBeInTheDocument();

    const lineCharts = screen.getAllByTestId('line-chart');
    expect(lineCharts).toHaveLength(1);

    expect(lineCharts[0].getAttribute('data-with-legend')).toBe('false');

    const velocitySeries = JSON.parse(lineCharts[0].getAttribute('data-series')!);
    expect(velocitySeries).toEqual([
      { name: 'Completed Points', color: 'blue.6' },
      { name: 'Predicted', color: 'blue.6', strokeDasharray: '5 5' },
    ]);
    const velocityPoints = JSON.parse(lineCharts[0].getAttribute('data-points')!);
    expect(velocityPoints).toHaveLength(3);

    const barCharts = screen.getAllByTestId('bar-chart');
    expect(barCharts).toHaveLength(1);
    expect(barCharts[0].getAttribute('data-type')).toBe('stacked');

    const bugSeries = JSON.parse(barCharts[0].getAttribute('data-series')!);
    expect(bugSeries).toEqual([
      { name: 'Closed', color: 'green.6' },
      { name: 'Open', color: 'red.6' },
    ]);

    expect(screen.queryByText('Sprint 5 Predicted Velocity')).not.toBeInTheDocument();
  });

  it('keeps prediction as a distinct fifth category when sprint labels collide', () => {
    const vmDuplicateSprintLabel: DashboardViewModel = {
      ...populatedViewModel,
      programTrendSprints: [
        {
          sprintId: 's1',
          sprintName: 'Sprint 26.18',
          velocity: '31 pts',
          velocityRate: '1.10 pts/hr',
          activeBugs: '9',
          bugsClosed: '7',
          rawVelocity: 31,
          rawVelocityRate: 1.1,
          rawActiveBugs: 9,
          rawBugsClosed: 7,
        },
        {
          sprintId: 's2',
          sprintName: 'Sprint 26.19',
          velocity: '61 pts',
          velocityRate: '1.20 pts/hr',
          activeBugs: '8',
          bugsClosed: '6',
          rawVelocity: 61,
          rawVelocityRate: 1.2,
          rawActiveBugs: 8,
          rawBugsClosed: 6,
        },
        {
          sprintId: 's3',
          sprintName: 'Sprint 26.20',
          velocity: '90 pts',
          velocityRate: '1.30 pts/hr',
          activeBugs: '7',
          bugsClosed: '5',
          rawVelocity: 90,
          rawVelocityRate: 1.3,
          rawActiveBugs: 7,
          rawBugsClosed: 5,
        },
        {
          sprintId: 's4',
          sprintName: 'Sprint 26.21',
          velocity: '54 pts',
          velocityRate: '1.40 pts/hr',
          activeBugs: '6',
          bugsClosed: '4',
          rawVelocity: 54,
          rawVelocityRate: 1.4,
          rawActiveBugs: 6,
          rawBugsClosed: 4,
        },
      ],
      sprint5Prediction: {
        velocity: '58 pts',
        rawVelocity: 58,
        sprintLabel: 'Sprint 26.21',
        isPredicted: true,
      },
    };

    render(<ProgramSummarySection viewModel={vmDuplicateSprintLabel} />);

    const lineChart = screen.getAllByTestId('line-chart')[0];
    const velocityPoints = JSON.parse(lineChart.getAttribute('data-points')!);
    expect(velocityPoints).toHaveLength(5);
    expect(velocityPoints[4].sprint).toBe('Sprint 26.21 (Forecasted)');
    expect(velocityPoints[4].Predicted).toBe(58);
  });

  it('renders N/A for metrics with null values with stable layout', () => {
    const vmWithNulls: DashboardViewModel = {
      ...populatedViewModel,
      programMetrics: [
        {
          label: 'Avg Total Velocity',
          value: 'N/A',
          rawValue: null,
          unit: 'pts',
          rag: null,
          avgLabel: null,
        },
        {
          label: 'Avg Total Overhead %',
          value: 'N/A',
          rawValue: null,
          unit: '%',
          rag: 'Amber',
          avgLabel: null,
        },
      ] as MetricTileViewModel[],
    };

    render(<ProgramSummarySection viewModel={vmWithNulls} />);

    expect(screen.getByText('Avg Total Velocity')).toBeInTheDocument();
    expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Avg Total Overhead %')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders different RAG colors on different metrics', () => {
    render(<ProgramSummarySection viewModel={populatedViewModel} />);

    const gBadges = screen.getAllByText('G');
    const aBadges = screen.getAllByText('A');

    expect(gBadges.length).toBeGreaterThanOrEqual(1);
    expect(aBadges.length).toBe(1);
  });

  it('renders sprint label and computedAt freshness', () => {
    render(<ProgramSummarySection viewModel={populatedViewModel} />);

    expect(screen.getByText('Program Summary')).toBeInTheDocument();
    expect(screen.getByText(/Sprint 26\.21/)).toBeInTheDocument();
    expect(screen.getByText(/2\/11\/2026/)).toBeInTheDocument();
  });

  it('handles null sprint label and computedAt gracefully', () => {
    const vmNullMetadata: DashboardViewModel = {
      ...populatedViewModel,
      sprintLabel: null,
      rollingWindowLabel: null,
      computedAtLabel: null,
    };

    render(<ProgramSummarySection viewModel={vmNullMetadata} />);

    expect(screen.getByText('Program Summary')).toBeInTheDocument();
    expect(screen.getByText('Avg Total Velocity')).toBeInTheDocument();
  });

  it('shows placeholder when programMetrics is null', () => {
    const vmNoMetrics: DashboardViewModel = {
      state: 'success',
      sprintLabel: 'Sprint 1',
      rollingWindowLabel: null,
      computedAtLabel: '1/1/2026',
      programMetrics: null,
      programTrendSprints: [],
      sprint5Prediction: null,
      workstreamCards: [],
    };

    render(<ProgramSummarySection viewModel={vmNoMetrics} />);

    expect(screen.getByText('Program Summary')).toBeInTheDocument();
    expect(screen.getByText('No program metrics available')).toBeInTheDocument();
  });

  it('displays velocity rate as its own tile', () => {
    render(<ProgramSummarySection viewModel={populatedViewModel} />);

    expect(screen.getByText('Avg Total Velocity Rate')).toBeInTheDocument();
    expect(screen.getByText('0.85 pts/hr')).toBeInTheDocument();
  });

  it('returns null when viewModel.state is not success', () => {
    render(
      <ProgramSummarySection
        viewModel={{
          state: 'loading',
          sprintLabel: null,
          rollingWindowLabel: null,
          computedAtLabel: null,
          programMetrics: null,
          programTrendSprints: [],
          sprint5Prediction: null,
          workstreamCards: [],
        }}
      />
    );

    expect(screen.queryByText('Program Summary')).not.toBeInTheDocument();
  });

  it('does not render trend section when programTrendSprints is empty', () => {
    const vmNoTrend: DashboardViewModel = {
      ...populatedViewModel,
      programTrendSprints: [],
      sprint5Prediction: null,
    };

    render(<ProgramSummarySection viewModel={vmNoTrend} />);

    expect(screen.queryByText('Sprint Trend')).not.toBeInTheDocument();
  });

  it('renders charts even with null raw values gracefully', () => {
    const vmNullTrend: DashboardViewModel = {
      ...populatedViewModel,
      programTrendSprints: [
        {
          sprintId: 's1',
          sprintName: 'Sprint 1',
          velocity: 'N/A',
          velocityRate: 'N/A',
          activeBugs: 'N/A',
          bugsClosed: 'N/A',
          rawVelocity: null,
          rawVelocityRate: null,
          rawActiveBugs: 0,
          rawBugsClosed: 0,
        },
      ],
      sprint5Prediction: { velocity: 'N/A', rawVelocity: null, sprintLabel: 'Sprint 26.21', isPredicted: true },
    };

    render(<ProgramSummarySection viewModel={vmNullTrend} />);

    expect(screen.getByText('Sprint Trend')).toBeInTheDocument();
    const lineCharts = screen.getAllByTestId('line-chart');
    expect(lineCharts).toHaveLength(1);
    const velocityPoints = JSON.parse(lineCharts[0].getAttribute('data-points')!);
    expect(velocityPoints).toHaveLength(2);
    expect(velocityPoints[1].sprint).toBe('Sprint 26.21');
    expect(screen.getAllByTestId('bar-chart')).toHaveLength(1);
  });
});
