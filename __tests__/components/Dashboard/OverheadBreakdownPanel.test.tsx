/**
 * Tests for OverheadBreakdownPanel component.
 * Verifies: renders chart + tables, section header, data-testid, conditional rendering.
 */

import {
  createOverheadCompositionViewModel,
  createOverheadItemViewModel,
} from '@/__tests__/components/Dashboard/__fixtures__/dashboard-fixtures';
import { OverheadBreakdownPanel } from '@/components/Dashboard/OverheadBreakdownPanel';
import type { OverheadCompositionViewModel, OverheadItemViewModel } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';

jest.mock('@mantine/charts', () => ({
  BarChart: (props: Record<string, unknown>) => (
    <div
      data-testid="overhead-bar-chart"
      data-series={JSON.stringify(props.series)}
      data-data={JSON.stringify(props.data)}
    />
  ),
}));

const composition: OverheadCompositionViewModel[] = [
  createOverheadCompositionViewModel({ sprintName: 'Sprint 1' }),
  createOverheadCompositionViewModel({ sprintName: 'Sprint 2', bugHours: 6 }),
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
          composition={composition}
          bugItems={bugItems}
          supportItems={supportItems}
        />
      );
      expect(screen.getByTestId('overhead-breakdown-panel')).toBeInTheDocument();
    });

    it('renders "Overhead Breakdown" section header', () => {
      render(
        <OverheadBreakdownPanel
          composition={composition}
          bugItems={bugItems}
          supportItems={supportItems}
        />
      );
      expect(screen.getByText('Overhead Breakdown')).toBeInTheDocument();
    });
  });

  describe('child components', () => {
    it('renders OverheadCompositionChart when composition data is present', () => {
      render(
        <OverheadBreakdownPanel
          composition={composition}
          bugItems={bugItems}
          supportItems={supportItems}
        />
      );
      expect(screen.getByTestId('overhead-bar-chart')).toBeInTheDocument();
    });

    it('renders CurrentSprintItemTables with bug and support sections', () => {
      render(
        <OverheadBreakdownPanel
          composition={composition}
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
          composition={composition}
          bugItems={bugItems}
          supportItems={supportItems}
        />
      );
      expect(screen.getByText(/Login crash/)).toBeInTheDocument();
    });

    it('passes support items to CurrentSprintItemTables', () => {
      render(
        <OverheadBreakdownPanel
          composition={composition}
          bugItems={bugItems}
          supportItems={supportItems}
        />
      );
      expect(screen.getByText(/Infra request/)).toBeInTheDocument();
    });

    it('does not render OverheadCompositionChart when composition is empty', () => {
      render(
        <OverheadBreakdownPanel composition={[]} bugItems={bugItems} supportItems={supportItems} />
      );
      expect(screen.queryByTestId('overhead-bar-chart')).not.toBeInTheDocument();
    });
  });

  describe('empty states', () => {
    it('renders panel with empty tables when items arrays are empty', () => {
      render(<OverheadBreakdownPanel composition={composition} bugItems={[]} supportItems={[]} />);
      expect(screen.getByTestId('overhead-breakdown-panel')).toBeInTheDocument();
      expect(screen.getByText('No bug items')).toBeInTheDocument();
      expect(screen.getByText('No support items')).toBeInTheDocument();
    });

    it('still renders panel and header even when all data is empty', () => {
      render(<OverheadBreakdownPanel composition={[]} bugItems={[]} supportItems={[]} />);
      expect(screen.getByTestId('overhead-breakdown-panel')).toBeInTheDocument();
      expect(screen.getByText('Overhead Breakdown')).toBeInTheDocument();
    });
  });
});
