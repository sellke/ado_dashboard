/**
 * GET /api/milestones – Fetch milestones with workstream relation
 * Query params: workstreamId (optional) – filter by workstream
 * Response: milestones ordered by targetMonth
 *
 * POST /api/milestones – Create milestone
 * Body: { title, workstreamId, targetMonth, status?, adoFeatureId?, notes? }
 * Response: 201 with created milestone
 */

import { NextResponse } from 'next/server';
import { validateCreate } from '@/lib/milestones/validation';
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workstreamId = searchParams.get('workstreamId');

    const where = workstreamId ? { workstreamId } : {};

    const milestones = await prisma.milestone.findMany({
      where,
      include: { workstream: true },
      orderBy: { targetMonth: 'asc' },
    });

    const formatted = milestones.map(formatMilestone);
    return NextResponse.json(formatted);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body', errors: ['Request body must be valid JSON'] },
        { status: 400 }
      );
    }

    const result = validateCreate(body as Record<string, unknown>);
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Validation failed', errors: result.errors },
        { status: 400 }
      );
    }

    const { title, workstreamId, targetMonth, status, adoFeatureId, notes } = result.data;

    const workstream = await prisma.workstream.findUnique({
      where: { id: workstreamId },
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

    const milestone = await prisma.milestone.create({
      data: {
        title,
        workstreamId,
        targetMonth,
        status,
        adoFeatureId: adoFeatureId ?? undefined,
        notes: notes ?? undefined,
      },
      include: { workstream: true },
    });

    return NextResponse.json(formatMilestone(milestone), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
