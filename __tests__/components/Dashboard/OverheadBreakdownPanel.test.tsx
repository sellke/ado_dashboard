/**
 * Tests for OverheadBreakdownPanel component.
 * Verifies: renders line chart, section header, data-testid, empty state.
 */

import { OverheadBreakdownPanel } from '@/components/Dashboard/OverheadBreakdownPanel';
import type { TrendSprintViewModel } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';

jest.mock('@/lib/charts', () => ({
  AppLineChart: (props: Record<string, unknown>) => (
    <div
      data-testid="overhead-line-chart"
      data-series={JSON.stringify(props.series)}
      data-data={JSON.stringify(props.data)}
    />
  ),
  ChartLegend: ({ items }: { items: Array<{ label: string; color: string; dashed?: boolean }> }) => (
    <div data-testid="chart-legend" data-items={JSON.stringify(items)} />
  ),
}));

function makeTrendSprint(
  sprintName: string,
  breakdown: Partial<{ Meetings: number; Spikes: number; Bugs: number; Support: number }> = {}
): TrendSprintViewModel {
  return {
    sprintId: sprintName,
    sprintName,
    isCurrent: false,
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
    velocityAvg: null,
    overheadPercentAvg: null,
    carryOverRateAvg: null,
    plannedPoints: null,
    completedPoints: null,
    carryOverPoints: null,
    grossHours: null,
    rawOverheadPercent: null,
    rawCarryOverRate: null,
  };
}

const trendSprints: TrendSprintViewModel[] = [
  makeTrendSprint('Sprint 1'),
  makeTrendSprint('Sprint 2', { Bugs: 6 }),
];

describe('OverheadBreakdownPanel', () => {
  describe('panel structure', () => {
    it('renders data-testid="overhead-breakdown-panel"', () => {
      render(<OverheadBreakdownPanel trendSprints={trendSprints} />);
      expect(screen.getByTestId('overhead-breakdown-panel')).toBeInTheDocument();
    });

    it('renders "Overhead Breakdown (Hours)" section header', () => {
      render(<OverheadBreakdownPanel trendSprints={trendSprints} />);
      expect(screen.getByText('Overhead Breakdown (Hours)')).toBeInTheDocument();
    });
  });

  describe('child components', () => {
    it('renders OverheadBreakdownChart when trend sprint data is present', () => {
      render(<OverheadBreakdownPanel trendSprints={trendSprints} />);
      expect(screen.getByTestId('overhead-line-chart')).toBeInTheDocument();
    });

    it('shows empty state when trendSprints is empty', () => {
      render(<OverheadBreakdownPanel trendSprints={[]} />);
      expect(screen.getByText('No overhead data available')).toBeInTheDocument();
    });
  });

  describe('empty states', () => {
    it('still renders panel and header even when trendSprints is empty', () => {
      render(<OverheadBreakdownPanel trendSprints={[]} />);
      expect(screen.getByTestId('overhead-breakdown-panel')).toBeInTheDocument();
      expect(screen.getByText('Overhead Breakdown (Hours)')).toBeInTheDocument();
    });
  });
});
