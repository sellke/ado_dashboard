/**
 * @jest-environment node
 */

import { MilestoneStatus } from '@prisma/client';
import { cleanupTestData, prisma } from './helpers';

describe('MilestoneStatus enum', () => {
  let workstreamId: string;

  beforeEach(async () => {
    const workstream = await prisma.workstream.create({
      data: {
        name: 'Platform',
        adoAreaPath: 'Project\\Platform',
      },
    });
    workstreamId = workstream.id;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ──────────────────────────────────────────────────────────────
  // Enum values exist
  // ──────────────────────────────────────────────────────────────

  it('should have all expected MilestoneStatus enum values', () => {
    const expectedValues: MilestoneStatus[] = ['NotStarted', 'InProgress', 'Done'];

    expectedValues.forEach((value) => {
      expect(Object.values(MilestoneStatus)).toContain(value);
    });

    // Ensure no extra values exist
    expect(Object.values(MilestoneStatus)).toHaveLength(expectedValues.length);
  });

  // ──────────────────────────────────────────────────────────────
  // Each enum value can be used in Milestone creation
  // ──────────────────────────────────────────────────────────────

  const allMilestoneStatuses: MilestoneStatus[] = ['NotStarted', 'InProgress', 'Done'];

  it.each(allMilestoneStatuses)('should accept MilestoneStatus enum value: %s', async (status) => {
    const milestone = await prisma.milestone.create({
      data: {
        title: `Milestone with status ${status}`,
        workstreamId,
        targetMonth: new Date('2026-03-01'),
        status,
      },
    });

    expect(milestone.status).toBe(status);
  });

  // ──────────────────────────────────────────────────────────────
  // Invalid enum values are rejected
  // ──────────────────────────────────────────────────────────────

  it('should reject invalid MilestoneStatus enum value', async () => {
    await expect(
      prisma.milestone.create({
        data: {
          title: 'Invalid status milestone',
          workstreamId,
          targetMonth: new Date('2026-03-01'),
          status: 'Cancelled' as MilestoneStatus,
        },
      })
    ).rejects.toThrow();
  });
});
