import type { PrismaClient } from '@prisma/client';
import { seedOperationalDefaults } from '@/prisma/seed';

export interface BootstrapResult {
  bootstrapped: boolean;
  workstreamsCreated: number;
}

/**
 * One-time bootstrap for empty databases: restores default workstreams, sync program
 * config, and metric configuration. No-op when any workstream row exists.
 */
export async function bootstrapDefaultDataIfEmpty(
  client: PrismaClient
): Promise<BootstrapResult> {
  const existingCount = await client.workstream.count();
  if (existingCount > 0) {
    return { bootstrapped: false, workstreamsCreated: 0 };
  }

  await seedOperationalDefaults(client);
  const workstreamsCreated = await client.workstream.count();
  return { bootstrapped: true, workstreamsCreated };
}
