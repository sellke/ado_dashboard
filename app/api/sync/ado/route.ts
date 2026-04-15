/**
 * POST /api/sync/ado – Manual ADO sync trigger
 *
 * Request body (optional): { syncType?: "Full" | "WorkItems" | "Iterations" | "Capacity" }
 * Response: { success, syncLogId, summary, error? }
 * When success is false (HTTP still 200), `error` is a short message — often the same as summary.errorMessage.
 */

import { NextResponse } from 'next/server';
import type { SyncType } from '@prisma/client';
import { runSync } from '@/lib/sync/orchestrator';

const VALID_SYNC_TYPES: SyncType[] = ['Full', 'WorkItems', 'Iterations', 'Capacity'];

export async function POST(request: Request) {
  try {
    let syncType: SyncType = 'Full';
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const body = await request.json().catch(() => ({}));
      if (body.syncType && VALID_SYNC_TYPES.includes(body.syncType)) {
        syncType = body.syncType;
      }
    }

    const result = await runSync({ syncType });
    const success = result.summary.status === 'Success';
    const errorMessage = result.summary.errorMessage?.trim() ?? '';

    return NextResponse.json({
      success,
      syncLogId: result.syncLogId,
      summary: result.summary,
      ...(!success && {
        error: errorMessage || 'Sync finished with errors',
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
