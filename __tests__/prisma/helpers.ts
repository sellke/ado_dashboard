import { PrismaClient } from '@prisma/client';

// Create a dedicated Prisma client for tests
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5433/nextapp?schema=public',
    },
  },
});

/**
 * Clean up test data in correct order (respecting foreign keys)
 */
export async function cleanupTestData() {
  await prisma.ceremonyInsight.deleteMany({});
  await prisma.transcript.deleteMany({});
  await prisma.workItem.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.metricSnapshot.deleteMany({});
  await prisma.sprintWorkstream.deleteMany({});
  await prisma.sprint.deleteMany({});
  await prisma.workstream.deleteMany({});
  await prisma.metricRuleConfig.deleteMany({});
  await prisma.metricEngineConfig.deleteMany({});
  await prisma.syncProgramConfig.deleteMany({});
  await prisma.thresholdConfig.deleteMany({});
  await prisma.syncLog.deleteMany({});
}
