/**
 * Dashboard page – program health metrics (excludes Streams workstream).
 * Uses DashboardContainer for client-side fetch lifecycle.
 */

import { Container } from '@mantine/core';
import { DashboardContainer } from '@/components/Dashboard/DashboardContainer';
import { loadDashboardWorkstreamScopeFromServerCookie } from '@/lib/dashboard/workstream-scope';

export default async function DashboardPage() {
  const initialScopeIds = await loadDashboardWorkstreamScopeFromServerCookie('main');

  return (
    <Container size="xl" py="xl">
      <DashboardContainer dashboard="main" title="Dashboard" initialScopeIds={initialScopeIds} />
    </Container>
  );
}
