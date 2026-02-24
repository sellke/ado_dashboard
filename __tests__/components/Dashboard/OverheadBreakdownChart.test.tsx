import { OverheadBreakdownChart } from '@/components/Dashboard/OverheadBreakdownChart';
import type { TrendSprintViewModel } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';

/**
 * Tests for OverheadBreakdownChart component.
 * Verifies: renders with data, empty state, zero-only state, chart series, data transformation.
 */

jest.mock('@mantine/charts', () => ({
  LineChart: (props: Record<string, unknown>) => (
    <div
      data-testid="overhead-line-chart"
      data-series={JSON.stringify(props.series)}
      data-points={JSON.stringify(props.data)}
      data-h={String(props.h)}
    />
  ),
}));

function makeSprint(
  sprintName: string,
  breakdown: Partial<{ Meetings: number; Spikes: number; Bugs: number; Support: number }> = {}
): TrendSprintViewModel {
  return {
    sprintId: sprintName,
    sprintName,
    velocity: '40 pts',
    velocityRate: '0.67 pts/hr',
    activeBugs: '2',
    bugsClosed: '3',
    rawVelocity: 40,
    rawVelocityRate: 0.67,
    rawActiveBugs: 2,
    rawBugsClosed: 3,
    bugs: [],
    overheadBreakdown: [
      { category: 'Meetings', hours: breakdown.Meetings ?? 10.25 },
      { category: 'Spikes', hours: breakdown.Spikes ?? 4 },
      { category: 'Bugs', hours: breakdown.Bugs ?? 5 },
      { category: 'Support', hours: breakdown.Support ?? 3 },
    ],
  };
}

const twoSprints: TrendSprintViewModel[] = [
  makeSprint('Sprint 26.17', { Meetings: 10.25, Spikes: 4, Bugs: 5, Support: 3 }),
  makeSprint('Sprint 26.18', { Meetings: 10.25, Spikes: 2, Bugs: 6, Support: 2 }),
];

