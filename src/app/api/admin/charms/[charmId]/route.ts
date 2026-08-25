import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSql } from '@/lib/db';
import { jsonError } from '@/lib/http';

export const runtime = 'nodejs';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{ charmId: string }>;
};

export async function DELETE(req: NextRequest, context: RouteContext) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { charmId } = await context.params;
  if (!UUID_RE.test(charmId)) {
    return jsonError(400, 'VALIDATION_ERROR', 'charm_id가 올바르지 않습니다.');
  }

  try {
    const sql = getSql();
    const deleted = await sql`
      DELETE FROM charm
      WHERE charm_id = ${charmId}
      RETURNING charm_id
    `;
    if (deleted.length === 0) {
      return jsonError(404, 'NOT_FOUND', '해당 매력 태그를 찾을 수 없습니다.');
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/charms/[charmId]', err);
    return jsonError(500, 'INTERNAL_ERROR', '매력 태그를 삭제하지 못했습니다.');
  }
}
