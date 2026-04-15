/**
 * Tests for SprintBugList component.
 * Verifies: sprint filtering (activeSprintId / isCurrent fallback), open/closed sections,
 * clickable ADO links, empty states, null render when no trend sprints.
 */

import { SprintBugList } from '@/components/Dashboard/SprintBugList';
import type { TrendBugViewModel, TrendSprintViewModel } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';

const ADO_BASE = 'https://dev.azure.com/Operations-Innovation/Event%20Streaming%20Platform/_workitems/edit';

function makeBug(overrides: Partial<TrendBugViewModel> = {}): TrendBugViewModel {
  return {
    adoId: '12345',
    title: 'Login crash',
    isClosed: false,
    adoUrl: `${ADO_BASE}/12345`,
    ...overrides,
  };
}

function makeSprint(overrides: Partial<TrendSprintViewModel> = {}): TrendSprintViewModel {
  return {
    sprintId: 's1',
    sprintName: 'Sprint 1',
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

describe('SprintBugList', () => {
  describe('empty state', () => {
    it('renders nothing when trendSprints is empty', () => {
      render(<SprintBugList trendSprints={[]} />);
      expect(screen.queryByTestId('sprint-bug-list')).not.toBeInTheDocument();
    });
  });

  describe('sprint filtering', () => {
    it('shows bugs for the matching activeSprintId', () => {
      const sprints = [
        makeSprint({ sprintId: 's1', bugs: [makeBug({ adoId: '100', title: 'Bug A' })] }),
        makeSprint({ sprintId: 's2', bugs: [makeBug({ adoId: '200', title: 'Bug B' })] }),
      ];

      render(<SprintBugList trendSprints={sprints} activeSprintId="s2" />);

      expect(screen.getByText('Bug B')).toBeInTheDocument();
      expect(screen.queryByText('Bug A')).not.toBeInTheDocument();
    });

    it('falls back to isCurrent sprint when no activeSprintId is given', () => {
      const sprints = [
        makeSprint({ sprintId: 's1', isCurrent: false, bugs: [makeBug({ adoId: '100', title: 'Past Bug' })] }),
        makeSprint({ sprintId: 's2', isCurrent: true, bugs: [makeBug({ adoId: '200', title: 'Current Bug' })] }),
      ];

      render(<SprintBugList trendSprints={sprints} />);

      expect(screen.getByText('Current Bug')).toBeInTheDocument();
      expect(screen.queryByText('Past Bug')).not.toBeInTheDocument();
    });

    it('falls back to the last sprint when no activeSprintId and no isCurrent sprint', () => {
      const sprints = [
        makeSprint({ sprintId: 's1', bugs: [makeBug({ adoId: '100', title: 'First Bug' })] }),
        makeSprint({ sprintId: 's2', bugs: [makeBug({ adoId: '200', title: 'Last Bug' })] }),
      ];

      render(<SprintBugList trendSprints={sprints} />);

      expect(screen.getByText('Last Bug')).toBeInTheDocument();
      expect(screen.queryByText('First Bug')).not.toBeInTheDocument();
    });

    it('falls back to isCurrent when activeSprintId does not match any sprint', () => {
      const sprints = [
        makeSprint({ sprintId: 's1', isCurrent: true, bugs: [makeBug({ adoId: '100', title: 'Current Bug' })] }),
      ];

      render(<SprintBugList trendSprints={sprints} activeSprintId="nonexistent" />);

      expect(screen.getByText('Current Bug')).toBeInTheDocument();
    });
  });

  describe('open / closed sections', () => {
    it('renders Open and Closed section headers', () => {
      const sprints = [
        makeSprint({
          sprintId: 's1',
          bugs: [
            makeBug({ adoId: '1', title: 'Open bug', isClosed: false }),
            makeBug({ adoId: '2', title: 'Closed bug', isClosed: true, adoUrl: `${ADO_BASE}/2` }),
          ],
        }),
      ];

      render(<SprintBugList trendSprints={sprints} activeSprintId="s1" />);

      expect(screen.getByText('Open')).toBeInTheDocument();
      expect(screen.getByText('Closed')).toBeInTheDocument();
    });

    it('places open bugs under Open section and closed bugs under Closed section', () => {
      const sprints = [
        makeSprint({
          bugs: [
            makeBug({ adoId: '1', title: 'Open Bug', isClosed: false }),
            makeBug({ adoId: '2', title: 'Closed Bug', isClosed: true, adoUrl: `${ADO_BASE}/2` }),
          ],
        }),
      ];

      render(<SprintBugList trendSprints={sprints} />);

      expect(screen.getByText('Open Bug')).toBeInTheDocument();
      expect(screen.getByText('Closed Bug')).toBeInTheDocument();
    });

    it('shows "No open bugs" empty state when there are no open bugs', () => {
      const sprints = [
        makeSprint({
          bugs: [makeBug({ adoId: '1', title: 'Closed Bug', isClosed: true })],
        }),
      ];

      render(<SprintBugList trendSprints={sprints} />);

      expect(screen.getByText('No open bugs')).toBeInTheDocument();
      expect(screen.getByText('Closed Bug')).toBeInTheDocument();
    });

    it('shows "No closed bugs" empty state when there are no closed bugs', () => {
      const sprints = [
        makeSprint({
          bugs: [makeBug({ adoId: '1', title: 'Open Bug', isClosed: false })],
        }),
      ];

      render(<SprintBugList trendSprints={sprints} />);

      expect(screen.getByText('No closed bugs')).toBeInTheDocument();
      expect(screen.getByText('Open Bug')).toBeInTheDocument();
    });

    it('shows both empty states when sprint has no bugs', () => {
      const sprints = [makeSprint({ bugs: [] })];

      render(<SprintBugList trendSprints={sprints} />);

      expect(screen.getByText('No open bugs')).toBeInTheDocument();
      expect(screen.getByText('No closed bugs')).toBeInTheDocument();
    });

    it('shows count badges for open and closed sections', () => {
      const sprints = [
        makeSprint({
          bugs: [
            makeBug({ adoId: '1', isClosed: false }),
            makeBug({ adoId: '2', isClosed: false, adoUrl: `${ADO_BASE}/2` }),
            makeBug({ adoId: '3', isClosed: true, adoUrl: `${ADO_BASE}/3` }),
          ],
        }),
      ];

      render(<SprintBugList trendSprints={sprints} />);

      const badges = screen.getAllByText(/^\d+$/);
      const badgeValues = badges.map((b) => b.textContent);
      expect(badgeValues).toContain('2');
      expect(badgeValues).toContain('1');
    });
  });

  describe('clickable links', () => {
    it('renders each bug as an anchor linking to its ADO URL', () => {
      const sprints = [
        makeSprint({
          bugs: [
            makeBug({ adoId: '42', title: 'Auth crash', adoUrl: `${ADO_BASE}/42`, isClosed: false }),
          ],
        }),
      ];

      render(<SprintBugList trendSprints={sprints} />);

      const link = screen.getByRole('link', { name: /Open Auth crash in Azure DevOps/ });
      expect(link).toHaveAttribute('href', `${ADO_BASE}/42`);
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('applies strikethrough styling to closed bug rows', () => {
      const sprints = [
        makeSprint({
          bugs: [
            makeBug({ adoId: '1', title: 'Closed Bug', isClosed: true }),
          ],
        }),
      ];

      render(<SprintBugList trendSprints={sprints} />);

      const link = screen.getByRole('link', { name: /Open Closed Bug in Azure DevOps/ });
      expect(link).toHaveStyle({ textDecoration: 'line-through' });
    });

    it('does not apply strikethrough to open bug rows', () => {
      const sprints = [
        makeSprint({
          bugs: [makeBug({ adoId: '1', title: 'Open Bug', isClosed: false })],
        }),
      ];

      render(<SprintBugList trendSprints={sprints} />);

      const link = screen.getByRole('link', { name: /Open Open Bug in Azure DevOps/ });
      expect(link).not.toHaveStyle({ textDecoration: 'line-through' });
    });
  });
});
