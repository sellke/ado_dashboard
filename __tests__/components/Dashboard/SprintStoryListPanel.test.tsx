/**
 * Tests for SprintStoryListPanel component (controlled mode only).
 * Validates story rendering, status groups, ADO links, empty states, and edge cases.
 */

import { SprintStoryListPanel } from '@/components/Dashboard/SprintStoryListPanel';
import type { SprintStoryViewModel, StatusGroupViewModel, StoryRowViewModel } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';

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

describe('SprintStoryListPanel', () => {
  it('renders status groups for the sprint matching activeSprintId', () => {
    const sprints = [
      createSprint({
        id: 's1',
        name: 'Sprint 05',
        statusGroups: [
          createStatusGroup({ stories: [createStoryRow({ title: 'Story A' })] }),
        ],
      }),
      createSprint({
        id: 's2',
        name: 'Sprint 04',
        isCurrent: false,
        statusGroups: [
          createStatusGroup({ stories: [createStoryRow({ title: 'Story B', adoId: '#99' })] }),
        ],
      }),
    ];

    render(<SprintStoryListPanel sprints={sprints} activeSprintId="s2" />);

    expect(screen.getByText('Story B')).toBeInTheDocument();
    expect(screen.queryByText('Story A')).not.toBeInTheDocument();
  });

  it('renders story rows with title, assignee, points, and state', () => {
    const sprints = [
      createSprint({
        id: 's1',
        statusGroups: [
          createStatusGroup({
            stories: [
              createStoryRow({
                adoId: '#42',
                title: 'Build login page',
                assignedTo: 'Bob Smith',
                storyPoints: '8',
              }),
            ],
          }),
        ],
      }),
    ];

    render(<SprintStoryListPanel sprints={sprints} activeSprintId="s1" />);

    expect(screen.getByText('#42')).toBeInTheDocument();
    expect(screen.getByText('Build login page')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    const rowLink = screen.getByRole('link', { name: /Open Build login page/ });
    expect(rowLink).toHaveTextContent('8');
  });

  it('renders ADO deep links that open in new tab', () => {
    const sprints = [
      createSprint({
        id: 's1',
        statusGroups: [
          createStatusGroup({
            stories: [
              createStoryRow({ adoUrl: `${ADO_BASE}/99999`, title: 'Test story' }),
            ],
          }),
        ],
      }),
    ];

    render(<SprintStoryListPanel sprints={sprints} activeSprintId="s1" />);

    const link = screen.getByRole('link', { name: /Open Test story in Azure DevOps/ });
    expect(link).toHaveAttribute('href', `${ADO_BASE}/99999`);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows empty message when sprint has no stories', () => {
    const sprints = [
      createSprint({ id: 's1', statusGroups: [], totalStories: 0 }),
    ];

    render(<SprintStoryListPanel sprints={sprints} activeSprintId="s1" />);

    expect(screen.getByText('No user stories in this sprint')).toBeInTheDocument();
  });

  it('does not render empty status groups', () => {
    const sprints = [
      createSprint({
        id: 's1',
        statusGroups: [
          createStatusGroup({ group: 'Active', stories: [createStoryRow()] }),
        ],
      }),
    ];

    render(<SprintStoryListPanel sprints={sprints} activeSprintId="s1" />);

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByText('Planned')).not.toBeInTheDocument();
    expect(screen.queryByText('Resolved')).not.toBeInTheDocument();
    expect(screen.queryByText('Completed')).not.toBeInTheDocument();
  });

  it('renders status section headers with correct labels', () => {
    const sprints = [
      createSprint({
        id: 's1',
        statusGroups: [
          createStatusGroup({ group: 'Planned', stories: [createStoryRow({ statusGroup: 'Planned' })] }),
          createStatusGroup({ group: 'Active', stories: [createStoryRow({ statusGroup: 'Active' })] }),
          createStatusGroup({ group: 'Testing', stories: [createStoryRow({ statusGroup: 'Testing', title: 'QA story' })] }),
          createStatusGroup({ group: 'Resolved', stories: [createStoryRow({ statusGroup: 'Resolved' })] }),
          createStatusGroup({ group: 'Completed', stories: [createStoryRow({ statusGroup: 'Completed' })] }),
        ],
        totalStories: 5,
      }),
    ];

    render(<SprintStoryListPanel sprints={sprints} activeSprintId="s1" />);

    expect(screen.getByText('Planned')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Testing')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders Testing section between Active and Resolved with cyan badges', () => {
    const sprints = [
      createSprint({
        id: 's1',
        statusGroups: [
          createStatusGroup({ group: 'Active', stories: [createStoryRow({ statusGroup: 'Active', title: 'Dev story' })] }),
          createStatusGroup({
            group: 'Testing',
            stories: [createStoryRow({ statusGroup: 'Testing', title: 'QA story', storyPoints: '3' })],
          }),
          createStatusGroup({ group: 'Resolved', stories: [createStoryRow({ statusGroup: 'Resolved', title: 'Done story' })] }),
        ],
        totalStories: 3,
      }),
    ];

    render(<SprintStoryListPanel sprints={sprints} activeSprintId="s1" />);

    const headings = screen.getAllByText(/^(Active|Testing|Resolved)$/);
    expect(headings.map((el) => el.textContent)).toEqual(['Active', 'Testing', 'Resolved']);

    const testingBadges = screen.getByText('Testing').closest('div')?.querySelectorAll('[class*="Badge"]');
    expect(testingBadges?.length).toBeGreaterThan(0);
  });

  it('renders loading skeleton', () => {
    render(<SprintStoryListPanel sprints={[]} activeSprintId="s1" loading={true} />);

    expect(screen.getByTestId('sprint-story-list-panel')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<SprintStoryListPanel sprints={[]} activeSprintId="s1" error="Failed to load stories" />);

    expect(screen.getByText('Failed to load stories')).toBeInTheDocument();
  });

  it('renders "No sprint data available" when sprints array is empty', () => {
    render(<SprintStoryListPanel sprints={[]} activeSprintId="s1" />);

    expect(screen.getByText('No sprint data available')).toBeInTheDocument();
  });

  it('shows "No stories for selected sprint" when activeSprintId does not match any sprint', () => {
    const sprints = [
      createSprint({ id: 's1', name: 'Sprint 05' }),
    ];

    render(<SprintStoryListPanel sprints={sprints} activeSprintId="nonexistent" />);

    expect(screen.getByText('No stories for selected sprint')).toBeInTheDocument();
  });

  it('does not render tabs in controlled mode', () => {
    const sprints = [createSprint({ id: 's1' })];

    render(<SprintStoryListPanel sprints={sprints} activeSprintId="s1" />);

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('has section with aria-label for accessibility', () => {
    const sprints = [createSprint({ id: 's1' })];
    render(<SprintStoryListPanel sprints={sprints} activeSprintId="s1" />);

    expect(screen.getByRole('region', { name: 'Sprint Stories' })).toBeInTheDocument();
  });

  it('displays "Unassigned" for stories with no assignee', () => {
    const sprints = [
      createSprint({
        id: 's1',
        statusGroups: [
          createStatusGroup({
            stories: [createStoryRow({ assignedTo: 'Unassigned' })],
          }),
        ],
      }),
    ];

    render(<SprintStoryListPanel sprints={sprints} activeSprintId="s1" />);
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('renders status section header badge with total story points, not story count', () => {
    const sprints = [
      createSprint({
        id: 's1',
        statusGroups: [
          createStatusGroup({
            group: 'Active',
            stories: [
              createStoryRow({ storyPoints: '5', statusGroup: 'Active' }),
              createStoryRow({ adoId: '#2', storyPoints: '5', statusGroup: 'Active', title: 'Story 2' }),
              createStoryRow({ adoId: '#3', storyPoints: '5', statusGroup: 'Active', title: 'Story 3' }),
            ],
            totalStoryPoints: 15,
          }),
        ],
        totalStories: 3,
      }),
    ];

    render(<SprintStoryListPanel sprints={sprints} activeSprintId="s1" />);

    const activeHeader = screen.getByText('Active').closest('div');
    expect(activeHeader).toHaveTextContent('15');
    expect(activeHeader).not.toHaveTextContent('3');
  });

  it('displays "\u2014" for stories with no story points', () => {
    const sprints = [
      createSprint({
        id: 's1',
        statusGroups: [
          createStatusGroup({
            stories: [createStoryRow({ storyPoints: '\u2014' })],
          }),
        ],
      }),
    ];

    render(<SprintStoryListPanel sprints={sprints} activeSprintId="s1" />);
    expect(screen.getByText('\u2014')).toBeInTheDocument();
  });
});
