/**
 * Tests for FeatureMilestoneCard component.
 * Verifies: displays title, SP counts, formatted percent, ADO ID badge,
 * empty chart state, completed style.
 */

import { FeatureMilestoneCard } from '@/components/Dashboard/FeatureMilestoneCard';
import type { MilestoneGoalViewModel } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';

jest.mock('@/components/Dashboard/BurnupChart', () => ({
  BurnupChart: (props: { burnupData: unknown[] }) => (
    <div data-testid="burnup-chart" data-points={props.burnupData.length} />
  ),
}));

function makeMilestone(overrides: Partial<MilestoneGoalViewModel> = {}): MilestoneGoalViewModel {
  return {
    id: 'm1',
    title: 'Phase 1 Launch',
    workstreamId: 'ws-1',
    targetMonth: '2026-02',
    monthLabel: 'February 2026',
    isCurrentMonth: true,
    adoFeatureId: '#12345',
    percentComplete: '73%',
    completedPoints: 22,
    totalPoints: 30,
    burnupData: [
      { sprintName: 'Sprint 1', sprintId: 's1', cumulativeCompletedSP: 10, totalSP: 30 },
      { sprintName: 'Sprint 2', sprintId: 's2', cumulativeCompletedSP: 22, totalSP: 30 },
    ],
    status: 'InProgress',
    ...overrides,
  };
}

describe('FeatureMilestoneCard', () => {
  describe('displays content', () => {
    it('displays milestone title', () => {
      render(<FeatureMilestoneCard milestone={makeMilestone({ title: 'Critical Feature' })} />);

      expect(screen.getByText('Critical Feature')).toBeInTheDocument();
    });

    it('displays completed and total SP counts', () => {
      render(
        <FeatureMilestoneCard milestone={makeMilestone({ completedPoints: 15, totalPoints: 25 })} />
      );

      expect(screen.getByText(/Completed: 15 \/ 25 SP/)).toBeInTheDocument();
    });

    it('displays formatted percent badge', () => {
      render(<FeatureMilestoneCard milestone={makeMilestone({ percentComplete: '60%' })} />);

      expect(screen.getByText('60%')).toBeInTheDocument();
    });

    it('displays ADO ID badge when adoFeatureId is not null', () => {
      render(<FeatureMilestoneCard milestone={makeMilestone({ adoFeatureId: '#99999' })} />);

      expect(screen.getByText('#99999')).toBeInTheDocument();
    });

    it('does not display ADO ID badge when adoFeatureId is null', () => {
      render(<FeatureMilestoneCard milestone={makeMilestone({ adoFeatureId: null })} />);

      expect(screen.queryByText(/#\d+/)).not.toBeInTheDocument();
    });
  });

  describe('chart rendering', () => {
    it('renders BurnupChart when totalPoints > 0', () => {
      render(<FeatureMilestoneCard milestone={makeMilestone({ totalPoints: 30 })} />);

      expect(screen.getByTestId('burnup-chart')).toBeInTheDocument();
    });

    it('shows "No story points tracked" placeholder when totalPoints is 0', () => {
      render(
        <FeatureMilestoneCard milestone={makeMilestone({ totalPoints: 0, completedPoints: 0 })} />
      );

      expect(screen.getByText('No story points tracked')).toBeInTheDocument();
      expect(screen.queryByTestId('burnup-chart')).not.toBeInTheDocument();
    });
  });

  describe('completed style', () => {
    it('has data-completed=true when status is Complete', () => {
      render(<FeatureMilestoneCard milestone={makeMilestone({ status: 'Complete' })} />);

      const card = screen.getByTestId('feature-milestone-card');
      expect(card).toHaveAttribute('data-completed', 'true');
    });

    it('has data-completed=false when status is not Complete', () => {
      render(<FeatureMilestoneCard milestone={makeMilestone({ status: 'InProgress' })} />);

      const card = screen.getByTestId('feature-milestone-card');
      expect(card).toHaveAttribute('data-completed', 'false');
    });

    it('shows green "Complete" badge when milestone is complete', () => {
      render(<FeatureMilestoneCard milestone={makeMilestone({ status: 'Complete' })} />);

      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    it('does not show Complete badge when milestone is in progress', () => {
      render(<FeatureMilestoneCard milestone={makeMilestone({ status: 'InProgress' })} />);

      expect(screen.queryByText('Complete')).not.toBeInTheDocument();
    });
  });
});