describe('OverheadBreakdownChart', () => {
  describe('empty state', () => {
    it('shows "No overhead data available" when trendSprints is empty', () => {
      render(<OverheadBreakdownChart trendSprints={[]} />);

      expect(screen.getByText('No overhead data available')).toBeInTheDocument();
      expect(screen.queryByTestId('overhead-line-chart')).not.toBeInTheDocument();
    });

    it('shows "No overhead data available" when all overhead hours are zero', () => {
      const zeroSprints: TrendSprintViewModel[] = [
        {
          sprintId: 's1',
          sprintName: 'Sprint 1',
          velocity: '40 pts',
          velocityRate: '0.67 pts/hr',
          activeBugs: '2',
          bugsClosed: '3',
          rawVelocity: 40,
          rawVelocityRate: 0.67,
          rawActiveBugs: 2,
          rawBugsClosed: 3,
          bugs: [],
          overheadBreakdown: [
            { category: 'Meetings', hours: 0 },
            { category: 'Spikes', hours: 0 },
            { category: 'Bugs', hours: 0 },
            { category: 'Support', hours: 0 },
          ],
        },
      ];

      render(<OverheadBreakdownChart trendSprints={zeroSprints} />);

      expect(screen.getByText('No overhead data available')).toBeInTheDocument();
      expect(screen.queryByTestId('overhead-line-chart')).not.toBeInTheDocument();
    });

    it('shows "No overhead data available" when overheadBreakdown arrays are empty', () => {
      const emptyBreakdownSprints: TrendSprintViewModel[] = [
        {
          sprintId: 's1',
          sprintName: 'Sprint 1',
          velocity: '40 pts',
          velocityRate: '0.67 pts/hr',
          activeBugs: '2',
          bugsClosed: '3',
          rawVelocity: 40,
          rawVelocityRate: 0.67,
          rawActiveBugs: 2,
          rawBugsClosed: 3,
          bugs: [],
          overheadBreakdown: [],
        },
      ];

      render(<OverheadBreakdownChart trendSprints={emptyBreakdownSprints} />);

      expect(screen.getByText('No overhead data available')).toBeInTheDocument();
    });
  });

  describe('renders with data', () => {
    it('renders a LineChart when overhead data is present', () => {
      render(<OverheadBreakdownChart trendSprints={twoSprints} />);

      expect(screen.getByTestId('overhead-line-chart')).toBeInTheDocument();
      expect(screen.queryByText('No overhead data available')).not.toBeInTheDocument();
    });

    it('passes one data point per sprint to the chart', () => {
      render(<OverheadBreakdownChart trendSprints={twoSprints} />);

      const chart = screen.getByTestId('overhead-line-chart');
      const points = JSON.parse(chart.getAttribute('data-points')!);
      expect(points).toHaveLength(2);
      expect(points[0].sprint).toBe('Sprint 26.17');
      expect(points[1].sprint).toBe('Sprint 26.18');
    });

    it('maps all 4 overhead categories onto each data point', () => {
      render(<OverheadBreakdownChart trendSprints={twoSprints} />);

      const chart = screen.getByTestId('overhead-line-chart');
      const points = JSON.parse(chart.getAttribute('data-points')!);
      expect(points[0]).toMatchObject({
        sprint: 'Sprint 26.17',
        Meetings: 10.25,
        Spikes: 4,
        Bugs: 5,
        Support: 3,
      });
      expect(points[1]).toMatchObject({
        sprint: 'Sprint 26.18',
        Meetings: 10.25,
        Spikes: 2,
        Bugs: 6,
        Support: 2,
      });
    });

    it('defaults missing categories to 0 on data points', () => {
      const sparseBreakdown: TrendSprintViewModel[] = [
        {
          sprintId: 's1',
          sprintName: 'Sprint 1',
          velocity: '40 pts',
          velocityRate: '0.67 pts/hr',
          activeBugs: '2',
          bugsClosed: '3',
          rawVelocity: 40,
          rawVelocityRate: 0.67,
          rawActiveBugs: 2,
          rawBugsClosed: 3,
          bugs: [],
          overheadBreakdown: [{ category: 'Bugs', hours: 8 }],
        },
      ];

      render(<OverheadBreakdownChart trendSprints={sparseBreakdown} />);

      const chart = screen.getByTestId('overhead-line-chart');
      const points = JSON.parse(chart.getAttribute('data-points')!);
      expect(points[0].Meetings).toBe(0);
      expect(points[0].Spikes).toBe(0);
      expect(points[0].Bugs).toBe(8);
      expect(points[0].Support).toBe(0);
    });

    it('has chart height of 200', () => {
      render(<OverheadBreakdownChart trendSprints={twoSprints} />);

      const chart = screen.getByTestId('overhead-line-chart');
      expect(chart.getAttribute('data-h')).toBe('200');
    });
  });

  describe('series configuration', () => {
    it('renders exactly 4 series: Meetings, Spikes, Bugs, Support', () => {
      render(<OverheadBreakdownChart trendSprints={twoSprints} />);

      const chart = screen.getByTestId('overhead-line-chart');
      const series = JSON.parse(chart.getAttribute('data-series')!) as Array<{
        name: string;
        color: string;
      }>;
      expect(series).toHaveLength(4);
      expect(series.map((s) => s.name)).toEqual(['Meetings', 'Spikes', 'Bugs', 'Support']);
    });

    it('uses distinct colors for each series', () => {
      render(<OverheadBreakdownChart trendSprints={twoSprints} />);

      const chart = screen.getByTestId('overhead-line-chart');
      const series = JSON.parse(chart.getAttribute('data-series')!) as Array<{
        name: string;
        color: string;
      }>;
      const colors = series.map((s) => s.color);
      expect(new Set(colors).size).toBe(4);
    });
  });
});
