'use client';

import { useState } from 'react';
import { IconAlertCircle, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Paper,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { formatTargetMonth } from '@/lib/milestones/format';
import type { ApiMilestone } from '@/lib/milestones/types';
import { MilestoneFormModal, type WorkstreamOption } from './MilestoneFormModal';
import { MilestoneProgressSummary } from './MilestoneProgressSummary';
import { MilestoneStatusBadge } from './MilestoneStatusBadge';

const EMPTY_STATE_MESSAGE = 'No milestones yet. Add your first milestone to start tracking.';

export interface MilestonePanelProps {
  milestones: ApiMilestone[];
  workstreams?: WorkstreamOption[];
  loading?: boolean;
  error?: string | null;
  onRefresh: () => void;
}

function groupByWorkstream(milestones: ApiMilestone[]): Map<string, ApiMilestone[]> {
  const map = new Map<string, ApiMilestone[]>();
  for (const m of milestones) {
    const name = m.workstream?.name?.trim() || 'Unknown workstream';
    const list = map.get(name) ?? [];
    list.push(m);
    map.set(name, list);
  }
  map.forEach((list) => {
    list.sort((a, b) => new Date(a.targetMonth).getTime() - new Date(b.targetMonth).getTime());
  });
  return map;
}

function MilestoneTable({
  milestones,
  onEdit,
  onDelete,
  showActions,
}: {
  milestones: ApiMilestone[];
  onEdit: (m: ApiMilestone) => void;
  onDelete: (m: ApiMilestone) => void;
  showActions: boolean;
}) {
  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Title</Table.Th>
          <Table.Th>Target Month</Table.Th>
          <Table.Th>Status</Table.Th>
          <Table.Th>ADO Feature ID</Table.Th>
          <Table.Th>Notes</Table.Th>
          {showActions && <Table.Th>Actions</Table.Th>}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {milestones.map((m) => (
          <Table.Tr key={m.id}>
            <Table.Td>
              <Text fw={500}>{m.title}</Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm">{formatTargetMonth(m.targetMonth)}</Text>
            </Table.Td>
            <Table.Td>
              <MilestoneStatusBadge status={m.status} />
            </Table.Td>
            <Table.Td>
              {m.adoFeatureId != null ? (
                <Badge variant="outline" size="sm">
                  {m.adoFeatureId}
                </Badge>
              ) : (
                <Text size="sm" c="dimmed">
                  —
                </Text>
              )}
            </Table.Td>
            <Table.Td>
              {m.notes ? (
                <Text size="sm" lineClamp={1}>
                  {m.notes}
                </Text>
              ) : (
                <Text size="sm" c="dimmed">
                  —
                </Text>
              )}
            </Table.Td>
            {showActions && (
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label="Edit milestone"
                    onClick={() => onEdit(m)}
                  >
                    <IconEdit size={14} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    aria-label="Delete milestone"
                    onClick={() => onDelete(m)}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            )}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

function LoadingState() {
  return (
    <Stack gap="md" role="status" aria-label="Loading milestones">
      <Skeleton height={24} width={200} />
      <Skeleton height={120} radius="md" />
    </Stack>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert
      icon={<IconAlertCircle size={16} />}
      title="Error loading milestones"
      color="red"
      variant="light"
    >
      <Stack gap="md">
        <Text size="sm">{message}</Text>
        <Button variant="light" color="red" onClick={onRetry}>
          Retry
        </Button>
      </Stack>
    </Alert>
  );
}

function EmptyState() {
  return (
    <Text size="sm" c="dimmed" py="md">
      {EMPTY_STATE_MESSAGE}
    </Text>
  );
}

function deriveWorkstreams(milestones: ApiMilestone[]): WorkstreamOption[] {
  const seen = new Set<string>();
  const out: WorkstreamOption[] = [];
  for (const m of milestones) {
    if (m.workstream && !seen.has(m.workstream.id)) {
      seen.add(m.workstream.id);
      out.push({ id: m.workstream.id, name: m.workstream.name || 'Unknown' });
    }
  }
  return out;
}

export function MilestonePanel({
  milestones,
  workstreams = [],
  loading = false,
  error = null,
  onRefresh,
}: MilestonePanelProps) {
  const [modalOpened, setModalOpened] = useState(false);
  const [editing, setEditing] = useState<ApiMilestone | null>(null);

  const allWorkstreams = workstreams.length > 0 ? workstreams : deriveWorkstreams(milestones);
  const canAdd = allWorkstreams.length > 0;
  const showActions = canAdd;

  const handleCreate = async (data: {
    title: string;
    workstreamId: string;
    targetMonth: string;
    status: string;
    adoFeatureId?: number | null;
    notes?: string | null;
  }) => {
    const res = await fetch('/api/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? `Request failed: ${res.status}`);
    }
    onRefresh();
  };

  const handleUpdate = async (
    id: string,
    data: {
      title?: string;
      workstreamId?: string;
      targetMonth?: string;
      status?: string;
      adoFeatureId?: number | null;
      notes?: string | null;
    }
  ) => {
    const res = await fetch(`/api/milestones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? `Request failed: ${res.status}`);
    }
    onRefresh();
  };

  const handleDelete = async (m: ApiMilestone) => {
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && !window.confirm('Delete this milestone?')) {
      return;
    }
    const res = await fetch(`/api/milestones/${m.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? `Request failed: ${res.status}`);
    }
    onRefresh();
  };

  const openAdd = () => {
    setEditing(null);
    setModalOpened(true);
  };

  const openEdit = (m: ApiMilestone) => {
    setEditing(m);
    setModalOpened(true);
  };

  const handleFormSubmit = async (data: {
    title: string;
    workstreamId: string;
    targetMonth: string;
    status: string;
    adoFeatureId?: number | null;
    notes?: string | null;
  }) => {
    if (editing) {
      await handleUpdate(editing.id, data);
    } else {
      await handleCreate(data);
    }
  };

  return (
    <Paper withBorder p="md" radius="md" shadow="sm" role="region" aria-label="Milestones">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={3}>Milestones</Title>
          {canAdd && (
            <Button
              leftSection={<IconPlus size={14} />}
              size="xs"
              variant="light"
              onClick={openAdd}
            >
              Add Milestone
            </Button>
          )}
        </Group>

        {loading && <LoadingState />}
        {!loading && error && <ErrorState message={error} onRetry={onRefresh} />}
        {!loading && !error && <MilestoneProgressSummary milestones={milestones} />}
        {!loading && !error && milestones.length === 0 && <EmptyState />}
        {!loading && !error && milestones.length > 0 && (
          <Accordion
            variant="separated"
            radius="md"
            defaultValue={Array.from(groupByWorkstream(milestones).keys())[0]}
          >
            {Array.from(groupByWorkstream(milestones).entries()).map(([workstreamName, items]) => (
              <Accordion.Item key={workstreamName} value={workstreamName}>
                <Accordion.Control>
                  <Text fw={600}>{workstreamName}</Text>
                  <Text size="xs" c="dimmed">
                    {items.length} milestone{items.length !== 1 ? 's' : ''}
                  </Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <MilestoneTable
                    milestones={items}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    showActions={showActions}
                  />
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        )}
      </Stack>

      <MilestoneFormModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        workstreams={allWorkstreams}
        editing={editing}
        onSubmit={handleFormSubmit}
      />
    </Paper>
  );
}
