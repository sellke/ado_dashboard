/**
 * Tests for WorkstreamCardsGrid component.
 * Verifies card rendering, empty state, deterministic ordering, and shared sprint selector.
 */
import { WorkstreamCardsGrid } from '@/components/Dashboard/WorkstreamCardsGrid';
import type { SprintStoryViewModel, StatusGroupViewModel, StoryRowViewModel, WorkstreamCardViewModel } from '@/lib/dashboard/types';
import { render, screen, userEvent } from '@/test-utils';

jest.mock('@/lib/charts', () => ({
  AppLineChart: (props: Record<string, unknown>) => {
    const series = props.series as Array<{ name: string }> | undefined;
    const isOverhead = series?.some((s) => s.name === 'Meetings');
    return <div data-testid={isOverhead ? 'overhead-line-chart' : 'velocity-line-chart'} />;
  },
  AppBarChart: () => <div data-testid="overhead-bar-chart" />,
  ChartLegend: () => <div data-testid="chart-legend" />,
}));

const createCard = (overrides: Partial<WorkstreamCardViewModel> = {}): WorkstreamCardViewModel => ({
  workstreamId: 'ws-1',
  workstreamName: 'Alpha',
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
  milestoneGroups: [],
  ...overrides,
});

function createStoryRow(overrides: Partial<StoryRowViewModel> = {}): StoryRowViewModel {
  return {
    adoId: '#12345',
    title: 'Implement auth flow',
    assignedTo: 'Jane Doe',
    storyPoints: '5',
    state: 'Active',
    statusGroup: 'Active',
    adoUrl: 'https://dev.azure.com/test/12345',
    ...overrides,
  };
}

