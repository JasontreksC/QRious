import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { fetchJoinedStudents } from '@/lib/admin-students';
import { getSql } from '@/lib/db';
import { jsonError } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const sql = getSql();
    const students = await fetchJoinedStudents(sql);
    return NextResponse.json({ students });
  } catch (err) {
    console.error('GET /api/admin/students', err);
    return jsonError(500, 'INTERNAL_ERROR', '참가자 목록을 불러오지 못했습니다.');
  }
}
