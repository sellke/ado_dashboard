/**
 * Streams dashboard page – isolated metrics for the Streams workstream.
 * Uses the same DashboardContainer with a 'streams' dashboard scope.
 */

import { Container } from '@mantine/core';
import { DashboardContainer } from '@/components/Dashboard/DashboardContainer';
import { loadDashboardWorkstreamScopeFromServerCookie } from '@/lib/dashboard/workstream-scope';

export default async function StreamsDashboardPage() {
  const initialScopeIds = await loadDashboardWorkstreamScopeFromServerCookie('streams');

  return (
    <Container size="xl" py="xl">
      <DashboardContainer
        dashboard="streams"
        title="Streams Dashboard"
        initialScopeIds={initialScopeIds}
      />
    </Container>
  );
}
