'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconAlertCircle } from '@tabler/icons-react';
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';

interface RegistryWorkstream {
  id: string;
  name: string;
  adoOrg: string;
  adoProject: string;
  adoTeamId: string;
  adoAreaPath: string;
  syncEnabled: boolean;
}

interface AdoProjectOption {
  id: string;
  name: string;
}

interface AdoTeamOption {
  id: string;
  name: string;
  projectName?: string;
}

interface FieldError {
  field: string;
  message: string;
}

interface WorkstreamRegistryPanelProps {
  opened: boolean;
  onClose: () => void;
  onChanged?: () => Promise<void> | void;
}

const emptyDraft = {
  id: '',
  name: '',
  adoOrg: '',
  adoProject: '',
  adoTeamId: '',
  adoAreaPath: '',
  syncEnabled: true,
};

function fieldError(errors: FieldError[], field: string) {
  return errors.find((error) => error.field === field)?.message;
}

function debugRegistryPanelLog(hypothesisId: string, message: string, data: Record<string, unknown>) {
  // #region agent log
  fetch('http://127.0.0.1:7536/ingest/a2aecde1-a79a-4148-a39b-e39a7d81f8a8', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'abae78' },
    body: JSON.stringify({
      sessionId: 'abae78',
      runId: 'registry-load-initial',
      hypothesisId,
      location: 'components/Dashboard/WorkstreamRegistryPanel.tsx',
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

export function WorkstreamRegistryPanel({
  opened,
  onClose,
  onChanged,
}: WorkstreamRegistryPanelProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [workstreams, setWorkstreams] = useState<RegistryWorkstream[]>([]);
  const [projects, setProjects] = useState<AdoProjectOption[]>([]);
  const [teams, setTeams] = useState<AdoTeamOption[]>([]);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [draft, setDraft] = useState<RegistryWorkstream>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [deleteBlocked, setDeleteBlocked] = useState<{
    id: string;
    name: string;
    message: string;
  } | null>(null);

  const projectOptions = useMemo(
    () => projects.map((project) => ({ value: project.name, label: project.name })),
    [projects]
  );
  const teamOptions = useMemo(
    () => teams.map((team) => ({ value: team.id, label: team.name })),
    [teams]
  );

  async function loadRegistry() {
    setLoading(true);
    setLoadError(null);
    setErrors([]);
    setDeleteBlocked(null);

    try {
      debugRegistryPanelLog('H4,H5', 'Registry panel load started', {
        opened,
        registryUrl: '/api/workstreams?includeDisabled=true',
        projectsUrl: '/api/ado/projects',
      });
      const [registryRes, projectsRes] = await Promise.all([
        fetch('/api/workstreams?includeDisabled=true'),
        fetch('/api/ado/projects'),
      ]);
      const registryData = (await registryRes.json()) as {
        workstreams?: RegistryWorkstream[];
        error?: string;
      };
      const projectsData = (await projectsRes.json()) as {
        projects?: AdoProjectOption[];
        error?: string;
      };
      debugRegistryPanelLog('H3,H4,H5', 'Registry panel API responses received', {
        registryStatus: registryRes.status,
        registryOk: registryRes.ok,
        registryError: registryData.error ?? null,
        registryCount: registryData.workstreams?.length ?? null,
        projectsStatus: projectsRes.status,
        projectsOk: projectsRes.ok,
        projectsError: projectsData.error ?? null,
        projectsCount: projectsData.projects?.length ?? null,
      });

      if (!registryRes.ok) {
        throw new Error(registryData.error ?? `Registry request failed: ${registryRes.status}`);
      }
      setWorkstreams(registryData.workstreams ?? []);

      if (projectsRes.ok) {
        setProjects(projectsData.projects ?? []);
      } else {
        setProjects([]);
        setTeamError(projectsData.error ?? `Project discovery failed: ${projectsRes.status}`);
      }
    } catch (err) {
      debugRegistryPanelLog('H3,H4,H5', 'Registry panel load failed', {
        message: err instanceof Error ? err.message : String(err),
      });
      setLoadError(err instanceof Error ? err.message : 'Failed to load registry');
      setWorkstreams([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadTeams(project: string) {
    if (!project) {
      setTeams([]);
      return;
    }
    setTeamError(null);
    try {
      const res = await fetch(`/api/ado/teams?project=${encodeURIComponent(project)}`);
      const data = (await res.json()) as { teams?: AdoTeamOption[]; error?: string };
      if (!res.ok) {
        setTeams([]);
        setTeamError(data.error ?? `Team discovery failed: ${res.status}`);
        return;
      }
      setTeams(data.teams ?? []);
    } catch (err) {
      setTeams([]);
      setTeamError(err instanceof Error ? err.message : 'Failed to load ADO teams');
    }
  }

  useEffect(() => {
    if (opened) {
      setDraft(emptyDraft);
      setEditingId(null);
      loadRegistry();
    }
  }, [opened]);

  useEffect(() => {
    if (opened && draft.adoProject) {
      loadTeams(draft.adoProject);
    }
  }, [opened, draft.adoProject]);

  function startAdd() {
    setDraft(emptyDraft);
    setEditingId(null);
    setErrors([]);
    setDeleteBlocked(null);
  }

  function startEdit(workstream: RegistryWorkstream) {
    setDraft(workstream);
    setEditingId(workstream.id);
    setErrors([]);
    setDeleteBlocked(null);
  }

  async function saveDraft() {
    setSaving(true);
    setErrors([]);

    try {
      const res = await fetch(editingId ? `/api/workstreams/${editingId}` : '/api/workstreams', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          adoOrg: draft.adoOrg,
          adoProject: draft.adoProject,
          adoTeamId: draft.adoTeamId,
          adoAreaPath: draft.adoAreaPath,
          syncEnabled: draft.syncEnabled,
        }),
      });
      const data = (await res.json()) as {
        workstream?: RegistryWorkstream;
        errors?: FieldError[];
        error?: string;
      };

      if (res.status === 422 && data.errors) {
        setErrors(data.errors);
        return;
      }
      if (!res.ok) {
        notifications.show({
          color: 'red',
          title: 'Save failed',
          message: data.error ?? `Request failed: ${res.status}`,
        });
        return;
      }

      notifications.show({
        color: 'green',
        title: 'Saved',
        message: 'Workstream registry saved. Changes apply on next Sync Now.',
      });
      await loadRegistry();
      await onChanged?.();
      startAdd();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Save failed',
        message: err instanceof Error ? err.message : 'Failed to save workstream',
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteWorkstream(workstream: RegistryWorkstream) {
    setDeletingId(workstream.id);
    setDeleteBlocked(null);

    try {
      const res = await fetch(`/api/workstreams/${workstream.id}`, { method: 'DELETE' });
      if (res.status === 204) {
        notifications.show({ color: 'green', title: 'Deleted', message: 'Workstream deleted.' });
        await loadRegistry();
        await onChanged?.();
        return;
      }

      const data = (await res.json()) as { error?: string };
      if (res.status === 409) {
        setDeleteBlocked({
          id: workstream.id,
          name: workstream.name,
          message: data.error ?? 'Workstream has related synced data.',
        });
        return;
      }

      notifications.show({
        color: 'red',
        title: 'Delete failed',
        message: data.error ?? `Request failed: ${res.status}`,
      });
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Delete failed',
        message: err instanceof Error ? err.message : 'Failed to delete workstream',
      });
    } finally {
      setDeletingId(null);
    }
  }

  async function disableSync(id: string) {
    const res = await fetch(`/api/workstreams/${id}/sync-enabled`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syncEnabled: false }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      notifications.show({
        color: 'red',
        title: 'Disable failed',
        message: data.error ?? `Request failed: ${res.status}`,
      });
      return;
    }

    notifications.show({
      color: 'green',
      title: 'Sync disabled',
      message: 'The workstream will be skipped on the next Sync Now.',
    });
    setDeleteBlocked(null);
    await loadRegistry();
    await onChanged?.();
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Workstream Registry" centered size="xl">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Configure which Azure DevOps boards sync into the dashboard. Changes apply on next Sync
          Now.
        </Text>

        {loading && (
          <Group gap="sm" aria-live="polite">
            <Loader size="sm" />
            <Text size="sm">Loading registry...</Text>
          </Group>
        )}

        {loadError && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Could not load registry">
            <Stack gap="xs">
              <Text size="sm">{loadError}</Text>
              <Button variant="subtle" color="red" size="xs" onClick={loadRegistry}>
                Retry
              </Button>
            </Stack>
          </Alert>
        )}

        {teamError && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow" title="ADO discovery warning">
            <Text size="sm">{teamError}</Text>
          </Alert>
        )}

        {deleteBlocked && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow" title="Delete blocked">
            <Stack gap="xs">
              <Text size="sm">{deleteBlocked.message}</Text>
              <Button variant="light" color="yellow" onClick={() => disableSync(deleteBlocked.id)}>
                Disable sync for {deleteBlocked.name}
              </Button>
            </Stack>
          </Alert>
        )}

        {!loading && !loadError && (
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Project</Table.Th>
                <Table.Th>Team ID</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {workstreams.map((workstream) => (
                <Table.Tr key={workstream.id}>
                  <Table.Td>{workstream.name}</Table.Td>
                  <Table.Td>{workstream.adoProject}</Table.Td>
                  <Table.Td>{workstream.adoTeamId}</Table.Td>
                  <Table.Td>
                    <Badge color={workstream.syncEnabled ? 'green' : 'gray'}>
                      {workstream.syncEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button size="xs" variant="light" onClick={() => startEdit(workstream)}>
                        Edit
                      </Button>
                      <Button
                        size="xs"
                        color="red"
                        variant="light"
                        loading={deletingId === workstream.id}
                        onClick={() => deleteWorkstream(workstream)}
                      >
                        Delete
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}

        <Stack gap="sm">
          <Group justify="space-between">
            <Text fw={600}>{editingId ? 'Edit workstream' : 'Add workstream'}</Text>
            {editingId && (
              <Button variant="subtle" size="xs" onClick={startAdd}>
                Add new instead
              </Button>
            )}
          </Group>
          <TextInput
            label="Name"
            value={draft.name}
            error={fieldError(errors, 'name')}
            onChange={(event) =>
              setDraft((current) => ({ ...current, name: event.currentTarget.value }))
            }
          />
          <TextInput
            label="ADO organization"
            value={draft.adoOrg}
            error={fieldError(errors, 'adoOrg')}
            onChange={(event) =>
              setDraft((current) => ({ ...current, adoOrg: event.currentTarget.value }))
            }
          />
          <Select
            label="ADO project"
            searchable
            data={projectOptions}
            value={draft.adoProject || null}
            error={fieldError(errors, 'adoProject')}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                adoProject: value ?? '',
                adoTeamId: '',
              }))
            }
          />
          <Select
            label="ADO team / board"
            searchable
            data={teamOptions}
            value={draft.adoTeamId || null}
            error={fieldError(errors, 'adoTeamId')}
            onChange={(value) => setDraft((current) => ({ ...current, adoTeamId: value ?? '' }))}
          />
          <TextInput
            label="ADO area path"
            value={draft.adoAreaPath}
            error={fieldError(errors, 'adoAreaPath')}
            onChange={(event) =>
              setDraft((current) => ({ ...current, adoAreaPath: event.currentTarget.value }))
            }
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Close
            </Button>
            <Button loading={saving} onClick={saveDraft}>
              {editingId ? 'Save changes' : 'Add workstream'}
            </Button>
          </Group>
        </Stack>
      </Stack>
    </Modal>
  );
}
