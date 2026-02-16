/**
 * @jest-environment node
 *
 * Unit tests for lib/milestones/validation.ts
 */

import { validateCreate, validateUpdate } from '@/lib/milestones/validation';

describe('validateCreate', () => {
  it('should accept valid create payload', () => {
    const result = validateCreate({
      title: 'Q1 Release',
      workstreamId: 'ws-1',
      targetMonth: '2026-03-01',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.title).toBe('Q1 Release');
      expect(result.data.workstreamId).toBe('ws-1');
      expect(result.data.targetMonth).toEqual(new Date('2026-03-01'));
      expect(result.data.status).toBe('NotStarted');
      expect(result.data.adoFeatureId).toBeFalsy();
      expect(result.data.notes).toBeFalsy();
    }
  });

  it('should trim title', () => {
    const result = validateCreate({
      title: '  Q1 Release  ',
      workstreamId: 'ws-1',
      targetMonth: '2026-03-01',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.title).toBe('Q1 Release');
  });

  it('should reject missing title', () => {
    const result = validateCreate({
      workstreamId: 'ws-1',
      targetMonth: '2026-03-01',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('title'))).toBe(true);
    }
  });

  it('should reject empty title', () => {
    const result = validateCreate({
      title: '   ',
      workstreamId: 'ws-1',
      targetMonth: '2026-03-01',
    });
    expect(result.ok).toBe(false);
  });

  it('should reject missing workstreamId', () => {
    const result = validateCreate({
      title: 'Q1 Release',
      targetMonth: '2026-03-01',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('workstreamId'))).toBe(true);
    }
  });

  it('should reject invalid targetMonth', () => {
    const result = validateCreate({
      title: 'Q1 Release',
      workstreamId: 'ws-1',
      targetMonth: 'not-a-date',
    });
    expect(result.ok).toBe(false);
  });

  it('should reject invalid status', () => {
    const result = validateCreate({
      title: 'Q1 Release',
      workstreamId: 'ws-1',
      targetMonth: '2026-03-01',
      status: 'InvalidStatus',
    });
    expect(result.ok).toBe(false);
  });

  it('should accept explicit status', () => {
    const result = validateCreate({
      title: 'Q1 Release',
      workstreamId: 'ws-1',
      targetMonth: '2026-03-01',
      status: 'InProgress',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe('InProgress');
  });

  it('should accept optional adoFeatureId and notes', () => {
    const result = validateCreate({
      title: 'Q1 Release',
      workstreamId: 'ws-1',
      targetMonth: '2026-03-01',
      adoFeatureId: 12345,
      notes: 'On track',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.adoFeatureId).toBe(12345);
      expect(result.data.notes).toBe('On track');
    }
  });
});

describe('validateUpdate', () => {
  it('should accept valid partial update', () => {
    const result = validateUpdate({
      title: 'Updated Title',
      status: 'Done',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.title).toBe('Updated Title');
      expect(result.data.status).toBe('Done');
    }
  });

  it('should accept empty update (no fields)', () => {
    const result = validateUpdate({});
    expect(result.ok).toBe(true);
    if (result.ok) expect(Object.keys(result.data)).toHaveLength(0);
  });

  it('should reject invalid status on update', () => {
    const result = validateUpdate({ status: 'Invalid' });
    expect(result.ok).toBe(false);
  });

  it('should reject empty title on update', () => {
    const result = validateUpdate({ title: '   ' });
    expect(result.ok).toBe(false);
  });
});
