'use client';

import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import { Alert, Button, Loader, Stack, Text } from '@mantine/core';

export interface SyncControlProps {
  onSync: () => void;
  syncInProgress: boolean;
  syncError: string | null;
  syncPartialSuccess: boolean;
  isAuthError?: boolean;
  onUpdateCredentials?: () => void;
  onDismissError?: () => void;
}

/**
 * Sync Now button with in-flight feedback and non-blocking error/partial-success messaging.
 */
export function SyncControl({
  onSync,
  syncInProgress,
  syncError,
  syncPartialSuccess,
  isAuthError = false,
  onUpdateCredentials,
  onDismissError,
}: SyncControlProps) {
  return (
    <Stack gap="xs" align="flex-end">
      <Button
        variant="light"
        leftSection={
          syncInProgress ? (
            <Loader size="sm" color="var(--mantine-color-blue-6)" />
          ) : (
            <IconRefresh size={16} />
          )
        }
        onClick={onSync}
        disabled={syncInProgress}
        aria-busy={syncInProgress}
        aria-label={syncInProgress ? 'Syncing…' : 'Sync Now'}
      >
        {syncInProgress ? 'Syncing…' : 'Sync Now'}
      </Button>

      {syncError && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title={isAuthError ? 'ADO credentials expired or invalid' : 'Sync failed'}
          color="red"
          variant="light"
          w="100%"
          data-testid="sync-error-alert"
        >
          <Stack gap="xs">
            <Text size="sm">{syncError}</Text>
            {isAuthError && onUpdateCredentials && (
              <Button variant="light" size="xs" color="red" onClick={onUpdateCredentials}>
                Update ADO credentials
              </Button>
            )}
            {onDismissError && (
              <Button variant="subtle" size="xs" color="red" onClick={onDismissError}>
                Dismiss
              </Button>
            )}
          </Stack>
        </Alert>
      )}

      {syncPartialSuccess && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Partial success"
          color="yellow"
          variant="light"
          w="100%"
          data-testid="sync-partial-success-alert"
        >
          <Text size="sm">Sync completed but metrics refresh failed. Use Sync Now to retry.</Text>
        </Alert>
      )}
    </Stack>
  );
}
