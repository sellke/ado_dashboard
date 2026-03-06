import { SprintTabSelector } from '@/components/Dashboard/SprintTabSelector';
import type { SprintStoryViewModel } from '@/lib/dashboard/types';
import { render, screen, userEvent } from '@/test-utils';

function createSprint(overrides: Partial<SprintStoryViewModel> = {}): SprintStoryViewModel {
  return {
    id: 'sprint-1',
    name: 'Sprint 2026.05',
    startDate: '2026-02-24T00:00:00.000Z',
    endDate: '2026-03-07T00:00:00.000Z',
    isCurrent: false,
    statusGroups: [],
    totalStories: 3,
    ...overrides,
  };
}

describe('SprintTabSelector', () => {
  it('renders tabs for each sprint', () => {
    const sprints = [
      createSprint({ id: 's1', name: 'Sprint 05' }),
      createSprint({ id: 's2', name: 'Sprint 04' }),
      createSprint({ id: 's3', name: 'Sprint 03' }),
    ];

    render(
      <SprintTabSelector sprints={sprints} activeSprintId="s1" onSprintChange={() => {}} />
    );

    expect(screen.getByRole('tab', { name: /Sprint 05/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Sprint 04/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Sprint 03/ })).toBeInTheDocument();
  });

  it('shows badge when totalStories > 0', () => {
    const sprints = [createSprint({ id: 's1', name: 'Sprint 05', totalStories: 5 })];

    render(
      <SprintTabSelector sprints={sprints} activeSprintId="s1" onSprintChange={() => {}} />
    );

    const tab = screen.getByRole('tab', { name: /Sprint 05/ });
    expect(tab).toHaveTextContent('5');
  });

  it('hides badge when totalStories === 0', () => {
    const sprints = [
      createSprint({ id: 's1', name: 'Sprint 05', totalStories: 3 }),
      createSprint({ id: 's2', name: 'Sprint 04', totalStories: 0, statusGroups: [] }),
    ];

    render(
      <SprintTabSelector sprints={sprints} activeSprintId="s1" onSprintChange={() => {}} />
    );

    const tabWithZero = screen.getByRole('tab', { name: /Sprint 04/ });
    expect(tabWithZero).toHaveTextContent(/^Sprint 04$/);
  });

  it('marks current sprint', () => {
    const sprints = [
      createSprint({ id: 's1', name: 'Sprint 05', isCurrent: true }),
      createSprint({ id: 's2', name: 'Sprint 04', isCurrent: false }),
    ];

    render(
      <SprintTabSelector sprints={sprints} activeSprintId="s1" onSprintChange={() => {}} />
    );

    expect(screen.getByRole('tab', { name: /Sprint 05 \(current\)/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Sprint 04/ })).toBeInTheDocument();
  });

  it('calls onSprintChange when tab clicked', async () => {
    const user = userEvent.setup();
    const onSprintChange = jest.fn();
    const sprints = [
      createSprint({ id: 's1', name: 'Sprint 05' }),
      createSprint({ id: 's2', name: 'Sprint 04' }),
    ];

    render(
      <SprintTabSelector
        sprints={sprints}
        activeSprintId="s1"
        onSprintChange={onSprintChange}
      />
    );

    const sprint4Tab = screen.getByRole('tab', { name: /Sprint 04/ });
    await user.click(sprint4Tab);

    expect(onSprintChange).toHaveBeenCalledWith('s2');
  });

  it('returns null when sprints empty', () => {
    render(<SprintTabSelector sprints={[]} activeSprintId="" onSprintChange={() => {}} />);

    expect(screen.queryByTestId('sprint-tab-selector')).toBeNull();
  });

  it('returns null when loading', () => {
    const sprints = [createSprint()];
    render(
      <SprintTabSelector
        sprints={sprints}
        activeSprintId="sprint-1"
        onSprintChange={() => {}}
        loading={true}
      />
    );

    expect(screen.queryByTestId('sprint-tab-selector')).toBeNull();
  });

  it('controlled value: tab matching activeSprintId has aria-selected="true"', () => {
    const sprints = [
      createSprint({ id: 's1', name: 'Sprint 05' }),
      createSprint({ id: 's2', name: 'Sprint 04' }),
    ];

    render(
      <SprintTabSelector sprints={sprints} activeSprintId="s2" onSprintChange={() => {}} />
    );

    const sprint4Tab = screen.getByRole('tab', { name: /Sprint 04/ });
    expect(sprint4Tab).toHaveAttribute('aria-selected', 'true');
  });
});
