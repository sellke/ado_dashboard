/**
 * Recompute metrics for all sprints after data fixes.
 * Run: pnpm tsx scripts/recompute-metrics.ts
 */

import { prisma } from '@/lib/prisma';
import { computeAllMetrics } from '@/lib/metrics/orchestrator';

async function main() {
  const sprints = await prisma.sprint.findMany({
    select: { id: true, name: true, startDate: true },
    orderBy: { startDate: 'asc' },
  });

  console.log(`Re-computing metrics for ${sprints.length} sprints...`);

  for (const sprint of sprints) {
    try {
      await computeAllMetrics(sprint.id);
      console.log(`  ✓ ${sprint.name}`);
    } catch (err) {
      console.error(`  ✗ ${sprint.name}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log('\nVerifying updated snapshots:');
  const snaps = await prisma.metricSnapshot.findMany({
    include: {
      workstream: { select: { name: true } },
      sprint: { select: { name: true } },
    },
    orderBy: [{ sprint: { startDate: 'desc' } }, { workstream: { name: 'asc' } }],
    take: 10,
  });
  snaps.forEach((s) =>
    console.log(
      `  ${s.workstream.name.padEnd(16)} ${s.sprint.name} | vel=${s.velocity} gross=${s.grossHours} overheadPct=${s.overheadPercent?.toFixed(1) ?? 'null'}`
    )
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
