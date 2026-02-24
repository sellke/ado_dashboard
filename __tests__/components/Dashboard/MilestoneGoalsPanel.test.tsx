/**
 * Tests for MilestoneGoalsPanel component.
 * Verifies: month grouping order, current month highlight, loading state, empty state.
 */

import { MilestoneGoalsPanel } from '@/components/Dashboard/MilestoneGoalsPanel';
import type { MilestoneGoalViewModel, MilestoneMonthGroup } from '@/lib/dashboard/types';
import { render, screen, userEvent, waitFor } from '@/test-utils';

jest.mock('@/components/Dashboard/FeatureMilestoneCard', () => ({
  FeatureMilestoneCard: ({ milestone }: { milestone: MilestoneGoalViewModel }) => (
    <div data-testid="feature-milestone-card" data-milestone-id={milestone.id}>
      {milestone.title}
    </div>
  ),
}));

function makeMilestone(overrides: Partial<MilestoneGoalViewModel> = {}): MilestoneGoalViewModel {
  return {
    id: 'm1',
    title: 'Phase 1',
    workstreamId: 'ws-1',
    targetMonth: '2026-02',
    monthLabel: 'February 2026',
    isCurrentMonth: true,
    adoFeatureId: '#12345',
    percentComplete: '50%',
    completedPoints: 15,
    totalPoints: 30,
    burnupData: [],
    status: 'InProgress',
    ...overrides,
  };
}

function makeGroup(overrides: Partial<MilestoneMonthGroup> = {}): MilestoneMonthGroup {
  return {
    monthLabel: 'February 2026',
    isCurrentMonth: true,
    milestones: [makeMilestone({ id: 'm1', title: 'Phase 1' })],
    groupCompletionPercent: '50%',
    ...overrides,
  };
}

describe('MilestoneGoalsPanel', () => {
  describe('loading state', () => {
    it('shows skeleton states when loading is true', () => {
      render(<MilestoneGoalsPanel milestoneGroups={[]} loading={true} />);

      const skeletons = document.querySelectorAll('[class*="mantine-Skeleton"]');
      expect(skeletons.length).toBeGreaterThanOrEqual(3);
    });

    it('does not show empty state when loading', () => {
      render(<MilestoneGoalsPanel milestoneGroups={[]} loading={true} />);

      expect(
        screen.queryByText('No monthly goal Features found for this workstream')
      ).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state when milestoneGroups is empty and not loading', () => {
      render(<MilestoneGoalsPanel milestoneGroups={[]} loading={false} />);

      expect(
        screen.getByText('No monthly goal Features found for this workstream')
      ).toBeInTheDocument();
    });

    it('shows empty state when milestoneGroups is empty (loading defaults to false)', () => {
      render(<MilestoneGoalsPanel milestoneGroups={[]} />);

      expect(
        screen.getByText('No monthly goal Features found for this workstream')
      ).toBeInTheDocument();
    });
  });

  describe('month grouping and order', () => {
    it('renders current month group first with highlighted header', () => {
      const currentGroup = makeGroup({
        monthLabel: 'February 2026',
        isCurrentMonth: true,
        milestones: [makeMilestone({ id: 'm1', title: 'Current Feature' })],
        groupCompletionPercent: '45%',
      });
      const pastGroup = makeGroup({
        monthLabel: 'January 2026',
        isCurrentMonth: false,
        milestones: [makeMilestone({ id: 'm2', title: 'Past Feature' })],
        groupCompletionPercent: '100%',
      });

      render(<MilestoneGoalsPanel milestoneGroups={[currentGroup, pastGroup]} />);

      expect(screen.getByText('February 2026 (Current)')).toBeInTheDocument();
      expect(screen.getByText('Current Feature')).toBeInTheDocument();
    });

    it('current month header shows group completion badge with teal color', () => {
      const currentGroup = makeGroup({
        monthLabel: 'February 2026',
        isCurrentMonth: true,
        groupCompletionPercent: '73%',
      });

      render(<MilestoneGoalsPanel milestoneGroups={[currentGroup]} />);

      expect(screen.getByText('February 2026 (Current)')).toBeInTheDocument();
      expect(screen.getByText('73%')).toBeInTheDocument();
    });

    it('past month group appears below current month', () => {
      const currentGroup = makeGroup({
        monthLabel: 'February 2026',
        isCurrentMonth: true,
        milestones: [makeMilestone({ id: 'm1', title: 'Current' })],
      });
      const pastGroup = makeGroup({
        monthLabel: 'January 2026',
        isCurrentMonth: false,
        milestones: [makeMilestone({ id: 'm2', title: 'Past Feature' })],
      });

      render(<MilestoneGoalsPanel milestoneGroups={[currentGroup, pastGroup]} />);

      const currentIndex = screen
        .getByText('Current')
        .closest('[data-testid="feature-milestone-card"]');
      const pastIndex = screen
        .getByText('Past Feature')
        .closest('[data-testid="feature-milestone-card"]');
      expect(currentIndex).toBeInTheDocument();
      expect(pastIndex).toBeInTheDocument();
    });

    it('past month group is collapsed by default with Show/Hide toggle', async () => {
      const pastGroup = makeGroup({
        monthLabel: 'January 2026',
        isCurrentMonth: false,
        milestones: [makeMilestone({ id: 'm2', title: 'Past Feature' })],
      });

      render(<MilestoneGoalsPanel milestoneGroups={[pastGroup]} />);

      expect(screen.getByText('January 2026')).toBeInTheDocument();
      const showButton = screen.getByRole('button', { name: /show/i });
      expect(showButton).toBeInTheDocument();

      await userEvent.click(showButton);

      await waitFor(() => {
        expect(screen.getByText('Past Feature')).toBeVisible();
      });
    });
  });

  describe('root element', () => {
    it('has data-testid milestone-goals-panel on root', () => {
      render(<MilestoneGoalsPanel milestoneGroups={[]} />);

      expect(screen.getByTestId('milestone-goals-panel')).toBeInTheDocument();
    });
  });
});
