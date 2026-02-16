'use client';

import { SimpleGrid, Stack, Title } from '@mantine/core';
import type { WorkstreamCardViewModel } from '@/lib/dashboard/types';
import { WorkstreamHealthCard } from './WorkstreamHealthCard';

export interface WorkstreamCardsGridProps {
  /** Array of workstream cards to display (sorted by name for deterministic order) */
  cards: WorkstreamCardViewModel[];
}

/**
 * Renders a responsive grid of workstream health cards.
 * Cards are sorted by workstream name for deterministic display.
 */
export function WorkstreamCardsGrid({ cards }: WorkstreamCardsGridProps) {
  if (!cards || cards.length === 0) {
    return null;
  }

  const sortedCards = [...cards].sort((a, b) =>
    a.workstreamName.localeCompare(b.workstreamName, undefined, { sensitivity: 'base' })
  );

  return (
    <Stack gap="md">
      <Title order={2}>Workstreams</Title>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {sortedCards.map((card) => (
          <WorkstreamHealthCard key={card.workstreamId} card={card} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
