import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { jsonError } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT charm_id::text AS charm_id, name
      FROM charm
      ORDER BY name ASC NULLS LAST
    `;

    return NextResponse.json({
      charms: rows.map((row) => ({
        charm_id: String(row.charm_id),
        name: row.name ?? '',
      })),
    });
  } catch (err) {
    console.error('GET /api/charms', err);
    const message =
      err instanceof Error && err.message.includes('DATABASE_URL')
        ? err.message
        : '매력 목록을 불러오지 못했습니다.';
    const code =
      err instanceof Error && err.message.includes('DATABASE_URL')
        ? 'CONFIG_MISSING'
        : 'INTERNAL_ERROR';
    return jsonError(code === 'CONFIG_MISSING' ? 503 : 500, code, message);
  }
}
