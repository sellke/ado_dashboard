/**
 * Bug Report page – cross-workstream bug listing.
 * Shows open and closed bugs grouped by workstream across the rolling window.
 */

import { Container } from '@mantine/core';
import { BugReportContainer } from '@/components/Dashboard/BugReportContainer';

export default function BugsPage() {
  return (
    <Container size="xl" py="xl">
      <BugReportContainer />
    </Container>
  );
}
