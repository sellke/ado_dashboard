/**
 * Integration tests for Sprint Story List feature.
 * Validates SprintStoryListPanel placement within WorkstreamHealthCard,
 * data flow, loading/error states, and conditional rendering.
 */

import { WorkstreamHealthCard } from '@/components/Dashboard/WorkstreamHealthCard';
import type { SprintStoryViewModel, StatusGroupViewModel, StoryRowViewModel } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';
import { createWorkstreamCard } from './__fixtures__/dashboard-fixtures';

jest.mock('@/lib/charts', () => ({
  AppLineChart: (props: Record<string, unknown>) => {
    const series = props.series as Array<{ name: string }> | undefined;
    const isOverhead = series?.some((s) => s.name === 'Meetings');
    return <div data-testid={isOverhead ? 'overhead-line-chart' : 'velocity-line-chart'} />;
  },
  AppBarChart: () => <div data-testid="overhead-bar-chart" />,
  ChartLegend: () => <div data-testid="chart-legend" />,
}));

const ADO_BASE = 'https://dev.azure.com/Operations-Innovation/Event%20Streaming%20Platform/_workitems/edit';

function createStoryRow(overrides: Partial<StoryRowViewModel> = {}): StoryRowViewModel {
  return {
    adoId: '#12345',
    title: 'Implement auth flow',
    assignedTo: 'Jane Doe',
    storyPoints: '5',
    state: 'Active',
    statusGroup: 'Active',
    adoUrl: `${ADO_BASE}/12345`,
    ...overrides,
  };
}

function createStatusGroup(overrides: Partial<StatusGroupViewModel> = {}): StatusGroupViewModel {
  const stories = overrides.stories ?? [createStoryRow()];
  const totalStoryPoints =
    overrides.totalStoryPoints ??
    stories.reduce(
      (sum, s) => sum + (s.storyPoints === '\u2014' ? 0 : Number(s.storyPoints)),
      0
    );
  return {
    group: 'Active',
    stories,
    totalStoryPoints,
    ...overrides,
  };
}

function createSprint(overrides: Partial<SprintStoryViewModel> = {}): SprintStoryViewModel {
  return {
    id: 'sprint-1',
    name: 'Sprint 2026.05',
    startDate: '2026-02-24T00:00:00.000Z',
    endDate: '2026-03-07T00:00:00.000Z',
    isCurrent: true,
    statusGroups: [createStatusGroup()],
    totalStories: 1,
    ...overrides,
  };
}

describe('Sprint Story List Integration', () => {
  it('renders SprintStoryListPanel below velocity chart in WorkstreamHealthCard', () => {
    const card = createWorkstreamCard();
    const sprints = [createSprint({ id: 's1' })];

    render(<WorkstreamHealthCard card={card} sprintStories={sprints} activeSprintId="s1" />);

    expect(screen.getByText('Sprint Stories')).toBeInTheDocument();
    expect(screen.getByTestId('sprint-story-list-panel')).toBeInTheDocument();
  });

  it('shows loading skeleton when storiesLoading is true', () => {
    const card = createWorkstreamCard();

    render(<WorkstreamHealthCard card={card} storiesLoading={true} activeSprintId="" />);

    expect(screen.getByText('Sprint Stories')).toBeInTheDocument();
    expect(screen.getByTestId('sprint-story-list-panel')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('shows error message when storiesError is set', () => {
    const card = createWorkstreamCard();

    render(<WorkstreamHealthCard card={card} storiesError="Network error" activeSprintId="" />);

    expect(screen.getByText('Sprint Stories')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('does not render sprint stories panel when no stories data and not loading', () => {
    const card = createWorkstreamCard();

    render(<WorkstreamHealthCard card={card} />);

    expect(screen.queryByText('Sprint Stories')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sprint-story-list-panel')).not.toBeInTheDocument();
  });

  it('renders stories alongside existing card content without regression', () => {
    const card = createWorkstreamCard();
    const sprints = [createSprint({ id: 's1' })];

    render(
      <WorkstreamHealthCard
        card={card}
        sprintStories={sprints}
        activeSprintId="s1"
      />
    );

    expect(screen.getByText('Platform')).toBeInTheDocument();
    expect(screen.getByText('Velocity (Points)')).toBeInTheDocument();
    expect(screen.getByTestId('velocity-line-chart')).toBeInTheDocument();
    expect(screen.getByText('Sprint Stories')).toBeInTheDocument();
    expect(screen.getByTestId('sprint-story-list-panel')).toBeInTheDocument();
    expect(screen.getByTestId('overhead-breakdown-panel')).toBeInTheDocument();
  });

  it('renders story rows with ADO links inside the card', () => {
    const card = createWorkstreamCard();
    const sprints = [
      createSprint({
        id: 's1',
        statusGroups: [
          createStatusGroup({
            stories: [
              createStoryRow({ adoId: '#42', title: 'Test Story', adoUrl: `${ADO_BASE}/42` }),
            ],
          }),
        ],
      }),
    ];

    render(<WorkstreamHealthCard card={card} sprintStories={sprints} activeSprintId="s1" />);

    expect(screen.getByText('#42')).toBeInTheDocument();
    expect(screen.getByText('Test Story')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Open Test Story in Azure DevOps/ });
    expect(link).toHaveAttribute('href', `${ADO_BASE}/42`);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows empty state when sprintStories is empty', () => {
    const card = createWorkstreamCard();

    render(<WorkstreamHealthCard card={card} sprintStories={[]} activeSprintId="s1" />);

    expect(screen.getByText('Sprint Stories')).toBeInTheDocument();
    expect(screen.getByText('No sprint data available')).toBeInTheDocument();
  });

  it('shows no stories message when activeSprintId does not match', () => {
    const card = createWorkstreamCard();
    const sprints = [createSprint({ id: 's1' })];

    render(<WorkstreamHealthCard card={card} sprintStories={sprints} activeSprintId="nonexistent" />);

    expect(screen.getByText('No stories for selected sprint')).toBeInTheDocument();
  });
});
