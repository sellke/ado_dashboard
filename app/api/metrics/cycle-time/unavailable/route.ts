import { NextResponse } from 'next/server';
import { buildAdoWorkItemUrl } from '@/lib/ado/urls';
import { resolveDashboard } from '@/lib/dashboard/config';
import {
  parseScopedWorkstreamIds,
  validateScopedWorkstreamIds,
} from '@/lib/dashboard/workstream-scope';
import { calculateBusinessDaysElapsed } from '@/lib/metrics/calculators';
import { loadMetricConfig } from '@/lib/metrics/config-loader';
import {
  CYCLE_TIME_WORK_ITEM_TYPES,
  DONE_STATES,
  type CycleTimeWorkItemType,
} from '@/lib/metrics/types';
import { prisma } from '@/lib/prisma';

function isCycleTimeType(value: string | null): value is CycleTimeWorkItemType {
  return !!value && (CYCLE_TIME_WORK_ITEM_TYPES as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const sprintIdParam = searchParams.get('sprintId');
    const workstreamIdParam = searchParams.get('workstreamId');
    const dashboardConfig = resolveDashboard(searchParams.get('dashboard'));
    const scopedQuery = parseScopedWorkstreamIds(searchParams);

    if (!isCycleTimeType(type)) {
      return NextResponse.json(
        { error: 'type must be one of UserStory, Spike, or Bug' },
        { status: 400 }
      );
    }

    if (scopedQuery.kind === 'invalid') {
      return NextResponse.json(
        { error: 'workstreamIds must include at least one workstream ID' },
        { status: 400 }
      );
    }

    let sprintId = sprintIdParam;
    if (!sprintId) {
      const latestWithSnapshot = await prisma.metricSnapshot.findFirst({
        orderBy: { computedAt: 'desc' },
        select: { sprintId: true },
      });
      sprintId = latestWithSnapshot?.sprintId ?? null;
    }

    if (!sprintId) {
      return NextResponse.json({ items: [], count: 0 });
    }

    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      select: { id: true, startDate: true, endDate: true },
    });

    if (!sprint) {
      return NextResponse.json({ items: [], count: 0 });
    }

    const allowedWorkstreams = await prisma.workstream.findMany({
      where: { name: { in: dashboardConfig.workstreamNames } },
      select: { id: true },
    });
    let allowedWorkstreamIds = allowedWorkstreams.map((workstream) => workstream.id);

    if (scopedQuery.kind === 'scoped') {
      const scopedWorkstreams = await prisma.workstream.findMany({
        where: { id: { in: scopedQuery.ids } },
        select: { id: true },
      });
      allowedWorkstreamIds = validateScopedWorkstreamIds(
        scopedQuery.ids,
        scopedWorkstreams.map((workstream) => workstream.id)
      );
    }

    const metricConfig = await loadMetricConfig(prisma);
    const cycleTimeSprints = await prisma.sprint.findMany({
      where: { startDate: { lte: sprint.startDate } },
      orderBy: { startDate: 'desc' },
      take: metricConfig.engine.cycleTimeRollingWindow,
      select: { id: true, startDate: true, endDate: true },
    });
    const cycleTimeWindowSprints =
      cycleTimeSprints.length > 0
        ? cycleTimeSprints
        : [{ id: sprint.id, startDate: sprint.startDate, endDate: sprint.endDate }];
    const cycleTimeStartDate = new Date(
      Math.min(...cycleTimeWindowSprints.map((cycleSprint) => cycleSprint.startDate.getTime()))
    );
    const cycleTimeEndDate = new Date(
      Math.max(...cycleTimeWindowSprints.map((cycleSprint) => cycleSprint.endDate.getTime()))
    );
    const cycleTimeSprintIds = cycleTimeWindowSprints.map((cycleSprint) => cycleSprint.id);

    const workstreamFilter = workstreamIdParam
      ? { workstreamId: workstreamIdParam }
      : { workstreamId: { in: allowedWorkstreamIds } };

    const candidates = await prisma.workItem.findMany({
      where: {
        type,
        ...workstreamFilter,
        OR: [
          { adoClosedDate: { gte: cycleTimeStartDate, lte: cycleTimeEndDate } },
          {
            adoClosedDate: null,
            sprintId: { in: cycleTimeSprintIds },
            state: { in: [...DONE_STATES] },
          },
        ],
      },
      select: {
        adoId: true,
        title: true,
        type: true,
        workstreamId: true,
        state: true,
        adoActivatedDate: true,
        adoClosedDate: true,
        workstream: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { adoId: 'asc' },
    });

    const items = candidates
      .filter(
        (item) => calculateBusinessDaysElapsed(item.adoActivatedDate, item.adoClosedDate) === null
      )
      .map((item) => ({
        adoId: item.adoId,
        adoUrl: buildAdoWorkItemUrl(item.adoId),
        title: item.title,
        type: item.type,
        state: item.state,
        workstreamId: item.workstreamId,
        workstreamName: item.workstream?.name ?? null,
      }));

    return NextResponse.json({ items, count: items.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
