/**
 * PATCH /api/milestones/[id] – Update milestone
 * Body: { title?, workstreamId?, targetMonth?, status?, adoFeatureId?, notes? }
 * Response: 200 with updated milestone
 *
 * DELETE /api/milestones/[id] – Delete milestone
 * Response: 204
 */

import { NextResponse } from 'next/server';
import { validateUpdate } from '@/lib/milestones/validation';
import { prisma } from '@/lib/prisma';

function formatMilestone(m: {
  id: string;
  title: string;
  workstreamId: string;
  targetMonth: Date;
  status: string;
  adoFeatureId: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  workstream: { id: string; name: string };
}) {
  return {
    id: m.id,
    title: m.title,
    workstreamId: m.workstreamId,
    targetMonth: m.targetMonth.toISOString(),
    status: m.status,
    adoFeatureId: m.adoFeatureId,
    notes: m.notes,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    workstream: { id: m.workstream.id, name: m.workstream.name },
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const existing = await prisma.milestone.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body', errors: ['Request body must be valid JSON'] },
        { status: 400 }
      );
    }

    const result = validateUpdate(body as Record<string, unknown>);
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Validation failed', errors: result.errors },
        { status: 400 }
      );
    }

    const data = result.data;

    if (data.workstreamId) {
      const workstream = await prisma.workstream.findUnique({
        where: { id: data.workstreamId },
      });
      if (!workstream) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            errors: ['workstreamId must reference an existing workstream'],
          },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    if (data.workstreamId !== undefined) {
      updateData.workstreamId = data.workstreamId;
    }
    if (data.targetMonth !== undefined) {
      updateData.targetMonth = data.targetMonth;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.adoFeatureId !== undefined) {
      updateData.adoFeatureId = data.adoFeatureId;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    if (Object.keys(updateData).length === 0) {
      const current = await prisma.milestone.findUnique({
        where: { id },
        include: { workstream: true },
      });
      return NextResponse.json(formatMilestone(current!));
    }

    const milestone = await prisma.milestone.update({
      where: { id },
      data: updateData,
      include: { workstream: true },
    });

    return NextResponse.json(formatMilestone(milestone));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const existing = await prisma.milestone.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    await prisma.milestone.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
