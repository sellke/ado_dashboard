/**
 * Tests for WorkstreamCardsGrid component.
 * Verifies card rendering, empty state, and deterministic ordering.
 */
import { WorkstreamCardsGrid } from '@/components/Dashboard/WorkstreamCardsGrid';
import type { WorkstreamCardViewModel } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';

const createCard = (overrides: Partial<WorkstreamCardViewModel> = {}): WorkstreamCardViewModel => ({
  workstreamId: 'ws-1',
  workstreamName: 'Alpha',
  metrics: [],
  detail: {
    plannedPoints: '40',
    completedPoints: '34',
    carryOverItems: '3',
    carryOverPoints: '6',
  },
  trendSprints: [],
  ...overrides,
});

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
});
