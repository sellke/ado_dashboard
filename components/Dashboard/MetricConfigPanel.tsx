'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  DASHBOARD_THRESHOLD_METRICS,
  validateEngineConfig,
  validateRuleConfigs,
  validateThresholds,
  type ConfigValidationError,
} from '@/lib/metrics/config-validation';
import type {
  MetricEngineConfigInput,
  MetricRuleConfigInput,
  ThresholdConfigInput,
} from '@/lib/metrics/types';
import {
  CONFIGURABLE_WORK_ITEM_TYPES,
  DEFAULT_ENGINE_CONFIG,
  METRIC_CATEGORIES,
} from '@/lib/metrics/types';

interface MetricConfigResponse {
  thresholds: ThresholdConfigInput[];
  engine: MetricEngineConfigInput;
  rules: MetricRuleConfigInput[];
  error?: string;
}

interface MetricConfigPanelProps {
  opened: boolean;
  onClose: () => void;
  onRecomputed?: () => Promise<void> | void;
  recalculateSprintId?: string | null;
}

type EditableThreshold = Record<keyof ThresholdConfigInput, string>;
type EditableEngine = Record<keyof MetricEngineConfigInput, string>;

const METRIC_LABELS: Record<string, string> = {
  overheadPercent: 'Overhead percent',
  carryOverRate: 'Carry-over rate',
  deliveryToBugRatio: 'Delivery-to-bug ratio',
};

function toEditable(threshold: ThresholdConfigInput): EditableThreshold {
  return {
    metricName: threshold.metricName,
    greenMin: String(threshold.greenMin),
    greenMax: String(threshold.greenMax),
    amberMin: String(threshold.amberMin),
    amberMax: String(threshold.amberMax),
  };
}

function toThreshold(editable: EditableThreshold): ThresholdConfigInput {
  const parseNumber = (value: string) => (value.trim() === '' ? Number.NaN : Number(value));

  return {
    metricName: editable.metricName,
    greenMin: parseNumber(editable.greenMin),
    greenMax: parseNumber(editable.greenMax),
    amberMin: parseNumber(editable.amberMin),
    amberMax: parseNumber(editable.amberMax),
  };
}

function errorFor(errors: ConfigValidationError[], field: string): string | undefined {
  return errors.find((error) => error.field === field)?.message;
}

function toEditableEngine(engine: MetricEngineConfigInput): EditableEngine {
  return {
    velocityGreenFloor: String(engine.velocityGreenFloor),
    velocityAmberFloor: String(engine.velocityAmberFloor),
    rollingWindow: String(engine.rollingWindow),
    cycleTimeRollingWindow: String(engine.cycleTimeRollingWindow),
  };
}

function parseEditableEngine(engine: EditableEngine): MetricEngineConfigInput {
  const parseNumber = (value: string) => (value.trim() === '' ? Number.NaN : Number(value));

  return {
    velocityGreenFloor: parseNumber(engine.velocityGreenFloor),
    velocityAmberFloor: parseNumber(engine.velocityAmberFloor),
    rollingWindow: parseNumber(engine.rollingWindow),
    cycleTimeRollingWindow: parseNumber(engine.cycleTimeRollingWindow),
  };
}

