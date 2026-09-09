import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { jsonError } from '@/lib/http';
import { sortMajors, type Major } from '@/lib/majors';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT major_id, name, short_name
      FROM major
    `;
    const majors: Major[] = sortMajors(
      rows.map((row) => ({
        major_id: String(row.major_id),
        name: String(row.name ?? ''),
        short_name: String(row.short_name ?? ''),
      }))
    );
    return NextResponse.json({ majors });
  } catch (err) {
    console.error('GET /api/majors', err);
    const message =
      err instanceof Error && err.message.includes('DATABASE_URL')
        ? err.message
        : '학과 목록을 불러오지 못했습니다.';
    const code =
      err instanceof Error && err.message.includes('DATABASE_URL')
        ? 'CONFIG_MISSING'
        : 'INTERNAL_ERROR';
    return jsonError(code === 'CONFIG_MISSING' ? 503 : 500, code, message);
  }
}
