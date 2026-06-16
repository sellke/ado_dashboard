'use client';

import { useEffect, useState } from 'react';
import { IconAlertCircle } from '@tabler/icons-react';
import { Alert, Button, Group, Modal, PasswordInput, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';

interface CredentialStatusResponse {
  configured: boolean;
  org: string;
  patHint?: string;
  error?: string;
}

interface CredentialSaveResponse {
  success?: boolean;
  patHint?: string;
  errorCode?: string;
  error?: string;
}

interface AdoCredentialsModalProps {
  opened: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

function errorMessageFor(code?: string, fallback?: string): string {
  if (code === 'AUTH_REJECTED') {
    return 'PAT rejected by Azure DevOps. Check scope and expiration.';
  }
  if (code === 'ENCRYPTION_UNAVAILABLE') {
    return 'Credential encryption is not configured. Set CREDENTIAL_ENCRYPTION_KEY and try again.';
  }
  if (code === 'MISSING_ORG') {
    return 'ADO_ORG is not configured on the server.';
  }
  if (code === 'VALIDATION_ERROR') {
    return fallback ?? 'PAT must be between 20 and 200 characters.';
  }
  return fallback ?? 'Could not save ADO credentials.';
}

export function AdoCredentialsModal({ opened, onClose, onSaved }: AdoCredentialsModalProps) {
  const [org, setOrg] = useState('');
  const [patHint, setPatHint] = useState<string | null>(null);
  const [pat, setPat] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) {
      setPat('');
      setError(null);
      return;
    }

    async function loadStatus() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/ado/credentials');
        const data = (await res.json()) as CredentialStatusResponse;
        if (!res.ok) {
          setError(data.error ?? `Request failed: ${res.status}`);
          return;
        }
        setOrg(data.org);
        setPatHint(data.patHint ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load ADO credential status.');
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, [opened]);

  async function handleSave() {
    const trimmedPat = pat.trim();
    if (trimmedPat.length < 20 || trimmedPat.length > 200) {
      setError('PAT must be between 20 and 200 characters.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/ado/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pat: trimmedPat }),
      });
      const data = (await res.json()) as CredentialSaveResponse;
      if (!res.ok || !data.success) {
        setError(errorMessageFor(data.errorCode, data.error));
        return;
      }

      setPat('');
      setPatHint(data.patHint ?? null);
      notifications.show({
        color: 'green',
        title: 'ADO credentials saved',
        message: 'The new PAT will be used on the next sync or ADO discovery request.',
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save ADO credentials.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Update ADO credentials" centered>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Enter a new Azure DevOps PAT. The organization is read from server configuration.
        </Text>

        <TextInput label="Azure DevOps organization" value={org} readOnly disabled={loading} />

        {patHint && (
          <Text size="sm" c="dimmed">
            Current saved PAT ends in {patHint}.
          </Text>
        )}

        <PasswordInput
          label="Azure DevOps PAT"
          value={pat}
          onChange={(event) => setPat(event.currentTarget.value)}
          disabled={loading || saving}
          autoComplete="off"
          data-testid="ado-pat-input"
        />

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            {error}
          </Alert>
        )}

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={loading}>
            Save & validate
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
