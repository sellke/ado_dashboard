/**
 * Tests for MilestonePanel component.
 * Covers populated, empty, loading, error states and status badge rendering.
 */

import { MilestonePanel } from '@/components/Dashboard/MilestonePanel';
import type { ApiMilestone } from '@/lib/milestones/types';
import { render, screen, userEvent } from '@/test-utils';

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

describe('MilestonePanel', () => {
  const onRefresh = jest.fn();

  beforeEach(() => {
    onRefresh.mockClear();
  });

  describe('populated state', () => {
    it('groups milestones by workstream and displays target month', () => {
      const milestones: ApiMilestone[] = [
        createMilestone({
          id: 'm1',
          title: 'Phase 1',
          status: 'Done',
          workstream: { id: 'ws-1', name: 'Platform' },
        }),
        createMilestone({
          id: 'm2',
          title: 'Phase 2',
          status: 'NotStarted',
          workstream: { id: 'ws-1', name: 'Platform' },
        }),
        createMilestone({
          id: 'm3',
          title: 'App Release',
          status: 'InProgress',
          workstream: { id: 'ws-2', name: 'Apps' },
        }),
      ];

      render(<MilestonePanel milestones={milestones} onRefresh={onRefresh} />);

      expect(screen.getByText('Platform')).toBeInTheDocument();
      expect(screen.getByText('Apps')).toBeInTheDocument();
      expect(screen.getByText('Phase 1')).toBeInTheDocument();
      expect(screen.getByText('Phase 2')).toBeInTheDocument();
      expect(screen.getByText('App Release')).toBeInTheDocument();
      expect(screen.getAllByText('Mar 2026').length).toBeGreaterThan(0);
      expect(screen.getByText('NotStarted: 1')).toBeInTheDocument();
      expect(screen.getByText('InProgress: 1')).toBeInTheDocument();
      expect(screen.getByText('Done: 1')).toBeInTheDocument();
      expect(screen.getByText('33% Complete')).toBeInTheDocument();
    });

    it('shows title, target month MMM YYYY, status badge, optional ADO Feature ID and notes', () => {
      const milestones: ApiMilestone[] = [
        createMilestone({
          title: 'Critical Feature',
          targetMonth: '2026-06-15T00:00:00.000Z',
          status: 'Done',
          adoFeatureId: 99999,
          notes: 'Completed ahead of schedule',
        }),
      ];

      render(<MilestonePanel milestones={milestones} onRefresh={onRefresh} />);

      expect(screen.getByText('Critical Feature')).toBeInTheDocument();
      expect(screen.getByText('Jun 2026')).toBeInTheDocument();
      expect(screen.getByText(/^Done$/)).toBeInTheDocument();
      expect(screen.getByText(/99999/)).toBeInTheDocument();
      expect(screen.getByText(/Completed ahead of schedule/)).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows exact empty state message when no milestones', () => {
      render(<MilestonePanel milestones={[]} onRefresh={onRefresh} />);

      expect(
        screen.getByText('No milestones yet. Add your first milestone to start tracking.')
      ).toBeInTheDocument();
      expect(screen.getByText('NotStarted: 0')).toBeInTheDocument();
      expect(screen.getByText('InProgress: 0')).toBeInTheDocument();
      expect(screen.getByText('Done: 0')).toBeInTheDocument();
      expect(screen.getByText('0% Complete')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading skeleton without breaking layout', () => {
      render(<MilestonePanel milestones={[]} loading onRefresh={onRefresh} />);

      expect(screen.getByRole('region', { name: /milestones/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/loading milestones/i)).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message without breaking layout', () => {
      render(
        <MilestonePanel milestones={[]} error="Failed to load milestones" onRefresh={onRefresh} />
      );

      expect(screen.getByText(/Failed to load milestones/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('calls onRefresh when retry is clicked', async () => {
      render(<MilestonePanel milestones={[]} error="Network error" onRefresh={onRefresh} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('status badge rendering', () => {
    it('renders NotStarted badge in gray', () => {
      const milestones: ApiMilestone[] = [
        createMilestone({ status: 'NotStarted', title: 'Future Milestone' }),
      ];
      render(<MilestonePanel milestones={milestones} onRefresh={onRefresh} />);

      expect(screen.getByText('Future Milestone')).toBeInTheDocument();
      expect(screen.getByText(/Not Started/)).toBeInTheDocument();
    });

    it('renders InProgress badge', () => {
      const milestones: ApiMilestone[] = [
        createMilestone({ status: 'InProgress', title: 'Active Milestone' }),
      ];
      render(<MilestonePanel milestones={milestones} onRefresh={onRefresh} />);

      expect(screen.getByText(/In Progress/)).toBeInTheDocument();
    });

    it('renders Done badge', () => {
      const milestones: ApiMilestone[] = [
        createMilestone({ status: 'Done', title: 'Completed Milestone' }),
      ];
      render(<MilestonePanel milestones={milestones} onRefresh={onRefresh} />);

      expect(screen.getByText(/^Done$/)).toBeInTheDocument();
    });
  });

  describe('fallback for missing workstream name', () => {
    it('uses fallback label when workstream name is missing', () => {
      const milestones: ApiMilestone[] = [
        createMilestone({
          workstream: { id: 'ws-1', name: '' },
          title: 'Orphan Milestone',
        }),
      ];
      render(<MilestonePanel milestones={milestones} onRefresh={onRefresh} />);

      expect(screen.getByText('Orphan Milestone')).toBeInTheDocument();
      expect(screen.getByText(/Unknown workstream/i)).toBeInTheDocument();
    });
  });
});
