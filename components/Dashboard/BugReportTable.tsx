'use client';

import { Box, Stack, Table, Text } from '@mantine/core';
import type { WorkstreamCardViewModel } from '@/lib/dashboard/types';

interface BugReportItem {
  adoId: string;
  title: string;
  isClosed: boolean;
  sprintName: string;
}

interface WorkstreamBugGroup {
  workstreamName: string;
  bugs: BugReportItem[];
}

export function extractBugGroups(
  workstreamCards: WorkstreamCardViewModel[]
): WorkstreamBugGroup[] {
  return workstreamCards
    .map((card) => ({
      workstreamName: card.workstreamName,
      bugs: card.trendSprints.flatMap((sprint) =>
        sprint.bugs.map((bug) => ({
          adoId: bug.adoId,
          title: bug.title,
          isClosed: bug.isClosed,
          sprintName: sprint.sprintName,
        }))
      ),
    }))
    .filter((group) => group.bugs.length > 0);
}

export interface BugReportTableProps {
  workstreamCards: WorkstreamCardViewModel[];
}

export function BugReportTable({ workstreamCards }: BugReportTableProps) {
  const groups = extractBugGroups(workstreamCards);

  if (groups.length === 0) {
    return (
      <Text c="dimmed" data-testid="bug-report-empty">
        No bugs found across workstreams.
      </Text>
    );
  }

  return (
    <Stack gap="xl" data-testid="bug-report-table">
      {groups.map((group) => (
        <Box key={group.workstreamName}>
          <Text fw={600} size="lg" mb="sm">
            {group.workstreamName}
          </Text>
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={100}>ADO ID</Table.Th>
                <Table.Th>Title</Table.Th>
                <Table.Th w={140}>Sprint</Table.Th>
                <Table.Th w={80}>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {group.bugs.map((bug) => (
                <Table.Tr key={`${bug.adoId}-${bug.sprintName}`}>
                  <Table.Td>
                    <Text size="sm" ff="monospace">
                      #{bug.adoId}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text
                      size="sm"
                      td={bug.isClosed ? 'line-through' : undefined}
                      c={bug.isClosed ? 'dimmed' : undefined}
                    >
                      {bug.title}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{bug.sprintName}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c={bug.isClosed ? 'dimmed' : 'red'} fw={500}>
                      {bug.isClosed ? 'Closed' : 'Open'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
      ))}
    </Stack>
  );
}