export function MetricConfigPanel({
  opened,
  onClose,
  onRecomputed,
  recalculateSprintId,
}: MetricConfigPanelProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [thresholds, setThresholds] = useState<EditableThreshold[]>([]);
  const [engine, setEngine] = useState<EditableEngine>(toEditableEngine(DEFAULT_ENGINE_CONFIG));
  const [rules, setRules] = useState<MetricRuleConfigInput[]>([]);
  const [validationErrors, setValidationErrors] = useState<ConfigValidationError[]>([]);

  const parsedThresholds = useMemo(() => thresholds.map(toThreshold), [thresholds]);

  async function loadConfig() {
    setLoading(true);
    setLoadError(null);
    setValidationErrors([]);

    try {
      const res = await fetch('/api/metric-config');
      const data = (await res.json()) as MetricConfigResponse;
      if (!res.ok) {
        setLoadError(data.error ?? `Request failed: ${res.status}`);
        setThresholds([]);
        return;
      }
      const visible = data.thresholds.filter((threshold) =>
        DASHBOARD_THRESHOLD_METRICS.includes(threshold.metricName as any)
      );
      setThresholds(visible.map(toEditable));
      setEngine(toEditableEngine(data.engine));
      setRules(data.rules);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load metric configuration');
      setThresholds([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (opened) {
      loadConfig();
    }
  }, [opened]);

  function updateThreshold(index: number, field: keyof ThresholdConfigInput, value: string) {
    setThresholds((current) =>
      current.map((threshold, i) => (i === index ? { ...threshold, [field]: value } : threshold))
    );
  }

  function updateEngine(field: keyof MetricEngineConfigInput, value: string) {
    setEngine((current) => ({ ...current, [field]: value }));
  }

  function updateRule(
    category: MetricRuleConfigInput['category'],
    workItemType: string,
    included: boolean
  ) {
    setRules((current) => {
      const existing = current.find(
        (rule) => rule.category === category && rule.workItemType === workItemType
      );
      if (existing) {
        return current.map((rule) =>
          rule.category === category && rule.workItemType === workItemType
            ? { ...rule, included }
            : rule
        );
      }
      return [...current, { category, workItemType, included }];
    });
  }

  async function saveThresholds() {
    const errors = validateThresholds(parsedThresholds);
    setValidationErrors(errors);
    if (errors.length > 0) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/metric-config/thresholds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thresholds: parsedThresholds }),
      });
      const data = (await res.json()) as {
        thresholds?: ThresholdConfigInput[];
        errors?: ConfigValidationError[];
        error?: string;
      };
      if (res.status === 422 && data.errors) {
        setValidationErrors(data.errors);
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
      setThresholds((data.thresholds ?? parsedThresholds).map(toEditable));
      notifications.show({
        color: 'green',
        title: 'Saved',
        message: 'Metric thresholds saved.',
      });
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Save failed',
        message: err instanceof Error ? err.message : 'Failed to save metric configuration',
      });
    } finally {
      setSaving(false);
    }
  }

  async function saveRules() {
    const errors = validateRuleConfigs(rules);
    setValidationErrors(errors);
    if (errors.length > 0) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/metric-config/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules }),
      });
      const data = (await res.json()) as {
        rules?: MetricRuleConfigInput[];
        errors?: ConfigValidationError[];
        error?: string;
      };
      if (res.status === 422 && data.errors) {
        setValidationErrors(data.errors);
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
      setRules(data.rules ?? rules);
      notifications.show({ color: 'green', title: 'Saved', message: 'Metric rules saved.' });
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Save failed',
        message: err instanceof Error ? err.message : 'Failed to save metric rules',
      });
    } finally {
      setSaving(false);
    }
  }

  async function saveEngine() {
    const parsedEngine = parseEditableEngine(engine);
    const errors = validateEngineConfig(parsedEngine);
    setValidationErrors(errors);
    if (errors.length > 0) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/metric-config/engine', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedEngine),
      });
      const data = (await res.json()) as {
        engine?: MetricEngineConfigInput;
        errors?: ConfigValidationError[];
        error?: string;
      };
      if (res.status === 422 && data.errors) {
        setValidationErrors(data.errors);
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
      setEngine(toEditableEngine(data.engine ?? parsedEngine));
      notifications.show({ color: 'green', title: 'Saved', message: 'Metric engine saved.' });
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Save failed',
        message: err instanceof Error ? err.message : 'Failed to save metric engine',
      });
    } finally {
      setSaving(false);
    }
  }

  async function recalculateNow() {
    setRecomputing(true);
    try {
      const body = recalculateSprintId
        ? JSON.stringify({ sprintId: recalculateSprintId })
        : undefined;
      const res = await fetch('/api/metrics/compute', {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body,
      });
      const data = (await res.json()) as {
        success?: boolean;
        snapshotsCreated?: number;
        sprintName?: string;
        error?: string;
      };
      if (!res.ok || data.success === false) {
        notifications.show({
          color: 'red',
          title: 'Recalculate failed',
          message: data.error ?? `Request failed: ${res.status}`,
        });
        return;
      }
      await onRecomputed?.();
      notifications.show({
        color: 'green',
        title: 'Recalculated',
        message: `Updated ${data.snapshotsCreated ?? 0} workstream snapshot${
          data.snapshotsCreated === 1 ? '' : 's'
        }${data.sprintName ? ` for ${data.sprintName}` : ''}.`,
      });
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Recalculate failed',
        message: err instanceof Error ? err.message : 'Failed to recalculate metrics',
      });
    } finally {
      setRecomputing(false);
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Metric Configuration" size="xl">
      <Stack gap="md">
        {loading ? (
          <Group gap="sm">
            <Loader size="sm" />
            <Text size="sm">Loading metric configuration...</Text>
          </Group>
        ) : null}

        {loadError ? (
          <Alert color="red" title="Metric configuration unavailable">
            <Stack gap="sm">
              <Text size="sm">{loadError}</Text>
              <Button variant="light" color="red" onClick={loadConfig}>
                Retry
              </Button>
            </Stack>
          </Alert>
        ) : null}

        <Tabs defaultValue="thresholds">
          <Tabs.List>
            <Tabs.Tab value="thresholds">Thresholds</Tabs.Tab>
            <Tabs.Tab value="rules">Inclusion Rules</Tabs.Tab>
            <Tabs.Tab value="velocity">Velocity & Rolling</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="thresholds" pt="md">
            <Stack gap="lg">
              {thresholds.map((threshold, index) => (
                <Stack key={threshold.metricName} gap="xs">
                  <div>
                    <Text fw={600}>
                      {METRIC_LABELS[threshold.metricName] ?? threshold.metricName}
                    </Text>
                    {threshold.metricName === 'deliveryToBugRatio' ? (
                      <Text size="sm" c="dimmed">
                        Lower is healthier. The zero-bug healthy case is fixed and not configurable.
                      </Text>
                    ) : null}
                  </div>
                  <Group grow align="flex-start">
                    <TextInput
                      label={`${METRIC_LABELS[threshold.metricName] ?? threshold.metricName} Green min`}
                      value={threshold.greenMin}
                      inputMode="decimal"
                      error={errorFor(validationErrors, `thresholds.${index}.greenMin`)}
                      onChange={(event) =>
                        updateThreshold(index, 'greenMin', event.currentTarget.value)
                      }
                    />
                    <TextInput
                      label={`${METRIC_LABELS[threshold.metricName] ?? threshold.metricName} Green max`}
                      value={threshold.greenMax}
                      inputMode="decimal"
                      error={errorFor(validationErrors, `thresholds.${index}.greenMax`)}
                      onChange={(event) =>
                        updateThreshold(index, 'greenMax', event.currentTarget.value)
                      }
                    />
                    <TextInput
                      label={`${METRIC_LABELS[threshold.metricName] ?? threshold.metricName} Amber min`}
                      value={threshold.amberMin}
                      inputMode="decimal"
                      error={errorFor(validationErrors, `thresholds.${index}.amberMin`)}
                      onChange={(event) =>
                        updateThreshold(index, 'amberMin', event.currentTarget.value)
                      }
                    />
                    <TextInput
                      label={`${METRIC_LABELS[threshold.metricName] ?? threshold.metricName} Amber max`}
                      value={threshold.amberMax}
                      inputMode="decimal"
                      error={errorFor(validationErrors, `thresholds.${index}.amberMax`)}
                      onChange={(event) =>
                        updateThreshold(index, 'amberMax', event.currentTarget.value)
                      }
                    />
                  </Group>
                </Stack>
              ))}

              <Group justify="flex-end">
                <Button onClick={saveThresholds} loading={saving} disabled={loading || !!loadError}>
                  Save thresholds
                </Button>
              </Group>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="rules" pt="md">
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Defaults reproduce current behavior: Bug and Spike are excluded from delivery
                points; Bug, Spike, and Support count toward overhead hours.
              </Text>
              {METRIC_CATEGORIES.map((category) => (
                <Stack key={category} gap="xs">
                  <Text fw={600}>
                    {category === 'deliveryPoints' ? 'Delivery points' : 'Overhead hours'}
                  </Text>
                  <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
                    {CONFIGURABLE_WORK_ITEM_TYPES.map((workItemType) => {
                      const checked =
                        rules.find(
                          (rule) => rule.category === category && rule.workItemType === workItemType
                        )?.included ?? false;
                      return (
                        <Checkbox
                          key={`${category}-${workItemType}`}
                          aria-label={`Include ${workItemType} in ${
                            category === 'deliveryPoints' ? 'delivery points' : 'overhead hours'
                          }`}
                          label={workItemType}
                          checked={checked}
                          onChange={(event) =>
                            updateRule(category, workItemType, event.currentTarget.checked)
                          }
                        />
                      );
                    })}
                  </SimpleGrid>
                </Stack>
              ))}
              <Group justify="flex-end">
                <Button onClick={saveRules} loading={saving} disabled={loading || !!loadError}>
                  Save rules
                </Button>
              </Group>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="velocity" pt="md">
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Defaults match current behavior: Green at 1.0x rolling average, Amber at 0.7x, using
                a 4-sprint rolling window. Cycle time uses its own rolling sprint window.
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="md">
                <TextInput
                  label="Velocity green floor"
                  value={engine.velocityGreenFloor}
                  inputMode="decimal"
                  error={errorFor(validationErrors, 'velocityGreenFloor')}
                  onChange={(event) =>
                    updateEngine('velocityGreenFloor', event.currentTarget.value)
                  }
                />
                <TextInput
                  label="Velocity amber floor"
                  value={engine.velocityAmberFloor}
                  inputMode="decimal"
                  error={errorFor(validationErrors, 'velocityAmberFloor')}
                  onChange={(event) =>
                    updateEngine('velocityAmberFloor', event.currentTarget.value)
                  }
                />
                <TextInput
                  label="Rolling window"
                  value={engine.rollingWindow}
                  inputMode="numeric"
                  error={errorFor(validationErrors, 'rollingWindow')}
                  onChange={(event) => updateEngine('rollingWindow', event.currentTarget.value)}
                />
                <TextInput
                  label="Cycle-time window"
                  value={engine.cycleTimeRollingWindow}
                  inputMode="numeric"
                  error={errorFor(validationErrors, 'cycleTimeRollingWindow')}
                  onChange={(event) =>
                    updateEngine('cycleTimeRollingWindow', event.currentTarget.value)
                  }
                />
              </SimpleGrid>
              <Group justify="flex-end">
                <Button onClick={saveEngine} loading={saving} disabled={loading || !!loadError}>
                  Save velocity & rolling
                </Button>
              </Group>
            </Stack>
          </Tabs.Panel>
        </Tabs>

        <Group justify="space-between" pt="md" align="flex-end">
          <Stack gap={2}>
            <Text fw={600}>Apply saved configuration</Text>
            <Text size="sm" c="dimmed">
              Saved changes affect future computes. Recalculate now to refresh stored snapshots
              immediately.
            </Text>
          </Stack>
          <Button
            onClick={recalculateNow}
            loading={recomputing}
            disabled={loading || saving || recomputing}
          >
            Recalculate now
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
