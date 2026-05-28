'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Checkbox, Group, Loader, Modal, ScrollArea, Stack, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

export interface WorkstreamScopeOption {
  id: string;
  name: string;
  adoAreaPath?: string | null;
}

export interface WorkstreamScopeModalProps {
  opened: boolean;
  workstreams: WorkstreamScopeOption[];
  selectedIds: string[];
  loading: boolean;
  error: string | null;
  onSave: (ids: string[]) => void;
  onCancel: () => void;
  onRetry?: () => void;
}

export function WorkstreamScopeModal({
  opened,
  workstreams,
  selectedIds,
  loading,
  error,
  onSave,
  onCancel,
  onRetry,
}: WorkstreamScopeModalProps) {
  const [draftIds, setDraftIds] = useState<string[]>(selectedIds);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (opened) {
      setDraftIds(selectedIds);
      setValidationError(null);
    }
  }, [opened, selectedIds]);

  const handleSave = () => {
    if (draftIds.length === 0) {
      setValidationError('Select at least one workstream to save this dashboard scope.');
      return;
    }

    setValidationError(null);
    onSave(draftIds);
  };

  return (
    <Modal opened={opened} onClose={onCancel} title="Workstream scope" centered size="lg">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Choose which synced workstreams are included in this Dashboard view.
        </Text>

        {loading && (
          <Group gap="sm" aria-live="polite">
            <Loader size="sm" />
            <Text size="sm">Loading workstreams...</Text>
          </Group>
        )}

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} title="Could not load workstreams" color="red">
            <Stack gap="xs">
              <Text size="sm">{error}</Text>
              {onRetry && (
                <Button variant="subtle" color="red" size="xs" onClick={onRetry}>
                  Retry
                </Button>
              )}
            </Stack>
          </Alert>
        )}

        {validationError && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow">
            {validationError}
          </Alert>
        )}

        {!loading && !error && (
          <ScrollArea.Autosize mah={360}>
            <Checkbox.Group
              value={draftIds}
              onChange={setDraftIds}
              label="Included workstreams"
              description="Unchecked workstreams remain synced from ADO but are excluded from this Dashboard."
            >
              <Stack gap="sm" mt="sm">
                {workstreams.map((workstream) => (
                  <Checkbox
                    key={workstream.id}
                    value={workstream.id}
                    label={workstream.name}
                    description={workstream.adoAreaPath ?? undefined}
                  />
                ))}
              </Stack>
            </Checkbox.Group>
          </ScrollArea.Autosize>
        )}

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || Boolean(error) || draftIds.length === 0}>
            Save scope
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
