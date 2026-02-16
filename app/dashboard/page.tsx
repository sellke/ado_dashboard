/**
 * Dashboard page – program health metrics.
 * Uses DashboardContainer for client-side fetch lifecycle.
 */

import { Container } from '@mantine/core';
import { DashboardContainer } from '@/components/Dashboard/DashboardContainer';

export default function DashboardPage() {
  return (
    <Container size="xl" py="xl">
      <DashboardContainer />
    </Container>
  );
}
