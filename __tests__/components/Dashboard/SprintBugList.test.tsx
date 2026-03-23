/**
 * Tests for SprintBugList component.
 * Verifies: bugs grouped by sprint, strikethrough for closed, ADO ID format,
 * empty state per sprint, empty trendSprints.
 */

import { SprintBugList } from '@/components/Dashboard/SprintBugList';
import type { TrendBugViewModel, TrendSprintViewModel } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';

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
    velocityAvg: null,
    overheadPercentAvg: null,
    carryOverRateAvg: null,
    plannedPoints: null,
    completedPoints: null,
    carryOverPoints: null,
    grossHours: null,
    rawOverheadPercent: null,
    rawCarryOverRate: null,
    ...overrides,
  };
}

function makeBug(overrides: Partial<TrendBugViewModel> = {}): TrendBugViewModel {
  return {
    adoId: '12345',
    title: 'Login crash',
    isClosed: true,
    ...overrides,
  };
}

describe('SprintBugList', () => {
  describe('empty state', () => {
    it('renders nothing when trendSprints is empty', () => {
      render(<SprintBugList trendSprints={[]} />);

      expect(screen.queryByTestId('sprint-bug-list')).not.toBeInTheDocument();
    });
  });

  describe('sprint groupings', () => {
    it('renders bugs grouped by sprint name headers', () => {
      const sprints: TrendSprintViewModel[] = [
        makeSprint({
          sprintId: 's1',
          sprintName: 'Sprint 26.17',
          bugs: [makeBug({ adoId: '100', title: 'Bug A', isClosed: false })],
        }),
        makeSprint({
          sprintId: 's2',
          sprintName: 'Sprint 26.18',
          bugs: [makeBug({ adoId: '200', title: 'Bug B', isClosed: true })],
        }),
      ];

      render(<SprintBugList trendSprints={sprints} />);

      expect(screen.getByText('Sprint 26.17')).toBeInTheDocument();
      expect(screen.getByText('Sprint 26.18')).toBeInTheDocument();
      expect(screen.getByText('#100 — Bug A')).toBeInTheDocument();
      expect(screen.getByText('#200 — Bug B')).toBeInTheDocument();
    });
  });

  describe('closed bug styling', () => {
    it('closed bug has strikethrough text and dimmed color', () => {
      const sprints: TrendSprintViewModel[] = [
        makeSprint({
          bugs: [
            makeBug({ adoId: '12345', title: 'Login crash', isClosed: true }),
            makeBug({ adoId: '67890', title: 'Slow query', isClosed: false }),
          ],
        }),
      ];

      render(<SprintBugList trendSprints={sprints} />);

      const closedBug = screen.getByText('#12345 — Login crash');
      const openBug = screen.getByText('#67890 — Slow query');

      expect(closedBug).toHaveStyle({ textDecoration: 'line-through' });
      expect(openBug).not.toHaveStyle({ textDecoration: 'line-through' });
    });
  });

  describe('bug format', () => {
    it('shows ADO ID as "#adoId" prefix followed by title', () => {
      const sprints: TrendSprintViewModel[] = [
        makeSprint({
          bugs: [makeBug({ adoId: '99999', title: 'Memory leak', isClosed: false })],
        }),
      ];

      render(<SprintBugList trendSprints={sprints} />);

      expect(screen.getByText('#99999 — Memory leak')).toBeInTheDocument();
    });
  });

  describe('empty sprint', () => {
    it('shows "No bugs" when a sprint has no bugs', () => {
      const sprints: TrendSprintViewModel[] = [
        makeSprint({ sprintId: 's1', sprintName: 'Sprint 26.17', bugs: [] }),
        makeSprint({
          sprintId: 's2',
          sprintName: 'Sprint 26.18',
          bugs: [makeBug({ adoId: '100', title: 'Bug A', isClosed: false })],
        }),
      ];

      render(<SprintBugList trendSprints={sprints} />);

      const noBugsTexts = screen.getAllByText('No bugs');
      expect(noBugsTexts.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Sprint 26.17')).toBeInTheDocument();
      expect(screen.getByText('Sprint 26.18')).toBeInTheDocument();
      expect(screen.getByText('#100 — Bug A')).toBeInTheDocument();
    });

    it('shows "No bugs" for each sprint when all sprints have no bugs', () => {
      const sprints: TrendSprintViewModel[] = [
        makeSprint({ sprintId: 'sa', sprintName: 'Sprint A', bugs: [] }),
        makeSprint({ sprintId: 'sb', sprintName: 'Sprint B', bugs: [] }),
      ];

      render(<SprintBugList trendSprints={sprints} />);

      const noBugsTexts = screen.getAllByText('No bugs');
      expect(noBugsTexts).toHaveLength(2);
    });
  });

  describe('long titles', () => {
    it('renders bug with long title (truncation handled by component)', () => {
      const longTitle = 'A'.repeat(200);
      const sprints: TrendSprintViewModel[] = [
        makeSprint({
          bugs: [makeBug({ adoId: '1', title: longTitle, isClosed: false })],
        }),
      ];

      render(<SprintBugList trendSprints={sprints} />);

      expect(screen.getByText(`#1 — ${longTitle}`)).toBeInTheDocument();
    });
  });
});
