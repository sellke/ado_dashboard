/**
 * @jest-environment node
 */

import { bootstrapDefaultDataIfEmpty } from '@/lib/db/bootstrap';
import { DEFAULT_SYNC_WORKSTREAMS } from '@/lib/sync/defaults';
import { cleanupTestData, prisma } from '../../prisma/helpers';

describe('bootstrapDefaultDataIfEmpty', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  it('creates default workstreams and config when the table is empty', async () => {
    const result = await bootstrapDefaultDataIfEmpty(prisma);

    expect(result).toEqual({
      bootstrapped: true,
      workstreamsCreated: DEFAULT_SYNC_WORKSTREAMS.length,
    });

    const workstreams = await prisma.workstream.findMany({ orderBy: { name: 'asc' } });
    expect(workstreams).toHaveLength(DEFAULT_SYNC_WORKSTREAMS.length);
    expect(workstreams.every((workstream) => workstream.syncEnabled)).toBe(true);

    const programConfig = await prisma.syncProgramConfig.findFirst();
    expect(programConfig).not.toBeNull();

    const thresholds = await prisma.thresholdConfig.count();
    expect(thresholds).toBeGreaterThan(0);
  });

  it('is a no-op when workstreams already exist', async () => {
    await prisma.workstream.create({
      data: {
        name: 'Existing Stream',
        adoAreaPath: 'Project\\Area',
        adoOrg: 'Operations-Innovation',
        adoProject: 'Event Streaming Platform',
        adoTeamId: 'team-id',
        syncEnabled: true,
      },
    });

    const result = await bootstrapDefaultDataIfEmpty(prisma);

    expect(result).toEqual({ bootstrapped: false, workstreamsCreated: 0 });
    expect(await prisma.workstream.count()).toBe(1);
  });
});
