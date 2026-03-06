/**
 * Tests for BurnupChart component.
 * Verifies: renders chart with correct series, empty state, single data point.
 */

import { BurnupChart } from '@/components/Dashboard/BurnupChart';
import type { ApiBurnupPoint } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';

jest.mock('@/lib/charts', () => ({
  AppAreaChart: (props: Record<string, unknown>) => (
    <div
      data-testid="burnup-area-chart"
      data-series={JSON.stringify(props.series)}
      data-points={JSON.stringify(props.data)}
      data-height={String(props.height)}
    />
  ),
}));

function makeBurnupPoint(overrides: Partial<ApiBurnupPoint> = {}): ApiBurnupPoint {
  return {
    sprintName: 'Sprint 1',
    sprintId: 's1',
    cumulativeCompletedSP: 10,
    totalSP: 20,
    ...overrides,
  };
}

const burnupData: ApiBurnupPoint[] = [
  makeBurnupPoint({
    sprintName: 'Sprint 26.17',
    sprintId: 's1',
    cumulativeCompletedSP: 5,
    totalSP: 20,
  }),
  makeBurnupPoint({
    sprintName: 'Sprint 26.18',
    sprintId: 's2',
    cumulativeCompletedSP: 12,
    totalSP: 20,
  }),
  makeBurnupPoint({
    sprintName: 'Sprint 26.19',
    sprintId: 's3',
    cumulativeCompletedSP: 18,
    totalSP: 20,
  }),
];

describe('BurnupChart', () => {
  describe('empty state', () => {
    it('returns null when burnupData is empty', () => {
      render(<BurnupChart burnupData={[]} />);

      expect(screen.queryByTestId('burnup-area-chart')).not.toBeInTheDocument();
    });
  });

  describe('renders with data', () => {
    it('renders an AreaChart when burnup data is provided', () => {
      render(<BurnupChart burnupData={burnupData} />);

      expect(screen.getByTestId('burnup-area-chart')).toBeInTheDocument();
    });

    it('maps burnupData to chart data with sprint, completedSP, totalSP', () => {
      render(<BurnupChart burnupData={burnupData} />);

      const chart = screen.getByTestId('burnup-area-chart');
      const points = JSON.parse(chart.getAttribute('data-points')!);
      expect(points).toHaveLength(3);
      expect(points[0]).toEqual({
        sprint: 'Sprint 26.17',
        completedSP: 5,
        totalSP: 20,
      });
      expect(points[1]).toEqual({
        sprint: 'Sprint 26.18',
        completedSP: 12,
        totalSP: 20,
      });
      expect(points[2]).toEqual({
        sprint: 'Sprint 26.19',
        completedSP: 18,
        totalSP: 20,
      });
    });

    it('passes correct series: Completed SP (teal.6) and Target SP (gray.4, strokeDasharray)', () => {
      render(<BurnupChart burnupData={burnupData} />);

      const chart = screen.getByTestId('burnup-area-chart');
      const series = JSON.parse(chart.getAttribute('data-series')!);
      expect(series).toEqual([
        { name: 'completedSP', label: 'Completed SP', color: 'teal.6' },
        { name: 'totalSP', label: 'Target SP', color: 'gray.4', strokeDasharray: '4 2' },
      ]);
    });

    it('uses default height of 160', () => {
      render(<BurnupChart burnupData={burnupData} />);

      const chart = screen.getByTestId('burnup-area-chart');
      expect(chart.getAttribute('data-height')).toBe('160');
    });

    it('accepts custom height prop', () => {
      render(<BurnupChart burnupData={burnupData} height={200} />);

      const chart = screen.getByTestId('burnup-area-chart');
      expect(chart.getAttribute('data-height')).toBe('200');
    });
  });

  describe('single data point', () => {
    it('renders chart with single burnup point', () => {
      const singlePoint = [
        makeBurnupPoint({ sprintName: 'Sprint 1', cumulativeCompletedSP: 8, totalSP: 10 }),
      ];

      render(<BurnupChart burnupData={singlePoint} />);

      const chart = screen.getByTestId('burnup-area-chart');
      const points = JSON.parse(chart.getAttribute('data-points')!);
      expect(points).toHaveLength(1);
      expect(points[0]).toEqual({
        sprint: 'Sprint 1',
        completedSP: 8,
        totalSP: 10,
      });
    });
  });
});
