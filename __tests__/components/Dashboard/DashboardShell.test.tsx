/**
 * Tests for DashboardShell component.
 * Verifies loading, success, empty, and error state rendering.
 */

import { DashboardShell } from '@/components/Dashboard/DashboardShell';
import type { DashboardViewModel, MilestoneQuarterGroup } from '@/lib/dashboard/types';
import { render, screen, userEvent } from '@/test-utils';

const mockMilestoneQuarterGroups: MilestoneQuarterGroup[] = [
  {
    quarter: 'Q4',
    features: [
      {
        id: 'ms-1',
        title: 'Q4 Feature Alpha',
        adoFeatureId: '#101',
        workstreams: [
          {
            workstreamId: 'ws-1',
            workstreamName: 'Action Tracker',
            totalStories: 4,
            inProgressPercent: 25,
            completedPercent: 50,
          },
        ],
      },
    ],
  },
];

describe('DashboardShell', () => {
  const loadingViewModel: DashboardViewModel = {
    state: 'loading',
    sprintLabel: null,
    rollingWindowLabel: null,
    computedAtLabel: null,
    programMetrics: null,
    programTrendSprints: [],
    sprint5Prediction: null,
    workstreamCards: [],
  };

  const successViewModel: DashboardViewModel = {
    state: 'success',
    sprintLabel: 'Sprint 26.21',
    rollingWindowLabel: 'Rolling 5 sprints (current + 4 prior)',
    computedAtLabel: '2/11/2026, 6:30:00 PM',
    programMetrics: [
      {
        label: 'Velocity',
        value: '128 pts',
        rawValue: 128,
        unit: 'pts',
        rag: 'Green',
        avgLabel: '120.5 pts',
      },
    ],
    programTrendSprints: [],
    sprint5Prediction: null,
    workstreamCards: [
      {
        workstreamId: 'ws-1',
        workstreamName: 'Action Tracker',
        metrics: [],
        detail: {
          plannedPoints: '40',
          completedPoints: '34',
          carryOverPoints: '6',
        },
        trendSprints: [],
        prediction: null,
        overheadComposition: [],
        overheadItemsBySprint: [],
      },
    ],
  };

  const emptyViewModel: DashboardViewModel = {
    state: 'empty',
    sprintLabel: null,
    rollingWindowLabel: null,
    computedAtLabel: null,
    programMetrics: null,
    programTrendSprints: [],
    sprint5Prediction: null,
    workstreamCards: [],
  };

  const errorViewModel: DashboardViewModel = {
    state: 'error',
    sprintLabel: null,
    rollingWindowLabel: null,
    computedAtLabel: null,
    programMetrics: null,
    programTrendSprints: [],
    sprint5Prediction: null,
    workstreamCards: [],
    errorMessage: 'Failed to load metrics',
  };

  const onRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading skeletons when in loading state', () => {
    render(<DashboardShell viewModel={loadingViewModel} onRetry={onRetry} />);

    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
    const skeletons = document.querySelectorAll('[class*="mantine-Skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders program summary and workstream sections on success', () => {
    render(<DashboardShell viewModel={successViewModel} onRetry={onRetry} />);

    expect(screen.getByText(/Sprint 26\.21/)).toBeInTheDocument();
    expect(screen.getByText('Action Tracker')).toBeInTheDocument();
    expect(screen.getByText(/Planned: 40/)).toBeInTheDocument();
    expect(screen.getByText(/Completed: 34/)).toBeInTheDocument();
  });

  it('renders empty state message when no data', () => {
    render(<DashboardShell viewModel={emptyViewModel} onRetry={onRetry} />);

    expect(screen.getByText(/no metrics data/i)).toBeInTheDocument();
  });

  it('renders error alert with retry button on error', () => {
    render(<DashboardShell viewModel={errorViewModel} onRetry={onRetry} />);

    expect(screen.getByText('Failed to load metrics')).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('retry button calls onRetry callback', async () => {
    render(<DashboardShell viewModel={errorViewModel} onRetry={onRetry} />);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    await userEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('forwards milestoneQuarterGroups to ProgramSummarySection when provided', () => {
    render(
      <DashboardShell
        viewModel={successViewModel}
        onRetry={onRetry}
        milestoneQuarterGroups={mockMilestoneQuarterGroups}
      />
    );

    expect(screen.getByTestId('milestone-quarterly-panel')).toBeInTheDocument();
  });

  it('forwards milestonesLoading to ProgramSummarySection', () => {
    render(
      <DashboardShell
        viewModel={successViewModel}
        onRetry={onRetry}
        milestonesLoading={true}
      />
    );

    expect(screen.getByText(/loading milestone data/i)).toBeInTheDocument();
  });

  it('forwards milestonesError to ProgramSummarySection', () => {
    render(
      <DashboardShell
        viewModel={successViewModel}
        onRetry={onRetry}
        milestonesError="Milestone service unavailable"
      />
    );

    const [errorEl] = screen.getAllByText('Milestone service unavailable');
    expect(errorEl).toBeInTheDocument();
  });

  it('handles null fields in successful response without crashing', () => {
    const vmWithNulls: DashboardViewModel = {
      state: 'success',
      sprintLabel: null,
      rollingWindowLabel: null,
      computedAtLabel: null,
      programMetrics: null,
      programTrendSprints: [],
      sprint5Prediction: null,
      workstreamCards: [
        {
          workstreamId: 'ws-1',
          workstreamName: 'Action Tracker',
          metrics: [
            {
              label: 'Velocity',
              value: 'N/A',
              rawValue: null,
              unit: 'pts',
              rag: null,
              avgLabel: null,
            },
          ],
          detail: {
            plannedPoints: 'N/A',
            completedPoints: 'N/A',
            carryOverPoints: 'N/A',
          },
          trendSprints: [],
          prediction: null,
          overheadComposition: [],
          overheadItemsBySprint: [],
        },
      ],
    };

    expect(() => {
      render(<DashboardShell viewModel={vmWithNulls} onRetry={onRetry} />);
    }).not.toThrow();

    expect(screen.getByText('Action Tracker')).toBeInTheDocument();
    expect(screen.getByText(/Planned: N\/A/)).toBeInTheDocument();
  });
});
