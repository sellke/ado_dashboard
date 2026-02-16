import { MilestoneProgressSummary } from '@/components/Dashboard/MilestoneProgressSummary';
import type { ApiMilestone } from '@/lib/milestones/types';
import { render, screen } from '@/test-utils';

const createMilestone = (overrides: Partial<ApiMilestone> = {}): ApiMilestone => ({
  id: 'm1',
  title: 'Launch Phase 1',
  workstreamId: 'ws-1',
  targetMonth: '2026-03-01T00:00:00.000Z',
  status: 'InProgress',
  adoFeatureId: 12345,
  notes: 'Key deliverable',
  createdAt: '2026-02-01T00:00:00.000Z',
  updatedAt: '2026-02-01T00:00:00.000Z',
  workstream: { id: 'ws-1', name: 'Platform' },
  ...overrides,
});

describe('MilestoneProgressSummary', () => {
  it('shows counts and completion percent for mixed statuses', () => {
    const milestones: ApiMilestone[] = [
      createMilestone({ id: 'm1', status: 'Done' }),
      createMilestone({ id: 'm2', status: 'InProgress' }),
      createMilestone({ id: 'm3', status: 'NotStarted' }),
      createMilestone({ id: 'm4', status: 'Done' }),
    ];

    render(<MilestoneProgressSummary milestones={milestones} />);

    expect(screen.getByText('NotStarted: 1')).toBeInTheDocument();
    expect(screen.getByText('InProgress: 1')).toBeInTheDocument();
    expect(screen.getByText('Done: 2')).toBeInTheDocument();
    expect(screen.getByText('50% Complete')).toBeInTheDocument();
  });

  it('shows zero counts and 0 percent for empty milestones', () => {
    render(<MilestoneProgressSummary milestones={[]} />);

    expect(screen.getByText('NotStarted: 0')).toBeInTheDocument();
    expect(screen.getByText('InProgress: 0')).toBeInTheDocument();
    expect(screen.getByText('Done: 0')).toBeInTheDocument();
    expect(screen.getByText('0% Complete')).toBeInTheDocument();
  });

  it('shows 100 percent for single-status all done milestones', () => {
    const milestones: ApiMilestone[] = [
      createMilestone({ id: 'm1', status: 'Done' }),
      createMilestone({ id: 'm2', status: 'Done' }),
    ];

    render(<MilestoneProgressSummary milestones={milestones} />);

    expect(screen.getByText('NotStarted: 0')).toBeInTheDocument();
    expect(screen.getByText('InProgress: 0')).toBeInTheDocument();
    expect(screen.getByText('Done: 2')).toBeInTheDocument();
    expect(screen.getByText('100% Complete')).toBeInTheDocument();
  });
});