function createStatusGroup(overrides: Partial<StatusGroupViewModel> = {}): StatusGroupViewModel {
  return {
    group: 'Active',
    stories: [createStoryRow()],
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

describe('WorkstreamCardsGrid', () => {
  it('renders one card per workstream', () => {
    const cards: WorkstreamCardViewModel[] = [
      createCard({ workstreamId: 'ws-1', workstreamName: 'Platform' }),
      createCard({ workstreamId: 'ws-2', workstreamName: 'Apps' }),
      createCard({ workstreamId: 'ws-3', workstreamName: 'Infra' }),
    ];

    render(<WorkstreamCardsGrid cards={cards} />);

    expect(screen.getByText('Platform')).toBeInTheDocument();
    expect(screen.getByText('Apps')).toBeInTheDocument();
    expect(screen.getByText('Infra')).toBeInTheDocument();
    expect(screen.getByText('Workstreams')).toBeInTheDocument();
  });

  it('renders nothing when cards array is empty', () => {
    const { container } = render(<WorkstreamCardsGrid cards={[]} />);

    expect(screen.queryByText('Workstreams')).not.toBeInTheDocument();
    expect(container.querySelector('[class*="mantine-SimpleGrid"]')).not.toBeInTheDocument();
  });

  it('shows Workstreams title when cards exist', () => {
    render(<WorkstreamCardsGrid cards={[createCard()]} />);
    expect(screen.getByText('Workstreams')).toBeInTheDocument();
  });

  it('renders cards in deterministic order sorted by workstream name', () => {
    const cards: WorkstreamCardViewModel[] = [
      createCard({ workstreamId: 'ws-3', workstreamName: 'Zebra' }),
      createCard({ workstreamId: 'ws-1', workstreamName: 'Alpha' }),
      createCard({ workstreamId: 'ws-2', workstreamName: 'Beta' }),
    ];

    render(<WorkstreamCardsGrid cards={cards} />);

    const cardContainers = document.querySelectorAll('[class*="mantine-Card"]');
    const cardNames = Array.from(cardContainers).map((el) => el.textContent?.trim() ?? '');

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Zebra')).toBeInTheDocument();

    const alphaIndex = cardNames.findIndex((t) => t.includes('Alpha'));
    const betaIndex = cardNames.findIndex((t) => t.includes('Beta'));
    const zebraIndex = cardNames.findIndex((t) => t.includes('Zebra'));

    expect(alphaIndex).toBeLessThan(betaIndex);
    expect(betaIndex).toBeLessThan(zebraIndex);
  });

  describe('shared sprint selector', () => {
    it('renders SprintTabSelector when sprint data exists', () => {
      const cards = [createCard({ workstreamId: 'ws-1' })];
      const sprintStoriesMap = {
        'ws-1': [
          createSprint({ id: 's1', name: 'Sprint 05', isCurrent: true }),
          createSprint({ id: 's2', name: 'Sprint 04', isCurrent: false }),
        ],
      };

      render(<WorkstreamCardsGrid cards={cards} sprintStoriesMap={sprintStoriesMap} />);

      expect(screen.getByTestId('sprint-tab-selector')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Sprint 05/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Sprint 04/ })).toBeInTheDocument();
    });

    it('hides SprintTabSelector when no sprint data', () => {
      const cards = [createCard({ workstreamId: 'ws-1' })];

      render(<WorkstreamCardsGrid cards={cards} />);

      expect(screen.queryByTestId('sprint-tab-selector')).not.toBeInTheDocument();
    });

    it('hides SprintTabSelector when sprintStoriesMap is empty', () => {
      const cards = [createCard({ workstreamId: 'ws-1' })];

      render(<WorkstreamCardsGrid cards={cards} sprintStoriesMap={{}} />);

      expect(screen.queryByTestId('sprint-tab-selector')).not.toBeInTheDocument();
    });

    it('hides SprintTabSelector when storiesLoading is true', () => {
      const cards = [createCard({ workstreamId: 'ws-1' })];
      const sprintStoriesMap = {
        'ws-1': [createSprint({ id: 's1', name: 'Sprint 05' })],
      };

      render(
        <WorkstreamCardsGrid
          cards={cards}
          sprintStoriesMap={sprintStoriesMap}
          storiesLoading={true}
        />
      );

      expect(screen.queryByTestId('sprint-tab-selector')).not.toBeInTheDocument();
    });

    it('defaults to current sprint', () => {
      const cards = [createCard({ workstreamId: 'ws-1' })];
      const sprintStoriesMap = {
        'ws-1': [
          createSprint({ id: 's1', name: 'Sprint 05', isCurrent: false }),
          createSprint({ id: 's2', name: 'Sprint 04', isCurrent: true }),
        ],
      };

      render(<WorkstreamCardsGrid cards={cards} sprintStoriesMap={sprintStoriesMap} />);

      const currentTab = screen.getByRole('tab', { name: /Sprint 04/ });
      expect(currentTab).toHaveAttribute('aria-selected', 'true');
    });

    it('tab change updates all cards', async () => {
      const user = userEvent.setup();
      const cards = [
        createCard({ workstreamId: 'ws-1', workstreamName: 'Alpha' }),
        createCard({ workstreamId: 'ws-2', workstreamName: 'Beta' }),
      ];
      const sprint1Stories = [
        createStatusGroup({
          stories: [createStoryRow({ title: 'Alpha Story S1', adoId: '#1' })],
        }),
      ];
      const sprint2Stories = [
        createStatusGroup({
          stories: [createStoryRow({ title: 'Alpha Story S2', adoId: '#2' })],
        }),
      ];
      const betaSprint1Stories = [
        createStatusGroup({
          stories: [createStoryRow({ title: 'Beta Story S1', adoId: '#3' })],
        }),
      ];
      const betaSprint2Stories = [
        createStatusGroup({
          stories: [createStoryRow({ title: 'Beta Story S2', adoId: '#4' })],
        }),
      ];
      const sprintStoriesMap = {
        'ws-1': [
          createSprint({ id: 's1', name: 'Sprint 05', isCurrent: true, statusGroups: sprint1Stories, totalStories: 1 }),
          createSprint({ id: 's2', name: 'Sprint 04', isCurrent: false, statusGroups: sprint2Stories, totalStories: 1 }),
        ],
        'ws-2': [
          createSprint({ id: 's1', name: 'Sprint 05', isCurrent: true, statusGroups: betaSprint1Stories, totalStories: 1 }),
          createSprint({ id: 's2', name: 'Sprint 04', isCurrent: false, statusGroups: betaSprint2Stories, totalStories: 1 }),
        ],
      };

      render(<WorkstreamCardsGrid cards={cards} sprintStoriesMap={sprintStoriesMap} />);

      expect(screen.getByText('Alpha Story S1')).toBeInTheDocument();
      expect(screen.getByText('Beta Story S1')).toBeInTheDocument();

      const sprint4Tab = screen.getByRole('tab', { name: /Sprint 04/ });
      await user.click(sprint4Tab);

      expect(screen.getByText('Alpha Story S2')).toBeInTheDocument();
      expect(screen.getByText('Beta Story S2')).toBeInTheDocument();
    });
  });
});
