import { NextResponse } from 'next/server';
import { statsRound } from '@/lib/deadline';
import { loadEventTimes } from '@/lib/event-schedule';
import { getSql } from '@/lib/db';
import { jsonError } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const sql = getSql();
    const times = await loadEventTimes(sql);
    const round = statsRound(Date.now(), times);
    const rows = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE s.gender = false)::int AS male,
        COUNT(*) FILTER (WHERE s.gender = true)::int AS female,
        COUNT(DISTINCT s.major_id)::int AS major_count
      FROM registration r
      JOIN student s ON s.student_id = r.student_id
      WHERE r.round = ${round}
    `;

    const majorRows = await sql`
      SELECT
        m.major_id,
        m.name,
        m.short_name,
        COUNT(*)::int AS count
      FROM registration r
      JOIN student s ON s.student_id = r.student_id
      JOIN major m ON m.major_id = s.major_id
      WHERE r.round = ${round}
      GROUP BY m.major_id, m.name, m.short_name
      ORDER BY count DESC, m.name ASC
      LIMIT 10
    `;

    const row = rows[0] ?? { total: 0, male: 0, female: 0, major_count: 0 };
    return NextResponse.json({
      total: Number(row.total) || 0,
      male: Number(row.male) || 0,
      female: Number(row.female) || 0,
      major_count: Number(row.major_count) || 0,
      majors: majorRows.map((item) => ({
        major_id: String(item.major_id),
        name: String(item.name ?? ''),
        short_name: String(item.short_name ?? ''),
        count: Number(item.count) || 0,
      })),
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
