/**
 * GET /api/sprints/stories — Fetch User Stories grouped by sprint and status
 *
 * Query params:
 * - workstreamId (required): filter stories to a specific workstream
 *
 * Response: { sprints: SprintWithStories[] }
 * Each sprint includes isCurrent flag and stories mapped to status groups.
 * Sprints ordered most recent first (rolling 5-sprint window).
 */

import { NextResponse } from 'next/server';

import { mapStateToStatusGroup } from '@/lib/sprints/status-mapping';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workstreamId = searchParams.get('workstreamId');

    if (!workstreamId) {
      return NextResponse.json(
        { error: 'workstreamId query parameter is required' },
        { status: 400 }
      );
    }

    const now = new Date();

    const rollingSprints = await prisma.sprint.findMany({
      orderBy: { startDate: 'desc' },
      take: 5,
      select: { id: true, name: true, startDate: true, endDate: true },
    });

    if (rollingSprints.length === 0) {
      return NextResponse.json({ sprints: [] });
    }

    const rollingSprintIds = rollingSprints.map((s) => s.id);

    const workItems = await prisma.workItem.findMany({
      where: {
        type: 'UserStory',
        sprintId: { in: rollingSprintIds },
        workstreamId,
      },
      select: {
        adoId: true,
        title: true,
        assignedTo: true,
        storyPoints: true,
        state: true,
        sprintId: true,
      },
    });

    const sprintStoriesMap = new Map<string, typeof workItems>();
    for (const item of workItems) {
      if (!item.sprintId) continue;
      const group = mapStateToStatusGroup(item.state);
      if (!group) continue;
      if (!sprintStoriesMap.has(item.sprintId)) {
        sprintStoriesMap.set(item.sprintId, []);
      }
      sprintStoriesMap.get(item.sprintId)!.push(item);
    }

    const sprints = rollingSprints.map((sprint) => {
      const stories = (sprintStoriesMap.get(sprint.id) ?? []).map((item) => ({
        adoId: item.adoId,
        title: item.title,
        assignedTo: item.assignedTo,
        storyPoints: item.storyPoints,
        state: item.state,
        statusGroup: mapStateToStatusGroup(item.state)!,
      }));

      return {
        id: sprint.id,
        name: sprint.name,
        startDate: sprint.startDate.toISOString(),
        endDate: sprint.endDate.toISOString(),
        isCurrent: sprint.startDate <= now && sprint.endDate >= now,
        stories,
      };
    });

    return NextResponse.json({ sprints });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch sprint stories' },
      { status: 500 }
    );
  }
}
