import { BugBurndownChart } from '@/components/Dashboard/BugBurndownChart';
import type { TrendSprintViewModel } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';

/**
 * Tests for BugBurndownChart component.
 * Verifies: empty state, data mapping, series configuration, height override,
 * and the (Cur) tick formatter behavior.
 */

jest.mock('@/lib/charts', () => ({
  AppBarChart: (props: Record<string, unknown>) => (
    <div
      data-testid="bug-burndown-chart"
      data-series={JSON.stringify(props.series)}
      data-data={JSON.stringify(props.data)}
      data-height={String(props.height)}
      data-type={String(props.type)}
      data-with-legend={String(props.withLegend)}
      data-tick-formatter={String(
        (props.xAxisProps as { tickFormatter?: (v: string) => string } | undefined)
          ?.tickFormatter?.('Sprint 26.25') ?? ''
      )}
    />
  ),
}));

const enrichedDefaults = {
  velocityAvg: null as number | null,
  overheadPercentAvg: null as number | null,
  carryOverRateAvg: null as number | null,
  plannedPoints: null as number | null,
  completedPoints: null as number | null,
  carryOverPoints: null as number | null,
  grossHours: null as number | null,
  rawOverheadPercent: null as number | null,
  rawCarryOverRate: null as number | null,
};

function makeTrendSprint(overrides: Partial<TrendSprintViewModel> = {}): TrendSprintViewModel {
  return {
    sprintId: 's1',
    sprintName: 'Sprint 26.24',
    isCurrent: false,
    velocity: '38',
    velocityRate: '0.8',
    activeBugs: '2',
    bugsClosed: '1',
    rawVelocity: 38,
    rawVelocityRate: 0.8,
    rawActiveBugs: 2,
    rawBugsClosed: 1,
    bugs: [],
    overheadBreakdown: [],
    ...enrichedDefaults,
    ...overrides,
  };
}

describe('BugBurndownChart', () => {
  it('returns null when trendSprints is empty', () => {
    render(<BugBurndownChart trendSprints={[]} />);
    expect(screen.queryByTestId('bug-burndown-chart')).not.toBeInTheDocument();
  });

  it('renders a stacked bar chart for populated trendSprints', () => {
    render(
      <BugBurndownChart
        trendSprints={[
          makeTrendSprint({ sprintId: 's1', sprintName: 'Sprint 26.24', rawActiveBugs: 4, rawBugsClosed: 2 }),
          makeTrendSprint({ sprintId: 's2', sprintName: 'Sprint 26.25', isCurrent: true, rawActiveBugs: 3, rawBugsClosed: 5 }),
        ]}
      />
    );

    const chart = screen.getByTestId('bug-burndown-chart');
    expect(chart).toBeInTheDocument();
    expect(chart.getAttribute('data-type')).toBe('stacked');
    expect(chart.getAttribute('data-with-legend')).toBe('true');
  });

  it('maps trendSprints to data points with Open/Closed keys', () => {
    render(
      <BugBurndownChart
        trendSprints={[
          makeTrendSprint({ sprintId: 's1', sprintName: 'Sprint A', rawActiveBugs: 4, rawBugsClosed: 2 }),
          makeTrendSprint({ sprintId: 's2', sprintName: 'Sprint B', isCurrent: true, rawActiveBugs: 3, rawBugsClosed: 5 }),
        ]}
      />
    );

    const chart = screen.getByTestId('bug-burndown-chart');
    const data = JSON.parse(chart.getAttribute('data-data')!) as Array<Record<string, unknown>>;
    expect(data).toEqual([
      { sprint: 'Sprint A', 'Open (New/Active)': 4, 'Closed (Resolved/Testing/Closed)': 2 },
      { sprint: 'Sprint B', 'Open (New/Active)': 3, 'Closed (Resolved/Testing/Closed)': 5 },
    ]);
  });

  it('configures the two red/green series in Open→Closed order', () => {
    render(
      <BugBurndownChart
        trendSprints={[makeTrendSprint({ rawActiveBugs: 1, rawBugsClosed: 1 })]}
      />
    );

    const chart = screen.getByTestId('bug-burndown-chart');
    const series = JSON.parse(chart.getAttribute('data-series')!);
    expect(series).toEqual([
      { name: 'Open (New/Active)', color: 'red.6' },
      { name: 'Closed (Resolved/Testing/Closed)', color: 'green.6' },
    ]);
  });

  it('uses the default 220 height when no height prop is passed', () => {
    render(
      <BugBurndownChart
        trendSprints={[makeTrendSprint({ rawActiveBugs: 1, rawBugsClosed: 1 })]}
      />
    );
    expect(screen.getByTestId('bug-burndown-chart').getAttribute('data-height')).toBe('220');
  });

  it('honors an explicit height prop', () => {
    render(
      <BugBurndownChart
        trendSprints={[makeTrendSprint({ rawActiveBugs: 1, rawBugsClosed: 1 })]}
        height={180}
      />
    );
    expect(screen.getByTestId('bug-burndown-chart').getAttribute('data-height')).toBe('180');
  });

  it('appends "(Cur)" suffix to the current sprint in the x-axis tick formatter', () => {
    render(
      <BugBurndownChart
        trendSprints={[
          makeTrendSprint({ sprintId: 's1', sprintName: 'Sprint 26.24', isCurrent: false }),
          makeTrendSprint({ sprintId: 's2', sprintName: 'Sprint 26.25', isCurrent: true }),
        ]}
      />
    );

    const chart = screen.getByTestId('bug-burndown-chart');
    // The mock invokes the tickFormatter against 'Sprint 26.25' and surfaces the result via data attribute.
    expect(chart.getAttribute('data-tick-formatter')).toBe('26.25 (Cur)');
  });

  it('strips the "Sprint " prefix for non-current sprints', () => {
    render(
      <BugBurndownChart
        trendSprints={[
          makeTrendSprint({ sprintId: 's1', sprintName: 'Sprint 26.25', isCurrent: false }),
        ]}
      />
    );

    const chart = screen.getByTestId('bug-burndown-chart');
    expect(chart.getAttribute('data-tick-formatter')).toBe('26.25');
  });
});
