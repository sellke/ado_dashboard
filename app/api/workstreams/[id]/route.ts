import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateWorkstreamRegistryInput } from '@/lib/sync/workstream-validation';

const WORKSTREAM_SELECT = {
  id: true,
  name: true,
  adoAreaPath: true,
  adoOrg: true,
  adoProject: true,
  adoTeamId: true,
  syncEnabled: true,
} as const;

async function countRelatedRows(workstreamId: string) {
  const [
    workItems,
    metricSnapshots,
    milestones,
    sprintWorkstreams,
    transcripts,
    ceremonyInsights,
    planSnapshots,
  ] = await Promise.all([
    prisma.workItem.count({ where: { workstreamId } }),
    prisma.metricSnapshot.count({ where: { workstreamId } }),
    prisma.milestone.count({ where: { workstreamId } }),
    prisma.sprintWorkstream.count({ where: { workstreamId } }),
    prisma.transcript.count({ where: { workstreamId } }),
    prisma.ceremonyInsight.count({ where: { relatedWorkstreamId: workstreamId } }),
    prisma.sprintPlanSnapshot.count({ where: { workstreamId } }),
  ]);

  return {
    workItems,
    metricSnapshots,
    milestones,
    sprintWorkstreams,
    transcripts,
    ceremonyInsights,
    planSnapshots,
  };
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const existing = await prisma.workstream.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Workstream not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { data, errors } = validateWorkstreamRegistryInput(body, { partial: true });

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 422 });
    }

    if (data.name) {
      const duplicate = await prisma.workstream.findFirst({
        where: { name: data.name, NOT: { id } },
        select: { id: true },
      });
      if (duplicate) {
        return NextResponse.json(
          { errors: [{ field: 'name', message: 'Workstream name already exists' }] },
          { status: 422 }
        );
      }
    }

    const workstream = await prisma.workstream.update({
      where: { id },
      data,
      select: WORKSTREAM_SELECT,
    });

    return NextResponse.json({ workstream });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const existing = await prisma.workstream.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Workstream not found' }, { status: 404 });
    }

    const relatedCounts = await countRelatedRows(id);
    const hasRelatedRows = Object.values(relatedCounts).some((count) => count > 0);

    if (hasRelatedRows) {
      return NextResponse.json(
        {
          error: 'Workstream has synced data and cannot be deleted. Disable sync instead.',
          relatedCounts,
        },
        { status: 409 }
      );
    }

    await prisma.workstream.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
