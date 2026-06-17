/**
 * Tests for ProgramSummarySection component.
 * Verifies populated state, null values, RAG indicators, sprint metadata,
 * trend chart rendering, and empty states.
 */
import { ProgramSummarySection } from '@/components/Dashboard/ProgramSummarySection';
import type { DashboardViewModel, MetricTileViewModel } from '@/lib/dashboard/types';
import { render, screen, userEvent } from '@/test-utils';

jest.mock('@/lib/charts', () => ({
  AppLineChart: (props: Record<string, unknown>) => (
    <div
      data-testid="line-chart"
      data-series={JSON.stringify(props.series)}
      data-points={JSON.stringify(props.data)}
      data-with-legend={String(!!props.withLegend)}
    />
  ),
  AppBarChart: (props: Record<string, unknown>) => (
    <div
      data-testid="bar-chart"
      data-series={JSON.stringify(props.series)}
      data-type={props.type as string}
    />
  ),
  ChartLegend: ({
    items,
  }: {
    items: Array<{ label: string; color: string; dashed?: boolean }>;
  }) => <div data-testid="chart-legend" data-items={JSON.stringify(items)} />,
}));

describe('ProgramSummarySection', () => {
  const populatedViewModel: DashboardViewModel = {
    state: 'success',
    sprintLabel: 'Sprint 27.1',
    rollingWindowLabel: 'Rolling 5 sprints (current + 4 prior)',
    computedAtLabel: '4/28/2026, 6:30:00 PM',
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
        label: 'Avg Total Delivery/Bug',
        value: '0.12',
        rawValue: 0.12,
        unit: '',
        rag: 'Green',
        avgLabel: null,
        metricId: 'deliveryToBugRatio',
        rollingMetric: {
          metricId: 'deliveryToBugRatio',
          definitionMetricId: 'deliveryToBugRatio',
          title: 'Avg Total Delivery/Bug',
          scope: 'program',
          scopeLabel: 'Program',
          summaryValue: '0.12',
          rawSummaryValue: 0.12,
          unit: '',
          rag: 'Green',
          rollingWindowLabel: 'Rolling 5 sprints (current + 4 prior)',
          emptyMessage: 'No sprint history is available for Avg Total Delivery/Bug.',
          rows: [
            {
              sprintId: 's1',
              sprintName: 'Sprint 1',
              value: '0.10',
              rawValue: 0.1,
              rollingAverageValue: null,
              rawRollingAverageValue: null,
            },
          ],
        },
      },
      {
        label: 'Avg Total Overhead %',
        value: '29.00%',
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
    programCycleTime: [
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
        unavailableItemCount: 0,
        totalLabel: '0 days',
        averageLabel: 'N/A',
        unavailableLabel: null,
      },
      {
        type: 'Bug',
        label: 'Bugs',
        totalBusinessDays: 5,
        averageBusinessDays: 2.5,
        completedItemCount: 2,
        unavailableItemCount: 0,
        totalLabel: '5 days',
        averageLabel: '2.5 days',
        unavailableLabel: null,
      },
    ],
    programTrendSprints: [
      {
        sprintId: 's1',
        sprintName: 'Sprint 1',
        isCurrent: false,
        velocity: '120 pts',
        velocityRate: '1.40 pts/hr',
        activeBugs: '10',
        bugsClosed: '14',
        rawVelocity: 120,
        rawVelocityRate: 1.4,
        rawActiveBugs: 10,
        rawBugsClosed: 14,
        bugs: [],
        velocityAvg: null,
        overheadPercentAvg: null,
        carryOverRateAvg: null,
        plannedPoints: null,
        completedPoints: null,
        carryOverPoints: null,
        grossHours: null,
        rawDeliveryToBugRatio: null,
        deliveryToBugCompletedPoints: null,
        deliveryToBugHours: null,
        rawOverheadPercent: null,
        rawCarryOverRate: null,
      },
      {
        sprintId: 's2',
        sprintName: 'Sprint 2',
        isCurrent: false,
        velocity: '126 pts',
        velocityRate: '1.55 pts/hr',
        activeBugs: '8',
        bugsClosed: '15',
        rawVelocity: 126,
        rawVelocityRate: 1.55,
        rawActiveBugs: 8,
        rawBugsClosed: 15,
        bugs: [],
        velocityAvg: null,
        overheadPercentAvg: null,
        carryOverRateAvg: null,
        plannedPoints: null,
        completedPoints: null,
        carryOverPoints: null,
        grossHours: null,
        rawDeliveryToBugRatio: null,
        deliveryToBugCompletedPoints: null,
        deliveryToBugHours: null,
        rawOverheadPercent: null,
        rawCarryOverRate: null,
      },
    ],
    sprint5Prediction: {
      velocity: '132 pts',
      rawVelocity: 132,
      sprintLabel: 'Sprint 27.1',
      isPredicted: true,
    },
    workstreamCards: [],
  };

  it('renders 4 avg metrics with values, RAG indicators', () => {
    render(<ProgramSummarySection viewModel={populatedViewModel} />);

    expect(screen.getByText('Program Summary')).toBeInTheDocument();
    expect(screen.getByText(/Sprint 27\.1/)).toBeInTheDocument();
    expect(screen.getByText(/4\/28\/2026/)).toBeInTheDocument();

    expect(screen.getByText('Avg Total Velocity')).toBeInTheDocument();
    expect(screen.getByText('120.5 pts')).toBeInTheDocument();

    expect(screen.getByText('Avg Total Velocity Rate')).toBeInTheDocument();
    expect(screen.getByText('0.85 pts/hr')).toBeInTheDocument();

    expect(screen.getByText('Avg Total Delivery/Bug')).toBeInTheDocument();
    expect(screen.getByText('0.12')).toBeInTheDocument();

    expect(screen.getByText('Avg Total Overhead %')).toBeInTheDocument();
    expect(screen.getByText('29.00%')).toBeInTheDocument();

    expect(screen.getByText('Avg Total Carry-Over %')).toBeInTheDocument();
    expect(screen.getByText('13.50%')).toBeInTheDocument();

    expect(screen.queryByText('Predictability')).not.toBeInTheDocument();
    expect(screen.queryByText('Monthly Milestone %')).not.toBeInTheDocument();
    expect(screen.queryByText('Quarterly Milestone Progress')).not.toBeInTheDocument();

    expect(screen.getAllByText('G').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('opens rolling metric details for supported program metrics', async () => {
    const user = userEvent.setup();
    render(<ProgramSummarySection viewModel={populatedViewModel} />);

    await user.click(
      screen.getByRole('button', { name: 'Open rolling details for Avg Total Delivery/Bug' })
    );

    expect(screen.getByRole('dialog', { name: 'Avg Total Delivery/Bug' })).toBeInTheDocument();
    expect(screen.getByText('Scope: Program')).toBeInTheDocument();
    expect(
      screen.getAllByText((_, element) => element?.textContent === 'Sprint 1: 0.10').length
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/rolling average/i)).not.toBeInTheDocument();
  });

  it('renders program cycle-time totals, averages, N/A, and unavailable counts', () => {
    render(<ProgramSummarySection viewModel={populatedViewModel} />);

    expect(screen.getByText('Program Cycle Time')).toBeInTheDocument();
    expect(screen.getByText('User Stories')).toBeInTheDocument();
    expect(screen.getByText('Avg 4 days')).toBeInTheDocument();
    expect(screen.getByText('Total 12 days • 3 completed')).toBeInTheDocument();
    expect(screen.getByText('1 unavailable')).toBeInTheDocument();
    expect(screen.getByText('Spikes')).toBeInTheDocument();
    expect(screen.getByText('Avg N/A')).toBeInTheDocument();
  });

  it('renders velocity chart with predicted sprint and bug burndown', () => {
    render(<ProgramSummarySection viewModel={populatedViewModel} />);

    expect(screen.getByText('Sprint Trend')).toBeInTheDocument();
    expect(screen.getByText('Velocity (Points)')).toBeInTheDocument();
    expect(screen.getByText('Bug Burndown')).toBeInTheDocument();

    const lineCharts = screen.getAllByTestId('line-chart');
    expect(lineCharts).toHaveLength(1);

    expect(lineCharts[0].getAttribute('data-with-legend')).toBe('false');

    const velocitySeries = JSON.parse(lineCharts[0].getAttribute('data-series')!);
    expect(velocitySeries).toEqual([
      { name: 'Completed Points', color: 'blue.6' },
      { name: 'Forecasted', color: 'blue.4', strokeDasharray: '5 5' },
    ]);
    const velocityPoints = JSON.parse(lineCharts[0].getAttribute('data-points')!);
    // 2 sprints — forecast merges onto the last sprint, no extra entry
    expect(velocityPoints).toHaveLength(2);

    const barCharts = screen.getAllByTestId('bar-chart');
    expect(barCharts).toHaveLength(1);
    expect(barCharts[0].getAttribute('data-type')).toBe('stacked');

    const bugSeries = JSON.parse(barCharts[0].getAttribute('data-series')!);
    expect(bugSeries).toEqual([
      { name: 'Open (New/Active)', color: 'red.6' },
      { name: 'Closed (Resolved/Testing/Closed)', color: 'green.6' },
    ]);

    expect(screen.queryByText('Sprint 5 Predicted Velocity')).not.toBeInTheDocument();
  });

  it('merges forecast onto the last sprint when no sprint is marked isCurrent', () => {
    const vmDuplicateSprintLabel: DashboardViewModel = {
      ...populatedViewModel,
      programTrendSprints: [
        {
          sprintId: 's1',
          sprintName: 'Sprint 26.24',
          isCurrent: false,
          velocity: '31 pts',
          velocityRate: '1.10 pts/hr',
          activeBugs: '9',
          bugsClosed: '7',
          rawVelocity: 31,
          rawVelocityRate: 1.1,
          rawActiveBugs: 9,
          rawBugsClosed: 7,
          bugs: [],
          velocityAvg: null,
          overheadPercentAvg: null,
          carryOverRateAvg: null,
          plannedPoints: null,
          completedPoints: null,
          carryOverPoints: null,
          grossHours: null,
          rawOverheadPercent: null,
          rawCarryOverRate: null,
        },
        {
          sprintId: 's2',
          sprintName: 'Sprint 26.25',
          isCurrent: false,
          velocity: '61 pts',
          velocityRate: '1.20 pts/hr',
          activeBugs: '8',
          bugsClosed: '6',
          rawVelocity: 61,
          rawVelocityRate: 1.2,
          rawActiveBugs: 8,
          rawBugsClosed: 6,
          bugs: [],
          velocityAvg: null,
          overheadPercentAvg: null,
          carryOverRateAvg: null,
          plannedPoints: null,
          completedPoints: null,
          carryOverPoints: null,
          grossHours: null,
          rawOverheadPercent: null,
          rawCarryOverRate: null,
        },
        {
          sprintId: 's3',
          sprintName: 'Sprint 26.26',
          isCurrent: false,
          velocity: '90 pts',
          velocityRate: '1.30 pts/hr',
          activeBugs: '7',
          bugsClosed: '5',
          rawVelocity: 90,
          rawVelocityRate: 1.3,
          rawActiveBugs: 7,
          rawBugsClosed: 5,
          bugs: [],
          velocityAvg: null,
          overheadPercentAvg: null,
          carryOverRateAvg: null,
          plannedPoints: null,
          completedPoints: null,
          carryOverPoints: null,
          grossHours: null,
          rawOverheadPercent: null,
          rawCarryOverRate: null,
        },
        {
          sprintId: 's4',
          sprintName: 'Sprint 27.1',
          isCurrent: false,
          velocity: '54 pts',
          velocityRate: '1.40 pts/hr',
          activeBugs: '6',
          bugsClosed: '4',
          rawVelocity: 54,
          rawVelocityRate: 1.4,
          rawActiveBugs: 6,
          rawBugsClosed: 4,
          bugs: [],
          velocityAvg: null,
          overheadPercentAvg: null,
          carryOverRateAvg: null,
          plannedPoints: null,
          completedPoints: null,
          carryOverPoints: null,
          grossHours: null,
          rawOverheadPercent: null,
          rawCarryOverRate: null,
        },
      ],
      sprint5Prediction: {
        velocity: '58 pts',
        rawVelocity: 58,
        sprintLabel: 'Sprint 27.1',
        isPredicted: true,
      },
    };

    render(<ProgramSummarySection viewModel={vmDuplicateSprintLabel} />);

    const lineChart = screen.getAllByTestId('line-chart')[0];
    const velocityPoints = JSON.parse(lineChart.getAttribute('data-points')!);
    // 4 sprints — forecast merges onto the last sprint, no extra entry
    expect(velocityPoints).toHaveLength(4);
    expect(velocityPoints[3].sprint).toBe('Sprint 27.1');
    expect(velocityPoints[3].Forecasted).toBe(58);
    // Bridge on the prior sprint for a visible dashed line segment
    expect(velocityPoints[2].Forecasted).toBe(velocityPoints[2]['Completed Points']);
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
    expect(screen.getByText(/Sprint 27\.1/)).toBeInTheDocument();
    expect(screen.getByText(/4\/28\/2026/)).toBeInTheDocument();
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
      programCycleTime: null,
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
          programCycleTime: null,
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

  describe('metric definition tooltips (Story 3)', () => {
    const vmWithMetricIds: DashboardViewModel = {
      ...populatedViewModel,
      programMetrics: [
        { ...populatedViewModel.programMetrics![0], metricId: 'velocity' },
        { ...populatedViewModel.programMetrics![1], metricId: 'velocityRate' },
        { ...populatedViewModel.programMetrics![2], metricId: 'deliveryToBugRatio' },
        { ...populatedViewModel.programMetrics![3], metricId: 'overheadPercent' },
        { ...populatedViewModel.programMetrics![4], metricId: 'carryOverRate' },
      ],
    };

    it('renders info icons for all four program tiles', () => {
      render(<ProgramSummarySection viewModel={vmWithMetricIds} />);

      expect(
        screen.getByRole('button', { name: 'Definition for Avg Total Velocity' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Definition for Avg Total Velocity Rate' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Definition for Avg Total Delivery/Bug' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Definition for Avg Total Overhead %' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Definition for Avg Total Carry-Over %' })
      ).toBeInTheDocument();
    });

    it('renders info icons beside both chart headers', () => {
      render(<ProgramSummarySection viewModel={vmWithMetricIds} />);

      expect(
        screen.getByRole('button', { name: 'Definition for Velocity (Points)' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Definition for Bug Burndown' })
      ).toBeInTheDocument();
    });

    it('exposes tile definition copy on hover', async () => {
      const user = userEvent.setup();
      render(<ProgramSummarySection viewModel={vmWithMetricIds} />);

      await user.hover(screen.getByRole('button', { name: 'Definition for Avg Total Velocity' }));

      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip.textContent).toContain('Definition:');
      expect(tooltip.textContent).toContain('Calculation:');
    });

    it('wraps program RAG badges with threshold tooltip copy', () => {
      render(<ProgramSummarySection viewModel={vmWithMetricIds} />);

      // Overhead tile RAG badge (Amber) should expose threshold copy via aria-label.
      const overheadBadge = screen.getByLabelText(/Amber status/);
      expect(overheadBadge.getAttribute('aria-label')).toContain('30.01–45%');
    });

    it('does not render hints when tiles lack metricId', () => {
      render(<ProgramSummarySection viewModel={populatedViewModel} />);

      expect(
        screen.queryByRole('button', { name: 'Definition for Avg Total Velocity' })
      ).not.toBeInTheDocument();
    });
  });

  it('renders charts even with null raw values gracefully', () => {
    const vmNullTrend: DashboardViewModel = {
      ...populatedViewModel,
      programTrendSprints: [
        {
          sprintId: 's1',
          sprintName: 'Sprint 1',
          isCurrent: false,
          velocity: 'N/A',
          velocityRate: 'N/A',
          activeBugs: 'N/A',
          bugsClosed: 'N/A',
          rawVelocity: null,
          rawVelocityRate: null,
          rawActiveBugs: 0,
          rawBugsClosed: 0,
          bugs: [],
          velocityAvg: null,
          overheadPercentAvg: null,
          carryOverRateAvg: null,
          plannedPoints: null,
          completedPoints: null,
          carryOverPoints: null,
          grossHours: null,
          rawOverheadPercent: null,
          rawCarryOverRate: null,
        },
      ],
      sprint5Prediction: {
        velocity: 'N/A',
        rawVelocity: null,
        sprintLabel: 'Sprint 27.1',
        isPredicted: true,
      },
    };

    render(<ProgramSummarySection viewModel={vmNullTrend} />);

    expect(screen.getByText('Sprint Trend')).toBeInTheDocument();
    const lineCharts = screen.getAllByTestId('line-chart');
    expect(lineCharts).toHaveLength(1);
    const velocityPoints = JSON.parse(lineCharts[0].getAttribute('data-points')!);
    // 1 sprint — no forecast merged (rawVelocity is null), no extra entry
    expect(velocityPoints).toHaveLength(1);
    expect(velocityPoints[0].sprint).toBe('Sprint 1');
    expect(velocityPoints[0]).not.toHaveProperty('Forecasted');
    expect(screen.getAllByTestId('bar-chart')).toHaveLength(1);
  });
});
