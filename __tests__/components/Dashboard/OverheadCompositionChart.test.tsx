import { createOverheadCompositionViewModel } from '@/__tests__/components/Dashboard/__fixtures__/dashboard-fixtures';
import { OverheadCompositionChart } from '@/components/Dashboard/OverheadCompositionChart';
import type { OverheadCompositionViewModel } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';

/**
 * Tests for OverheadCompositionChart component.
 * Verifies: renders chart, handles empty array, correct series, data mapping.
 */

jest.mock('@mantine/charts', () => ({
  BarChart: (props: Record<string, unknown>) => (
    <div
      data-testid="overhead-bar-chart"
      data-series={JSON.stringify(props.series)}
      data-data={JSON.stringify(props.data)}
      data-h={String(props.h)}
      data-with-legend={String(props.withLegend)}
      data-type={String(props.type)}
    />
  ),
}));

function makeSprint(
  overrides: Partial<OverheadCompositionViewModel> = {}
): OverheadCompositionViewModel {
  return createOverheadCompositionViewModel(overrides);
}

const fiveSprints: OverheadCompositionViewModel[] = [
  makeSprint({
    sprintName: 'Sprint 26.16',
    ceremonyHours: 8,
    bugHours: 4,
    spikeHours: 2,
    supportHours: 1,
  }),
  makeSprint({
    sprintName: 'Sprint 26.17',
    ceremonyHours: 9,
    bugHours: 3,
    spikeHours: 0,
    supportHours: 2,
  }),
  makeSprint({
    sprintName: 'Sprint 26.18',
    ceremonyHours: 10,
    bugHours: 5,
    spikeHours: 1,
    supportHours: 3,
  }),
  makeSprint({
    sprintName: 'Sprint 26.19',
    ceremonyHours: 7,
    bugHours: 2,
    spikeHours: 4,
    supportHours: 0,
  }),
  makeSprint({
    sprintName: 'Sprint 26.20',
    ceremonyHours: 11,
    bugHours: 6,
    spikeHours: 2,
    supportHours: 2,
  }),
];

describe('OverheadCompositionChart', () => {
  describe('empty state', () => {
    it('renders nothing when composition is empty', () => {
      render(<OverheadCompositionChart composition={[]} />);
      expect(screen.queryByTestId('overhead-bar-chart')).not.toBeInTheDocument();
    });
  });

  describe('renders with data', () => {
    it('renders a BarChart when composition data is provided', () => {
      render(<OverheadCompositionChart composition={fiveSprints} />);
      expect(screen.getByTestId('overhead-bar-chart')).toBeInTheDocument();
    });

    it('passes one data point per sprint (5 sprints → 5 bars)', () => {
      render(<OverheadCompositionChart composition={fiveSprints} />);

      const chart = screen.getByTestId('overhead-bar-chart');
      const data = JSON.parse(chart.getAttribute('data-data')!);
      expect(data).toHaveLength(5);
    });

    it('maps OverheadCompositionViewModel to correct BarChart data keys', () => {
      render(<OverheadCompositionChart composition={fiveSprints} />);

      const chart = screen.getByTestId('overhead-bar-chart');
      const data = JSON.parse(chart.getAttribute('data-data')!);

      expect(data[0]).toMatchObject({
        sprint: 'Sprint 26.16',
        Ceremony: 8,
        Bugs: 4,
        Spikes: 2,
        Support: 1,
      });
      expect(data[4]).toMatchObject({
        sprint: 'Sprint 26.20',
        Ceremony: 11,
        Bugs: 6,
        Spikes: 2,
        Support: 2,
      });
    });

    it('includes zero-value bug hours in the data point (not omitted)', () => {
      const sprintWithZeroBugs = makeSprint({ sprintName: 'Sprint 1', bugHours: 0 });
      render(<OverheadCompositionChart composition={[sprintWithZeroBugs]} />);

      const chart = screen.getByTestId('overhead-bar-chart');
      const data = JSON.parse(chart.getAttribute('data-data')!);
      expect(data[0].Bugs).toBe(0);
    });
  });

  describe('series configuration', () => {
    it('renders four series: Ceremony, Bugs, Spikes, Support', () => {
      render(<OverheadCompositionChart composition={fiveSprints} />);

      const chart = screen.getByTestId('overhead-bar-chart');
      const series = JSON.parse(chart.getAttribute('data-series')!);

      expect(series).toHaveLength(4);
      const names = series.map((s: { name: string }) => s.name);
      expect(names).toEqual(['Ceremony', 'Bugs', 'Spikes', 'Support']);
    });

    it('assigns distinct colors to each series', () => {
      render(<OverheadCompositionChart composition={fiveSprints} />);

      const chart = screen.getByTestId('overhead-bar-chart');
      const series = JSON.parse(chart.getAttribute('data-series')!);

      const colors = series.map((s: { color: string }) => s.color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(4);
    });
  });

  describe('chart configuration', () => {
    it('has chart height of 200', () => {
      render(<OverheadCompositionChart composition={fiveSprints} />);

      const chart = screen.getByTestId('overhead-bar-chart');
      expect(chart.getAttribute('data-h')).toBe('200');
    });

    it('renders with a legend', () => {
      render(<OverheadCompositionChart composition={fiveSprints} />);

      const chart = screen.getByTestId('overhead-bar-chart');
      expect(chart.getAttribute('data-with-legend')).toBe('true');
    });

    it('uses stacked type', () => {
      render(<OverheadCompositionChart composition={fiveSprints} />);

      const chart = screen.getByTestId('overhead-bar-chart');
      expect(chart.getAttribute('data-type')).toBe('stacked');
    });
  });
});
