import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { jsonError } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE gender = false)::int AS male,
        COUNT(*) FILTER (WHERE gender = true)::int AS female
      FROM student
    `;

    const row = rows[0] ?? { total: 0, male: 0, female: 0 };
    return NextResponse.json({
      total: Number(row.total) || 0,
      male: Number(row.male) || 0,
      female: Number(row.female) || 0,
    });
  } catch (err) {
    console.error('GET /api/stats', err);
    const message =
      err instanceof Error && err.message.includes('DATABASE_URL')
        ? err.message
        : '통계를 불러오지 못했습니다.';
    const code =
      err instanceof Error && err.message.includes('DATABASE_URL')
        ? 'CONFIG_MISSING'
        : 'INTERNAL_ERROR';
    return jsonError(code === 'CONFIG_MISSING' ? 503 : 500, code, message);
  }
}
