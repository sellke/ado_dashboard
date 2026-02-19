/**
 * Streams dashboard page – isolated metrics for the Streams workstream.
 * Uses the same DashboardContainer with a 'streams' dashboard scope.
 */

import { Container } from '@mantine/core';
import { DashboardContainer } from '@/components/Dashboard/DashboardContainer';

export default function StreamsDashboardPage() {
  return (
    <Container size="xl" py="xl">
      <DashboardContainer dashboard="streams" title="Streams Dashboard" />
    </Container>
  );
}
