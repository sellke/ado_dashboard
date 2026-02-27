/**
 * Tests for OverheadBreakdownPanel component.
 * Verifies: renders chart + tables, section header, data-testid, conditional rendering.
 */

import { createOverheadItemViewModel } from '@/__tests__/components/Dashboard/__fixtures__/dashboard-fixtures';
import { OverheadBreakdownPanel } from '@/components/Dashboard/OverheadBreakdownPanel';
import type { OverheadItemViewModel, TrendSprintViewModel } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';

jest.mock('@mantine/charts', () => ({
  LineChart: (props: Record<string, unknown>) => (
    <div
      data-testid="overhead-line-chart"
      data-series={JSON.stringify(props.series)}
      data-data={JSON.stringify(props.data)}
    />
  ),
}));

function makeTrendSprint(
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

const trendSprints: TrendSprintViewModel[] = [
  makeTrendSprint('Sprint 1'),
  makeTrendSprint('Sprint 2', { Bugs: 6 }),
];

const bugItems: OverheadItemViewModel[] = [
  createOverheadItemViewModel({ adoId: '#12345', title: 'Login crash', isClosed: true }),
];

const supportItems: OverheadItemViewModel[] = [
  createOverheadItemViewModel({ adoId: '#11111', title: 'Infra request', isClosed: false }),
];

describe('OverheadBreakdownPanel', () => {
  describe('panel structure', () => {
    it('renders data-testid="overhead-breakdown-panel"', () => {
      render(
        <OverheadBreakdownPanel
          trendSprints={trendSprints}
          bugItems={bugItems}
          supportItems={supportItems}
        />
      );
      expect(screen.getByTestId('overhead-breakdown-panel')).toBeInTheDocument();
    });

    it('renders "Overhead Breakdown" section header', () => {
      render(
        <OverheadBreakdownPanel
          trendSprints={trendSprints}
          bugItems={bugItems}
          supportItems={supportItems}
        />
      );
      expect(screen.getByText('Overhead Breakdown')).toBeInTheDocument();
    });
  });

  describe('child components', () => {
    it('renders OverheadBreakdownChart when trend sprint data is present', () => {
      render(
        <OverheadBreakdownPanel
          trendSprints={trendSprints}
          bugItems={bugItems}
          supportItems={supportItems}
        />
      );
      expect(screen.getByTestId('overhead-line-chart')).toBeInTheDocument();
    });

    it('renders CurrentSprintItemTables with bug and support sections', () => {
      render(
        <OverheadBreakdownPanel
          trendSprints={trendSprints}
          bugItems={bugItems}
          supportItems={supportItems}
        />
      );
      expect(screen.getByTestId('bug-items')).toBeInTheDocument();
      expect(screen.getByTestId('support-items')).toBeInTheDocument();
    });

    it('passes bug items to CurrentSprintItemTables', () => {
      render(
        <OverheadBreakdownPanel
          trendSprints={trendSprints}
          bugItems={bugItems}
          supportItems={supportItems}
        />
      );
      expect(screen.getByText(/Login crash/)).toBeInTheDocument();
    });

    it('passes support items to CurrentSprintItemTables', () => {
      render(
        <OverheadBreakdownPanel
          trendSprints={trendSprints}
          bugItems={bugItems}
          supportItems={supportItems}
        />
      );
      expect(screen.getByText(/Infra request/)).toBeInTheDocument();
    });

    it('shows empty state when trendSprints is empty', () => {
      render(
        <OverheadBreakdownPanel trendSprints={[]} bugItems={bugItems} supportItems={supportItems} />
      );
      expect(screen.getByText('No overhead data available')).toBeInTheDocument();
    });
  });

  describe('empty states', () => {
    it('renders panel with empty tables when items arrays are empty', () => {
      render(
        <OverheadBreakdownPanel trendSprints={trendSprints} bugItems={[]} supportItems={[]} />
      );
      expect(screen.getByTestId('overhead-breakdown-panel')).toBeInTheDocument();
      expect(screen.getByText('No bug items')).toBeInTheDocument();
      expect(screen.getByText('No support items')).toBeInTheDocument();
    });

    it('still renders panel and header even when all data is empty', () => {
      render(<OverheadBreakdownPanel trendSprints={[]} bugItems={[]} supportItems={[]} />);
      expect(screen.getByTestId('overhead-breakdown-panel')).toBeInTheDocument();
      expect(screen.getByText('Overhead Breakdown')).toBeInTheDocument();
    });
  });
});
