import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { fetchAdminDailyStats } from '@/lib/admin-daily-stats';
import { getSql } from '@/lib/db';
import { jsonError } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const sql = getSql();
    const stats = await fetchAdminDailyStats(sql);
    return NextResponse.json(stats);
  } catch (err) {
    console.error('GET /api/admin/stats/daily', err);
    return jsonError(500, 'INTERNAL_ERROR', '일별 접수 통계를 불러오지 못했습니다.');
  }
}
