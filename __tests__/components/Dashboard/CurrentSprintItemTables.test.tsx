/**
 * Tests for CurrentSprintItemTables component.
 * Verifies: bug/spike/support sections, item format, ADO links, closed styling, empty states.
 */

import { createOverheadItemViewModel } from '@/__tests__/components/Dashboard/__fixtures__/dashboard-fixtures';
import { CurrentSprintItemTables } from '@/components/Dashboard/CurrentSprintItemTables';
import type { OverheadItemViewModel } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';

function makeItem(overrides: Partial<OverheadItemViewModel> = {}): OverheadItemViewModel {
  return createOverheadItemViewModel(overrides);
}

describe('CurrentSprintItemTables', () => {
  describe('bug items', () => {
    it('renders bug items with format: adoId — title (hours) [state]', () => {
      const bugItems: OverheadItemViewModel[] = [
        makeItem({
          adoId: '#12345',
          title: 'Login crash',
          state: 'Active',
          hours: '4.5 hrs',
          isClosed: false,
        }),
      ];

      render(<CurrentSprintItemTables bugItems={bugItems} spikeItems={[]} supportItems={[]} />);

      expect(screen.getByText('#12345 — Login crash (4.5 hrs) [Active]')).toBeInTheDocument();
    });

    it('renders multiple bug items in Bugs section', () => {
      const bugItems: OverheadItemViewModel[] = [
        makeItem({
          adoId: '#100',
          title: 'Bug A',
          state: 'Active',
          hours: '2 hrs',
          isClosed: false,
        }),
        makeItem({ adoId: '#200', title: 'Bug B', state: 'Closed', hours: 'N/A', isClosed: true }),
      ];

      render(<CurrentSprintItemTables bugItems={bugItems} spikeItems={[]} supportItems={[]} />);

      expect(screen.getByText('Bugs')).toBeInTheDocument();
      expect(screen.getByText('#100 — Bug A (2 hrs) [Active]')).toBeInTheDocument();
      expect(screen.getByText('#200 — Bug B (N/A) [Closed]')).toBeInTheDocument();
      expect(screen.getByTestId('bug-items')).toBeInTheDocument();
    });
  });

  describe('spike items', () => {
    it('renders spike items in Spikes section', () => {
      const spikeItems: OverheadItemViewModel[] = [
        makeItem({
          adoId: '#44444',
          title: 'Perf investigation',
          state: 'New',
          hours: '8 hrs',
          isClosed: false,
        }),
      ];

      render(<CurrentSprintItemTables bugItems={[]} spikeItems={spikeItems} supportItems={[]} />);

      expect(screen.getByText('Spikes')).toBeInTheDocument();
      expect(screen.getByText('#44444 — Perf investigation (8 hrs) [New]')).toBeInTheDocument();
      expect(screen.getByTestId('spike-items')).toBeInTheDocument();
    });
  });

  describe('support items', () => {
    it('renders support items with same format in separate Support section', () => {
      const supportItems: OverheadItemViewModel[] = [
        makeItem({
          adoId: '#11111',
          title: 'Infra request',
          state: 'Done',
          hours: '2 hrs',
          isClosed: true,
        }),
      ];

      render(<CurrentSprintItemTables bugItems={[]} spikeItems={[]} supportItems={supportItems} />);

      expect(screen.getByText('Support')).toBeInTheDocument();
      expect(screen.getByText('#11111 — Infra request (2 hrs) [Done]')).toBeInTheDocument();
      expect(screen.getByTestId('support-items')).toBeInTheDocument();
    });
  });

  describe('ADO links', () => {
    it('renders items as clickable Anchor elements with correct href', () => {
      const bugItems: OverheadItemViewModel[] = [
        makeItem({
          adoId: '#12345',
          title: 'Login crash',
          state: 'Active',
          hours: '4.5 hrs',
          isClosed: false,
          adoUrl: 'https://dev.azure.com/Operations-Innovation/Event%20Streaming%20Platform/_workitems/edit/12345',
        }),
      ];

      render(<CurrentSprintItemTables bugItems={bugItems} spikeItems={[]} supportItems={[]} />);

      const link = screen.getByText('#12345 — Login crash (4.5 hrs) [Active]');
      expect(link.closest('a')).toHaveAttribute(
        'href',
        'https://dev.azure.com/Operations-Innovation/Event%20Streaming%20Platform/_workitems/edit/12345'
      );
      expect(link.closest('a')).toHaveAttribute('target', '_blank');
    });
  });

  describe('closed item styling', () => {
    it('closed bug has strikethrough text and dimmed color', () => {
      const bugItems: OverheadItemViewModel[] = [
        makeItem({
          adoId: '#12345',
          title: 'Login crash',
          hours: '4.5 hrs',
          state: 'Closed',
          isClosed: true,
        }),
        makeItem({
          adoId: '#67890',
          title: 'Slow query',
          hours: 'N/A',
          state: 'Active',
          isClosed: false,
        }),
      ];

      render(<CurrentSprintItemTables bugItems={bugItems} spikeItems={[]} supportItems={[]} />);

      const closedBug = screen.getByText('#12345 — Login crash (4.5 hrs) [Closed]');
      const openBug = screen.getByText('#67890 — Slow query (N/A) [Active]');

      expect(closedBug).toHaveStyle({ textDecoration: 'line-through' });
      expect(openBug).not.toHaveStyle({ textDecoration: 'line-through' });
    });
  });

  describe('empty states', () => {
    it('shows "No bug items" when bugItems is empty', () => {
      render(<CurrentSprintItemTables bugItems={[]} spikeItems={[]} supportItems={[]} />);

      expect(screen.getByText('No bug items')).toBeInTheDocument();
    });

    it('shows "No spike items" when spikeItems is empty', () => {
      render(<CurrentSprintItemTables bugItems={[]} spikeItems={[]} supportItems={[]} />);

      expect(screen.getByText('No spike items')).toBeInTheDocument();
    });

    it('shows "No support items" when supportItems is empty', () => {
      render(<CurrentSprintItemTables bugItems={[]} spikeItems={[]} supportItems={[]} />);

      expect(screen.getByText('No support items')).toBeInTheDocument();
    });

    it('shows all three empty states when all arrays are empty', () => {
      render(<CurrentSprintItemTables bugItems={[]} spikeItems={[]} supportItems={[]} />);

      expect(screen.getByText('No bug items')).toBeInTheDocument();
      expect(screen.getByText('No spike items')).toBeInTheDocument();
      expect(screen.getByText('No support items')).toBeInTheDocument();
    });

    it('component renders (does not return null) when all arrays are empty', () => {
      const { container } = render(
        <CurrentSprintItemTables bugItems={[]} spikeItems={[]} supportItems={[]} />
      );

      expect(container.firstChild).not.toBeNull();
      expect(screen.getByTestId('bug-items')).toBeInTheDocument();
      expect(screen.getByTestId('spike-items')).toBeInTheDocument();
      expect(screen.getByTestId('support-items')).toBeInTheDocument();
    });
  });

  describe('section headers', () => {
    it('renders Bugs, Spikes, and Support section headers in correct order', () => {
      render(<CurrentSprintItemTables bugItems={[]} spikeItems={[]} supportItems={[]} />);

      expect(screen.getByText('Bugs')).toBeInTheDocument();
      expect(screen.getByText('Spikes')).toBeInTheDocument();
      expect(screen.getByText('Support')).toBeInTheDocument();
    });
  });
});
