export interface FieldValidationError {
  field: string;
  message: string;
}

export interface WorkstreamRegistryInput {
  name: string;
  adoOrg: string;
  adoProject: string;
  adoTeamId: string;
  adoAreaPath: string;
  syncEnabled: boolean;
}

export interface SyncProgramConfigInputPayload {
  adoOrg: string;
  adoProject: string;
  iterationTeamId: string;
  lookbackSprintCount: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function trimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateWorkstreamRegistryInput(
  value: unknown,
  options: { partial?: boolean } = {}
): { data: Partial<WorkstreamRegistryInput>; errors: FieldValidationError[] } {
  const body = asRecord(value);
  if (!body) {
    return {
      data: {},
      errors: [{ field: 'body', message: 'Request body must be an object' }],
    };
  }

  const errors: FieldValidationError[] = [];
  const data: Partial<WorkstreamRegistryInput> = {};
  const requiredFields = ['name', 'adoOrg', 'adoProject', 'adoTeamId', 'adoAreaPath'] as const;

  for (const field of requiredFields) {
    if (body[field] === undefined && options.partial) {
      continue;
    }
    const value = trimmedString(body[field]);
    if (!value) {
      errors.push({ field, message: `${field} is required` });
    } else {
      data[field] = value;
    }
  }

  if (body.syncEnabled !== undefined) {
    if (typeof body.syncEnabled !== 'boolean') {
      errors.push({ field: 'syncEnabled', message: 'syncEnabled must be a boolean' });
    } else {
      data.syncEnabled = body.syncEnabled;
    }
  } else if (!options.partial) {
    data.syncEnabled = true;
  }

  return { data, errors };
}

export function validateSyncProgramConfigInput(value: unknown): {
  data: Partial<SyncProgramConfigInputPayload>;
  errors: FieldValidationError[];
} {
  const body = asRecord(value);
  if (!body) {
    return {
      data: {},
      errors: [{ field: 'body', message: 'Request body must be an object' }],
    };
  }

  const errors: FieldValidationError[] = [];
  const data: Partial<SyncProgramConfigInputPayload> = {};

  for (const field of ['adoOrg', 'adoProject', 'iterationTeamId'] as const) {
    const value = trimmedString(body[field]);
    if (!value) {
      errors.push({ field, message: `${field} is required` });
    } else {
      data[field] = value;
    }
  }

  if (!Number.isInteger(body.lookbackSprintCount) || Number(body.lookbackSprintCount) < 1) {
    errors.push({
      field: 'lookbackSprintCount',
      message: 'lookbackSprintCount must be an integer greater than or equal to 1',
    });
  } else {
    data.lookbackSprintCount = Number(body.lookbackSprintCount);
  }

  return { data, errors };
}
