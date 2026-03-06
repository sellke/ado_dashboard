import { VelocityTrendChart } from '@/components/Dashboard/VelocityTrendChart';
import type { TrendSprintViewModel, WorkstreamCardViewModel } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';

/**
 * Tests for VelocityTrendChart component.
 * Verifies: renders with data, empty state, reference line, prediction point.
 */

jest.mock('@/lib/charts', () => ({
  AppLineChart: (props: Record<string, unknown>) => (
    <div
      data-testid="velocity-line-chart"
      data-series={JSON.stringify(props.series)}
      data-points={JSON.stringify(props.data)}
      data-reference-lines={JSON.stringify(props.referenceLines)}
      data-height={String(props.height)}
    />
  ),
  ChartLegend: ({ items }: { items: Array<{ label: string; color: string; dashed?: boolean }> }) => (
    <div data-testid="chart-legend" data-items={JSON.stringify(items)} />
  ),
}));

function makeSprint(overrides: Partial<TrendSprintViewModel> = {}): TrendSprintViewModel {
  return {
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
    ...overrides,
  };
}

const fourSprints: TrendSprintViewModel[] = [
  makeSprint({ sprintId: 's1', sprintName: 'Sprint 26.17', rawVelocity: 38 }),
  makeSprint({ sprintId: 's2', sprintName: 'Sprint 26.18', rawVelocity: 42 }),
  makeSprint({ sprintId: 's3', sprintName: 'Sprint 26.19', rawVelocity: 45 }),
  makeSprint({ sprintId: 's4', sprintName: 'Sprint 26.20', rawVelocity: 40 }),
];

const prediction: WorkstreamCardViewModel['prediction'] = {
  velocity: '48 pts',
  rawVelocity: 48,
  velocityRate: '0.85 pts/hr',
  rawVelocityRate: 0.85,
  sprintLabel: 'Sprint 26.21',
  isPredicted: true,
};

