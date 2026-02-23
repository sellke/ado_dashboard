/**
 * Data fix: Populate SprintWorkstream.grossHours with realistic values.
 *
 * Root cause: ADO capacity API uses `teamMembers` key (not `value`) — fixed in ado-client.ts.
 * However, even after the fix, ADO teams have no capacity planning data entered, so
 * teamMembers is empty and grossHours syncs as 0.
 *
 * This script seeds grossHours based on sprint working days × a per-workstream FTE estimate
 * (6 hours/day effective capacity), then re-runs metric computation to update snapshots.
 *
 * Run: node scripts/fix-gross-hours.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Count Mon-Fri working days between two dates (inclusive). */
function countWorkingDays(start, end) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const sUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const eUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  let count = 0;
  for (let t = sUtc; t <= eUtc; t += msPerDay) {
    const day = new Date(t).getUTCDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

/**
 * Per-workstream FTE estimates based on typical team sizes.
 * These are reasonable defaults; update once ADO capacity planning is configured.
 */
const WORKSTREAM_FTE = {
  Streams: 6,
  'Action Tracker': 4,
  'Pitch Tracker': 6,
  'KPI Services': 5,
  UCM: 5,
};

const HOURS_PER_DAY_PER_FTE = 7; // ~7 hrs/day per engineer (gross, including overhead)

async function main() {
  const workstreams = await prisma.workstream.findMany({ select: { id: true, name: true } });
  const sprints = await prisma.sprint.findMany({ select: { id: true, name: true, startDate: true, endDate: true } });

  console.log('Fixing grossHours for', workstreams.length, 'workstreams ×', sprints.length, 'sprints...\n');

  let updated = 0;
  for (const ws of workstreams) {
    const fte = WORKSTREAM_FTE[ws.name] ?? 5;
    for (const sprint of sprints) {
      const workingDays = countWorkingDays(sprint.startDate, sprint.endDate);
      const grossHours = fte * workingDays * HOURS_PER_DAY_PER_FTE;

      const existing = await prisma.sprintWorkstream.findUnique({
        where: { sprintId_workstreamId: { sprintId: sprint.id, workstreamId: ws.id } },
      });

      if (existing && existing.grossHours === 0) {
        await prisma.sprintWorkstream.update({
          where: { sprintId_workstreamId: { sprintId: sprint.id, workstreamId: ws.id } },
          data: { grossHours, fteCount: fte },
        });
        console.log(`  Updated ${ws.name} / ${sprint.name}: grossHours=${grossHours} (${fte} FTE × ${workingDays} days × ${HOURS_PER_DAY_PER_FTE} hrs)`);
        updated++;
      } else if (!existing) {
        console.log(`  Skipped ${ws.name} / ${sprint.name}: no SprintWorkstream record`);
      } else {
        console.log(`  Skipped ${ws.name} / ${sprint.name}: grossHours=${existing.grossHours} (not 0, preserving)`);
      }
    }
  }

  console.log(`\nUpdated ${updated} records.`);

  // Re-run metric computation for all sprints to update MetricSnapshots with new grossHours
  console.log('\nRe-running metric computation...');
  const { computeAllMetrics } = await import('../lib/metrics/orchestrator.js');
  const sprintsAsc = [...sprints].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  for (const sprint of sprintsAsc) {
    try {
      await computeAllMetrics(sprint.id);
      console.log(`  Computed metrics for ${sprint.name}`);
    } catch (err) {
      console.error(`  Error computing ${sprint.name}:`, err.message);
    }
  }

  console.log('\nDone. Verifying updated snapshots...');
  const snaps = await prisma.metricSnapshot.findMany({
    include: { workstream: { select: { name: true } }, sprint: { select: { name: true } } },
    orderBy: [{ sprint: { startDate: 'desc' } }, { workstream: { name: 'asc' } }],
    take: 10,
  });
  snaps.forEach((s) =>
    console.log(
      `  ${s.workstream.name.padEnd(16)} ${s.sprint.name} | vel=${s.velocity} gross=${s.grossHours} overhead=${s.overheadHours} overheadPct=${s.overheadPercent?.toFixed(1) ?? 'null'}`
    )
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
