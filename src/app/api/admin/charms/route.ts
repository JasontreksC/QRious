import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSql } from '@/lib/db';
import { isUniqueViolation, jsonError } from '@/lib/http';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  let body: { name?: unknown };
  try {
    body = (await req.json()) as { name?: unknown };
  } catch {
    return jsonError(400, 'VALIDATION_ERROR', 'JSON 본문이 올바르지 않습니다.');
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return jsonError(400, 'VALIDATION_ERROR', '매력 이름을 입력해 주세요.');
  }
  if (name.length > 40) {
    return jsonError(400, 'VALIDATION_ERROR', '매력 이름은 40자 이하여야 합니다.');
  }

  try {
    const sql = getSql();
    const existing = await sql`
      SELECT charm_id FROM charm WHERE name = ${name} LIMIT 1
    `;
    if (existing.length > 0) {
      return jsonError(409, 'DUPLICATE_CHARM', '이미 있는 매력 태그입니다.');
    }

    const rows = await sql`
      INSERT INTO charm (name)
      VALUES (${name})
      RETURNING charm_id::text AS charm_id, name
    `;
    const row = rows[0];
    return NextResponse.json(
      { charm_id: String(row.charm_id), name: String(row.name ?? name) },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/admin/charms', err);
    if (isUniqueViolation(err)) {
      return jsonError(409, 'DUPLICATE_CHARM', '이미 있는 매력 태그입니다.');
    }
    return jsonError(500, 'INTERNAL_ERROR', '매력 태그를 추가하지 못했습니다.');
  }
}