describe('VelocityTrendChart', () => {
  describe('empty state', () => {
    it('shows "No trend data available" when trendSprints is empty', () => {
      render(<VelocityTrendChart trendSprints={[]} prediction={null} />);

      expect(screen.getByText('No trend data available')).toBeInTheDocument();
      expect(screen.queryByTestId('velocity-line-chart')).not.toBeInTheDocument();
    });
  });

  describe('renders with data', () => {
    it('renders a LineChart when trend sprints are provided', () => {
      render(<VelocityTrendChart trendSprints={fourSprints} prediction={null} />);

      expect(screen.getByTestId('velocity-line-chart')).toBeInTheDocument();
      expect(screen.queryByText('No trend data available')).not.toBeInTheDocument();
    });

    it('passes one data point per sprint to the chart', () => {
      render(<VelocityTrendChart trendSprints={fourSprints} prediction={null} />);

      const chart = screen.getByTestId('velocity-line-chart');
      const points = JSON.parse(chart.getAttribute('data-points')!);
      expect(points).toHaveLength(4);
      expect(points[0].sprint).toBe('Sprint 26.17');
      expect(points[0]['Completed Points']).toBe(38);
      expect(points[3].sprint).toBe('Sprint 26.20');
    });

    it('renders both "Completed Points" and "Forecasted" series', () => {
      render(<VelocityTrendChart trendSprints={fourSprints} prediction={null} />);

      const chart = screen.getByTestId('velocity-line-chart');
      const series = JSON.parse(chart.getAttribute('data-series')!);
      expect(series).toEqual([
        { name: 'Completed Points', color: 'blue.6' },
        { name: 'Forecasted', color: 'blue.6', strokeDasharray: '5 5' },
      ]);
    });

    it('has chart height of 200', () => {
      render(<VelocityTrendChart trendSprints={fourSprints} prediction={null} />);

      const chart = screen.getByTestId('velocity-line-chart');
      expect(chart.getAttribute('data-height')).toBe('200');
    });

    it('omits Completed Points for sprints with null rawVelocity', () => {
      const sprintsWithNull = [
        makeSprint({ sprintId: 's1', sprintName: 'Sprint 1', rawVelocity: 40 }),
        makeSprint({ sprintId: 's2', sprintName: 'Sprint 2', rawVelocity: null }),
        makeSprint({ sprintId: 's3', sprintName: 'Sprint 3', rawVelocity: 45 }),
      ];

      render(<VelocityTrendChart trendSprints={sprintsWithNull} prediction={null} />);

      const chart = screen.getByTestId('velocity-line-chart');
      const points = JSON.parse(chart.getAttribute('data-points')!);
      expect(points[1]).not.toHaveProperty('Completed Points');
      expect(points[0]['Completed Points']).toBe(40);
      expect(points[2]['Completed Points']).toBe(45);
    });
  });

  describe('prediction point', () => {
    it('appends a prediction data point with "(Forecasted)" suffix in the label', () => {
      render(<VelocityTrendChart trendSprints={fourSprints} prediction={prediction} />);

      const chart = screen.getByTestId('velocity-line-chart');
      const points = JSON.parse(chart.getAttribute('data-points')!);
      expect(points).toHaveLength(5);

      const predictionPoint = points[4];
      expect(predictionPoint.sprint).toContain('(Forecasted)');
      expect(predictionPoint.Forecasted).toBe(48);
    });

    it('bridges the last actual point to the prediction with a Forecasted value', () => {
      render(<VelocityTrendChart trendSprints={fourSprints} prediction={prediction} />);

      const chart = screen.getByTestId('velocity-line-chart');
      const points = JSON.parse(chart.getAttribute('data-points')!);
      const lastActualPoint = points[3];
      expect(lastActualPoint.Forecasted).toBe(lastActualPoint['Completed Points']);
    });

    it('renders without prediction segment when prediction is null', () => {
      render(<VelocityTrendChart trendSprints={fourSprints} prediction={null} />);

      const chart = screen.getByTestId('velocity-line-chart');
      const points = JSON.parse(chart.getAttribute('data-points')!);
      expect(points).toHaveLength(4);
      points.forEach((p: Record<string, unknown>) => {
        expect(p).not.toHaveProperty('Forecasted');
      });
    });

    it('handles null rawVelocity on prediction gracefully', () => {
      const nullPrediction: WorkstreamCardViewModel['prediction'] = {
        ...prediction,
        rawVelocity: null,
      };

      render(<VelocityTrendChart trendSprints={fourSprints} prediction={nullPrediction} />);

      const chart = screen.getByTestId('velocity-line-chart');
      const points = JSON.parse(chart.getAttribute('data-points')!);
      const predictionPoint = points[4];
      expect(predictionPoint).not.toHaveProperty('Forecasted');
    });
  });

  describe('reference line (rolling average)', () => {
    it('passes a reference line with the computed rolling average', () => {
      render(<VelocityTrendChart trendSprints={fourSprints} prediction={null} />);

      const chart = screen.getByTestId('velocity-line-chart');
      const referenceLines = JSON.parse(chart.getAttribute('data-reference-lines')!);
      // avg of 38, 42, 45, 40 = 41.25
      expect(referenceLines).toHaveLength(1);
      expect(referenceLines[0].y).toBe(41.25);
      expect(referenceLines[0].label).toMatch(/Avg: 41\.25/);
      expect(referenceLines[0].color).toBe('gray.5');
    });

    it('passes empty referenceLines when all velocities are null', () => {
      const nullSprints = [
        makeSprint({ sprintId: 's1', rawVelocity: null }),
        makeSprint({ sprintId: 's2', rawVelocity: null }),
      ];

      render(<VelocityTrendChart trendSprints={nullSprints} prediction={null} />);

      const chart = screen.getByTestId('velocity-line-chart');
      const referenceLines = JSON.parse(chart.getAttribute('data-reference-lines')!);
      expect(referenceLines).toHaveLength(0);
    });
  });
});
