import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSql } from '@/lib/db';
import { jsonError } from '@/lib/http';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ studentId: string }>;
};

export async function DELETE(req: NextRequest, context: RouteContext) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { studentId } = await context.params;
  if (!/^\d{10}$/.test(studentId)) {
    return jsonError(400, 'VALIDATION_ERROR', '학번이 올바르지 않습니다.');
  }

  try {
    const sql = getSql();
    const deleted = await sql`
      DELETE FROM student
      WHERE student_id = ${studentId}
      RETURNING student_id
    `;
    if (deleted.length === 0) {
      return jsonError(404, 'NOT_FOUND', '해당 참가자를 찾을 수 없습니다.');
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/students/[studentId]', err);
    return jsonError(500, 'INTERNAL_ERROR', '참가자를 삭제하지 못했습니다.');
  }
}
