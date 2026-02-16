/**
 * POST /api/metrics/compute – Trigger metric computation for a sprint
 *
 * Body: { sprintId?: string } (optional, defaults to most recent sprint by endDate)
 * Response: { success: true, snapshotsCreated: number, sprintId, sprintName }
 * Errors: 400 (invalid sprintId), 404 (sprint not found), 500 (computation error)
 */

import { NextResponse } from 'next/server';
import { computeAllMetrics } from '@/lib/metrics/orchestrator';

export async function POST(request: Request) {
  try {
    let sprintId: string | undefined;
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const body = await request.json().catch(() => ({}));
      if (body.sprintId != null) {
        if (typeof body.sprintId !== 'string' || body.sprintId.trim() === '') {
          return NextResponse.json({ success: false, error: 'Invalid sprintId' }, { status: 400 });
        }
        sprintId = body.sprintId.trim();
      }
    }

    const result = await computeAllMetrics(sprintId);

    const snapshotsCreated = result.workstreams.length;

    return NextResponse.json({
      success: true,
      snapshotsCreated,
      sprintId: result.sprintId,
      sprintName: result.sprintName,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    if (message.includes('Sprint not found') || message.includes('No sprints found')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
