/**
 * Milestone request body validation.
 * Used for POST (create) and PATCH (update) payloads.
 *
 * Validation rules:
 * - title: required, non-empty trimmed string
 * - workstreamId: required (create), must reference existing workstream when provided
 * - targetMonth: required (create), optional (update), valid ISO date when provided
 * - status: optional (create, defaults to NotStarted), must be valid MilestoneStatus when provided
 * - adoFeatureId: optional positive integer
 * - notes: optional string
 */

import type { MilestoneStatus } from '@prisma/client';

const VALID_STATUSES: MilestoneStatus[] = ['NotStarted', 'InProgress', 'Done'];

type Valid<T> = { ok: true; value: T };
type Invalid = { ok: false; error: string };
type VResult<T> = Valid<T> | Invalid;

function ok<T>(value: T): Valid<T> {
  return { ok: true, value };
}
function err(message: string): Invalid {
  return { ok: false, error: message };
}

export interface MilestoneCreateInput {
  title?: unknown;
  workstreamId?: unknown;
  targetMonth?: unknown;
  status?: unknown;
  adoFeatureId?: unknown;
  notes?: unknown;
}

export interface MilestoneUpdateInput {
  title?: unknown;
  workstreamId?: unknown;
  targetMonth?: unknown;
  status?: unknown;
  adoFeatureId?: unknown;
  notes?: unknown;
}

export interface MilestoneCreateData {
  title: string;
  workstreamId: string;
  targetMonth: Date;
  status: MilestoneStatus;
  adoFeatureId?: number | null;
  notes?: string | null;
}

export interface ValidationResult {
  ok: true;
  data: MilestoneCreateData;
}

export interface MilestoneUpdateData {
  title?: string;
  workstreamId?: string;
  targetMonth?: Date;
  status?: MilestoneStatus;
  adoFeatureId?: number | null;
  notes?: string | null;
}

export interface UpdateValidationResult {
  ok: true;
  data: MilestoneUpdateData;
}

export interface ValidationError {
  ok: false;
  errors: string[];
}

export type ValidationOutcome = ValidationResult | ValidationError;
export type UpdateValidationOutcome = UpdateValidationResult | ValidationError;

/**
 * Validate create payload. All required fields must be present and valid.
 */
export function validateCreate(input: MilestoneCreateInput): ValidationOutcome {
  const errors: string[] = [];

  const titleR = validateTitle(input.title);
  const title = titleR.ok ? titleR.value : (errors.push(titleR.error), null);

  const workstreamIdR = validateWorkstreamId(input.workstreamId);
  const workstreamId = workstreamIdR.ok
    ? workstreamIdR.value
    : (errors.push(workstreamIdR.error), null);

  const targetMonthR = validateTargetMonth(input.targetMonth);
  const targetMonth = targetMonthR.ok
    ? targetMonthR.value
    : (errors.push(targetMonthR.error), null);

  const statusR = validateStatus(input.status, 'NotStarted');
  const status = statusR.ok ? statusR.value : (errors.push(statusR.error), null);

  const adoFeatureIdR = validateAdoFeatureId(input.adoFeatureId);
  const adoFeatureId = adoFeatureIdR.ok
    ? adoFeatureIdR.value
    : (errors.push(adoFeatureIdR.error), null);

  const notesR = validateNotes(input.notes);
  const notes = notesR.ok ? notesR.value : (errors.push(notesR.error), null);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      title: title!,
      workstreamId: workstreamId!,
      targetMonth: targetMonth!,
      status: status!,
      adoFeatureId: adoFeatureId ?? undefined,
      notes: notes ?? undefined,
    },
  };
}

/**
 * Validate update payload. Only provided fields are validated.
 */
export function validateUpdate(input: MilestoneUpdateInput): UpdateValidationOutcome {
  const errors: string[] = [];
  const updates: MilestoneUpdateData = {};

  if (input.title !== undefined) {
    const t = validateTitle(input.title);
    if (t.ok) {
      updates.title = t.value;
    } else {
      errors.push(t.error);
    }
  }
  if (input.workstreamId !== undefined) {
    const w = validateWorkstreamId(input.workstreamId);
    if (w.ok) {
      updates.workstreamId = w.value;
    } else {
      errors.push(w.error);
    }
  }
  if (input.targetMonth !== undefined) {
    const tm = validateTargetMonth(input.targetMonth);
    if (tm.ok) {
      updates.targetMonth = tm.value;
    } else {
      errors.push(tm.error);
    }
  }
  if (input.status !== undefined) {
    const s = validateStatusValue(input.status);
    if (s.ok) {
      updates.status = s.value;
    } else {
      errors.push(s.error);
    }
  }
  if (input.adoFeatureId !== undefined) {
    const a = validateAdoFeatureId(input.adoFeatureId);
    if (a.ok) {
      updates.adoFeatureId = a.value;
    } else {
      errors.push(a.error);
    }
  }
  if (input.notes !== undefined) {
    const n = validateNotes(input.notes);
    if (n.ok) {
      updates.notes = n.value ?? null;
    } else {
      errors.push(n.error);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: updates };
}

function validateTitle(value: unknown): VResult<string> {
  if (value === undefined || value === null) {
    return err('title is required and must be a non-empty string');
  }
  if (typeof value !== 'string') {
    return err('title must be a string');
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return err('title must be a non-empty string (after trimming)');
  }
  return ok(trimmed);
}

function validateWorkstreamId(value: unknown): VResult<string> {
  if (value === undefined || value === null) {
    return err('workstreamId is required');
  }
  if (typeof value !== 'string') {
    return err('workstreamId must be a string');
  }
  if (value.trim().length === 0) {
    return err('workstreamId must be a non-empty string');
  }
  return ok(value.trim());
}

function validateTargetMonth(value: unknown): VResult<Date> {
  if (value === undefined || value === null) {
    return err('targetMonth is required and must be a valid ISO date string');
  }
  if (typeof value !== 'string') {
    return err('targetMonth must be a valid ISO date string');
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return err('targetMonth must be a valid ISO date string');
  }
  return ok(parsed);
}

function validateStatus(value: unknown, defaultValue: MilestoneStatus): VResult<MilestoneStatus> {
  if (value === undefined || value === null) {
    return ok(defaultValue);
  }
  return validateStatusValue(value);
}

function validateStatusValue(value: unknown): VResult<MilestoneStatus> {
  if (value === undefined || value === null) {
    return err('status must be one of: NotStarted, InProgress, Done');
  }
  if (typeof value !== 'string') {
    return err('status must be one of: NotStarted, InProgress, Done');
  }
  if (!VALID_STATUSES.includes(value as MilestoneStatus)) {
    return err('status must be one of: NotStarted, InProgress, Done');
  }
  return ok(value as MilestoneStatus);
}

function validateAdoFeatureId(value: unknown): VResult<number | null> {
  if (value === undefined || value === null) {
    return ok(null);
  }
  if (typeof value !== 'number') {
    return err('adoFeatureId must be a positive integer');
  }
  if (!Number.isInteger(value) || value < 0) {
    return err('adoFeatureId must be a positive integer');
  }
  return ok(value);
}

function validateNotes(value: unknown): VResult<string | null> {
  if (value === undefined || value === null) {
    return ok(null);
  }
  if (typeof value !== 'string') {
    return err('notes must be a string');
  }
  return ok(value);
}
