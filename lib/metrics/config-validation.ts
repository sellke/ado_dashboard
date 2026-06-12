import {
  CONFIGURABLE_WORK_ITEM_TYPES,
  METRIC_CATEGORIES,
  type MetricCategory,
  type MetricEngineConfigInput,
  type MetricRuleConfigInput,
  type ThresholdConfigInput,
} from './types';

export interface ConfigValidationError {
  field: string;
  message: string;
}

export const DASHBOARD_THRESHOLD_METRICS = [
  'overheadPercent',
  'carryOverRate',
  'deliveryToBugRatio',
] as const;

const LOWER_IS_HEALTHIER_METRICS = new Set<string>(DASHBOARD_THRESHOLD_METRICS);
const SEEDED_RANGE_STEP_TOLERANCE = 0.010001;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function validateThresholds(thresholds: ThresholdConfigInput[]): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  thresholds.forEach((threshold, index) => {
    const prefix = `thresholds.${index}`;
    if (!threshold || typeof threshold !== 'object' || Array.isArray(threshold)) {
      errors.push({ field: prefix, message: 'Threshold entry must be an object' });
      return;
    }
    if (!DASHBOARD_THRESHOLD_METRICS.includes(threshold.metricName as any)) {
      errors.push({
        field: `${prefix}.metricName`,
        message: `Unsupported threshold metric: ${threshold.metricName}`,
      });
    }

    for (const field of ['greenMin', 'greenMax', 'amberMin', 'amberMax'] as const) {
      if (!isFiniteNumber(threshold[field])) {
        errors.push({ field: `${prefix}.${field}`, message: `${field} must be a finite number` });
      }
    }

    if (threshold.greenMin > threshold.greenMax) {
      errors.push({
        field: `${prefix}.greenMax`,
        message: 'Green minimum must be less than or equal to Green maximum',
      });
    }
    if (threshold.amberMin > threshold.amberMax) {
      errors.push({
        field: `${prefix}.amberMax`,
        message: 'Amber minimum must be less than or equal to Amber maximum',
      });
    }

    if (LOWER_IS_HEALTHIER_METRICS.has(threshold.metricName)) {
      if (threshold.greenMin !== 0) {
        errors.push({
          field: `${prefix}.greenMin`,
          message: `${threshold.metricName} is lower-is-healthier; green range must start at 0`,
        });
      }
      if (threshold.greenMax > threshold.amberMin) {
        errors.push({
          field: `${prefix}.amberMin`,
          message: `${threshold.metricName} is lower-is-healthier; amber range must start at or above the green range`,
        });
      }
      if (threshold.amberMin - threshold.greenMax > SEEDED_RANGE_STEP_TOLERANCE) {
        errors.push({
          field: `${prefix}.amberMin`,
          message: 'Threshold ranges must not leave a gap that would silently grade as Red',
        });
      }
    }
  });

  return errors;
}

export function validateEngineConfig(
  engine: Partial<Record<keyof MetricEngineConfigInput, unknown>>
): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];
  const velocityAmberFloor = engine.velocityAmberFloor;
  const velocityGreenFloor = engine.velocityGreenFloor;
  const rollingWindow = engine.rollingWindow;

  if (!isFiniteNumber(velocityAmberFloor) || velocityAmberFloor <= 0) {
    errors.push({
      field: 'velocityAmberFloor',
      message: 'Velocity amber floor must be greater than 0',
    });
  }
  if (!isFiniteNumber(velocityGreenFloor) || velocityGreenFloor <= 0) {
    errors.push({
      field: 'velocityGreenFloor',
      message: 'Velocity green floor must be greater than 0',
    });
  }
  if (
    isFiniteNumber(velocityAmberFloor) &&
    isFiniteNumber(velocityGreenFloor) &&
    velocityAmberFloor > velocityGreenFloor
  ) {
    errors.push({
      field: 'velocityAmberFloor',
      message: 'Velocity amber floor must be less than or equal to green floor',
    });
  }
  if (!Number.isInteger(rollingWindow) || (isFiniteNumber(rollingWindow) && rollingWindow < 1)) {
    errors.push({
      field: 'rollingWindow',
      message: 'Rolling window must be an integer greater than or equal to 1',
    });
  }

  return errors;
}

export function validateRuleConfigs(rules: MetricRuleConfigInput[]): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  rules.forEach((rule, index) => {
    const prefix = `rules.${index}`;
    if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
      errors.push({ field: prefix, message: 'Rule entry must be an object' });
      return;
    }
    if (!METRIC_CATEGORIES.includes(rule.category as MetricCategory)) {
      errors.push({
        field: `${prefix}.category`,
        message: `Unsupported metric category: ${rule.category}`,
      });
    }
    if (!CONFIGURABLE_WORK_ITEM_TYPES.includes(rule.workItemType as any)) {
      errors.push({
        field: `${prefix}.workItemType`,
        message: `Unsupported work item type: ${rule.workItemType}`,
      });
    }
    if (typeof rule.included !== 'boolean') {
      errors.push({
        field: `${prefix}.included`,
        message: 'Included must be a boolean',
      });
    }
  });

  return errors;
}
