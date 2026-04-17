'use client';

import { IconAlertCircle, IconPresentation } from '@tabler/icons-react';
import { Alert, Button, Loader, Stack, Text } from '@mantine/core';

export interface ExportControlProps {
  onExport: () => void;
  isExporting: boolean;
  exportError: string | null;
  onDismissError?: () => void;
}

/**
 * Export PPTX button with in-flight feedback and non-blocking error messaging.
 * Mirrors the SyncControl pattern for consistent UX.
 */
export function ExportControl({ onExport, isExporting, exportError, onDismissError }: ExportControlProps) {
  return (
    <Stack gap="xs" align="flex-end">
      <Button
        variant="light"
        leftSection={
          isExporting ? (
            <Loader size="sm" color="var(--mantine-color-blue-6)" />
          ) : (
            <IconPresentation size={16} />
          )
        }
        onClick={onExport}
        disabled={isExporting}
        aria-busy={isExporting}
        aria-label={isExporting ? 'Generating presentation…' : 'Export PPTX'}
      >
        {isExporting ? 'Generating…' : 'Export PPTX'}
      </Button>

      {exportError && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Export failed"
          color="red"
          variant="light"
          w="100%"
          data-testid="export-error-alert"
        >
          <Stack gap="xs">
            <Text size="sm">{exportError}</Text>
            {onDismissError && (
              <Button variant="subtle" size="xs" color="red" onClick={onDismissError}>
                Dismiss
              </Button>
            )}
          </Stack>
        </Alert>
      )}
    </Stack>
  );
}
