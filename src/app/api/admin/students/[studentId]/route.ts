import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSql } from '@/lib/db';
import { jsonError } from '@/lib/http';
import { deleteOrphanStudent } from '@/lib/own-survey';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ studentId: string }>;
};

export async function DELETE(req: NextRequest, context: RouteContext) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { studentId: registrationId } = await context.params;
  const id = registrationId.trim();
  if (!id || id.length > 64) {
    return jsonError(400, 'VALIDATION_ERROR', '참가자 ID가 올바르지 않습니다.');
  }

  try {
    const sql = getSql();
    const deleted = await sql`
      DELETE FROM registration
      WHERE registration_id = ${id}
      RETURNING student_id
    `;
    if (deleted.length === 0) {
      return jsonError(404, 'NOT_FOUND', '해당 참가자를 찾을 수 없습니다.');
    }
    await deleteOrphanStudent(sql, String(deleted[0].student_id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/students/[studentId]', err);
    return jsonError(500, 'INTERNAL_ERROR', '참가자를 삭제하지 못했습니다.');
  }
}
