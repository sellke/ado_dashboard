/**
 * Tests for OverheadBreakdownPanel component.
 * Verifies: renders chart + tables, section header, data-testid, sprint selection, conditional rendering.
 */

import { createOverheadItemViewModel } from '@/__tests__/components/Dashboard/__fixtures__/dashboard-fixtures';
import { OverheadBreakdownPanel } from '@/components/Dashboard/OverheadBreakdownPanel';
import type { OverheadSprintViewModel, TrendSprintViewModel } from '@/lib/dashboard/types';
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

const overheadItemsBySprint: OverheadSprintViewModel[] = [
  {
    sprintId: 'Sprint 1',
    bugs: [createOverheadItemViewModel({ adoId: '#12345', title: 'Login crash', isClosed: true })],
    spikes: [createOverheadItemViewModel({ adoId: '#55555', title: 'Perf spike', isClosed: false })],
    support: [createOverheadItemViewModel({ adoId: '#11111', title: 'Infra request', isClosed: false })],
  },
  {
    sprintId: 'Sprint 2',
    bugs: [createOverheadItemViewModel({ adoId: '#22222', title: 'Sprint 2 Bug', isClosed: false })],
    spikes: [],
    support: [],
  },
];

describe('OverheadBreakdownPanel', () => {
  describe('panel structure', () => {
    it('renders data-testid="overhead-breakdown-panel"', () => {
      render(
        <OverheadBreakdownPanel
          trendSprints={trendSprints}
          overheadItemsBySprint={overheadItemsBySprint}
          activeSprintId="Sprint 1"
        />
      );
      expect(screen.getByTestId('overhead-breakdown-panel')).toBeInTheDocument();
    });

    it('renders "Overhead Breakdown (Hours)" section header', () => {
      render(
        <OverheadBreakdownPanel
          trendSprints={trendSprints}
          overheadItemsBySprint={overheadItemsBySprint}
          activeSprintId="Sprint 1"
        />
      );
      expect(screen.getByText('Overhead Breakdown (Hours)')).toBeInTheDocument();
    });
  });

  describe('sprint selection', () => {
    it('renders items for the selected sprint', () => {
      render(
        <OverheadBreakdownPanel
          trendSprints={trendSprints}
          overheadItemsBySprint={overheadItemsBySprint}
          activeSprintId="Sprint 1"
        />
      );
      expect(screen.getByText(/Login crash/)).toBeInTheDocument();
      expect(screen.getByText(/Perf spike/)).toBeInTheDocument();
      expect(screen.getByText(/Infra request/)).toBeInTheDocument();
    });

    it('renders items for a different selected sprint', () => {
      render(
        <OverheadBreakdownPanel
          trendSprints={trendSprints}
          overheadItemsBySprint={overheadItemsBySprint}
          activeSprintId="Sprint 2"
        />
      );
      expect(screen.getByText(/Sprint 2 Bug/)).toBeInTheDocument();
      expect(screen.queryByText(/Login crash/)).not.toBeInTheDocument();
    });

    it('renders empty states when activeSprintId has no match', () => {
      render(
        <OverheadBreakdownPanel
          trendSprints={trendSprints}
          overheadItemsBySprint={overheadItemsBySprint}
          activeSprintId="nonexistent"
        />
      );
      expect(screen.getByText('No bug items')).toBeInTheDocument();
      expect(screen.getByText('No spike items')).toBeInTheDocument();
      expect(screen.getByText('No support items')).toBeInTheDocument();
    });
  });

  describe('child components', () => {
    it('renders OverheadBreakdownChart when trend sprint data is present', () => {
      render(
        <OverheadBreakdownPanel
          trendSprints={trendSprints}
          overheadItemsBySprint={overheadItemsBySprint}
          activeSprintId="Sprint 1"
        />
      );
      expect(screen.getByTestId('overhead-line-chart')).toBeInTheDocument();
    });

    it('renders CurrentSprintItemTables with bug, spike, and support sections', () => {
      render(
        <OverheadBreakdownPanel
          trendSprints={trendSprints}
          overheadItemsBySprint={overheadItemsBySprint}
          activeSprintId="Sprint 1"
        />
      );
      expect(screen.getByTestId('bug-items')).toBeInTheDocument();
      expect(screen.getByTestId('spike-items')).toBeInTheDocument();
      expect(screen.getByTestId('support-items')).toBeInTheDocument();
    });

    it('shows empty state when trendSprints is empty', () => {
      render(
        <OverheadBreakdownPanel
          trendSprints={[]}
          overheadItemsBySprint={overheadItemsBySprint}
          activeSprintId="Sprint 1"
        />
      );
      expect(screen.getByText('No overhead data available')).toBeInTheDocument();
    });
  });

  describe('empty states', () => {
    it('renders panel with empty tables when items arrays are empty', () => {
      render(
        <OverheadBreakdownPanel
          trendSprints={trendSprints}
          overheadItemsBySprint={[{ sprintId: 'Sprint 1', bugs: [], spikes: [], support: [] }]}
          activeSprintId="Sprint 1"
        />
      );
      expect(screen.getByTestId('overhead-breakdown-panel')).toBeInTheDocument();
      expect(screen.getByText('No bug items')).toBeInTheDocument();
      expect(screen.getByText('No spike items')).toBeInTheDocument();
      expect(screen.getByText('No support items')).toBeInTheDocument();
    });

    it('still renders panel and header even when all data is empty', () => {
      render(
        <OverheadBreakdownPanel
          trendSprints={[]}
          overheadItemsBySprint={[]}
          activeSprintId=""
        />
      );
      expect(screen.getByTestId('overhead-breakdown-panel')).toBeInTheDocument();
      expect(screen.getByText('Overhead Breakdown (Hours)')).toBeInTheDocument();
    });
  });
});
