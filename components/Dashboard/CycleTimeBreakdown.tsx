'use client';

import { useCallback, useState } from 'react';
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import type { CycleTimeTypeViewModel, CycleTimeWorkItemType } from '@/lib/dashboard/types';
import { MetricDefinitionHint } from './MetricDefinitionHint';

export interface CycleTimeDrilldownContext {
  dashboard?: string;
  sprintId?: string | null;
  workstreamIds?: string[] | null;
  workstreamId?: string | null;
  scopeLabel?: string;
}

export interface CycleTimeBreakdownProps {
  title: string;
  items: CycleTimeTypeViewModel[];
  drilldownContext?: CycleTimeDrilldownContext;
}

interface UnavailableCycleTimeItem {
  adoId: number;
  adoUrl: string;
  title: string;
  type: CycleTimeWorkItemType;
  state: string;
  workstreamName: string | null;
}

interface UnavailableCycleTimeResponse {
  items?: UnavailableCycleTimeItem[];
  count?: number;
  error?: string;
}

function buildUnavailableItemsUrl(
  item: CycleTimeTypeViewModel,
  context: CycleTimeDrilldownContext
): string {
  const params = new URLSearchParams({ type: item.type });
  if (context.dashboard) {
    params.set('dashboard', context.dashboard);
  }
  if (context.sprintId) {
    params.set('sprintId', context.sprintId);
  }
  if (context.workstreamId) {
    params.set('workstreamId', context.workstreamId);
  } else if (context.workstreamIds && context.workstreamIds.length > 0) {
    params.set('workstreamIds', context.workstreamIds.join(','));
  }
  return `/api/metrics/cycle-time/unavailable?${params.toString()}`;
}

export function CycleTimeBreakdown({ title, items, drilldownContext }: CycleTimeBreakdownProps) {
  const [selectedItem, setSelectedItem] = useState<CycleTimeTypeViewModel | null>(null);
  const [drilldownItems, setDrilldownItems] = useState<UnavailableCycleTimeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDrilldown = useCallback(
    async (item: CycleTimeTypeViewModel) => {
      if (!drilldownContext) {
        return;
      }

      setSelectedItem(item);
      setLoading(true);
      setError(null);
      setDrilldownItems([]);

      try {
        const res = await fetch(buildUnavailableItemsUrl(item, drilldownContext));
        const data = (await res.json()) as UnavailableCycleTimeResponse;
        if (!res.ok) {
          setError(data.error ?? `Request failed: ${res.status}`);
          return;
        }
        setDrilldownItems(data.items ?? []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load unavailable items';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [drilldownContext]
  );

  const closeModal = () => {
    setSelectedItem(null);
    setDrilldownItems([]);
    setError(null);
    setLoading(false);
  };

  const modalTitle = selectedItem
    ? `${selectedItem.label} unavailable cycle-time items`
    : 'Unavailable cycle-time items';

  return (
    <>
      <Card withBorder padding="md">
        <Stack gap="sm">
          <Group gap={4} align="center" wrap="nowrap">
            <Text fw={600}>{title}</Text>
            <MetricDefinitionHint metricId="cycleTimeAverage" label={title} />
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            {items.map((item) => {
              const canOpenDrilldown = !!drilldownContext && item.unavailableItemCount > 0;

              return (
                <Stack
                  key={item.type}
                  gap={4}
                  p="xs"
                  style={{
                    border: '1px solid var(--mantine-color-default-border)',
                    borderRadius: 8,
                  }}
                >
                  <Group justify="space-between" align="center" wrap="nowrap">
                    <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
                      {item.label}
                    </Text>
                    {item.unavailableLabel ? (
                      canOpenDrilldown ? (
                        <Badge
                          component="button"
                          type="button"
                          size="xs"
                          variant="light"
                          color="yellow"
                          onClick={() => loadDrilldown(item)}
                          aria-label={`Open unavailable ${item.label} cycle-time items`}
                          style={{ cursor: 'pointer', border: 0 }}
                        >
                          {item.unavailableLabel}
                        </Badge>
                      ) : (
                        <Badge size="xs" variant="light" color="yellow">
                          {item.unavailableLabel}
                        </Badge>
                      )
                    ) : null}
                  </Group>
                  <Text size="sm" fw={600}>
                    Avg {item.averageLabel}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Total {item.totalLabel} • {item.completedItemCount} completed
                  </Text>
                </Stack>
              );
            })}
          </SimpleGrid>
        </Stack>
      </Card>

      <Modal
        opened={selectedItem !== null}
        onClose={closeModal}
        title={modalTitle}
        centered
        size="lg"
      >
        <Stack gap="sm">
          {drilldownContext?.scopeLabel ? (
            <Text size="sm" c="dimmed">
              Scope: {drilldownContext.scopeLabel}
            </Text>
          ) : null}

          {loading ? (
            <Group gap="sm">
              <Loader size="sm" />
              <Text size="sm">Loading unavailable items...</Text>
            </Group>
          ) : error ? (
            <Alert color="red" title="Could not load unavailable items">
              <Stack gap="sm">
                <Text size="sm">{error}</Text>
                {selectedItem ? (
                  <Button size="xs" variant="light" onClick={() => loadDrilldown(selectedItem)}>
                    Retry
                  </Button>
                ) : null}
              </Stack>
            </Alert>
          ) : drilldownItems.length === 0 ? (
            <Text size="sm" c="dimmed">
              No unavailable items found for this badge.
            </Text>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ADO ID</Table.Th>
                  <Table.Th>Title</Table.Th>
                  <Table.Th>Workstream</Table.Th>
                  <Table.Th>State</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {drilldownItems.map((item) => (
                  <Table.Tr key={item.adoId}>
                    <Table.Td>
                      <Anchor href={item.adoUrl} target="_blank" rel="noreferrer">
                        #{item.adoId}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>{item.title}</Table.Td>
                    <Table.Td>{item.workstreamName ?? 'Unassigned'}</Table.Td>
                    <Table.Td>{item.state}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Modal>
    </>
  );
}
