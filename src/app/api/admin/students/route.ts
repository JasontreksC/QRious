import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSql } from '@/lib/db';
import { jsonError } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const sql = getSql();
    const [students, haves, wants, exHaves, exWants] = await Promise.all([
      sql`
        SELECT student_id, name, gender, age, mbti
        FROM student
        ORDER BY student_id ASC
      `,
      sql`
        SELECT h.student_id, c.name
        FROM have h
        JOIN charm c ON c.charm_id = h.charm_id
        ORDER BY c.name ASC
      `,
      sql`
        SELECT w.student_id, c.name
        FROM want w
        JOIN charm c ON c.charm_id = w.charm_id
        ORDER BY c.name ASC
      `,
      sql`SELECT student_id, charm FROM ex_have`,
      sql`SELECT student_id, charm FROM ex_want`,
    ]);

    const haveMap = new Map<string, string[]>();
    for (const row of haves) {
      const id = String(row.student_id);
      const list = haveMap.get(id) ?? [];
      list.push(String(row.name ?? ''));
      haveMap.set(id, list);
    }

    const wantMap = new Map<string, string[]>();
    for (const row of wants) {
      const id = String(row.student_id);
      const list = wantMap.get(id) ?? [];
      list.push(String(row.name ?? ''));
      wantMap.set(id, list);
    }

    const exHaveMap = new Map<string, string>();
    for (const row of exHaves) {
      exHaveMap.set(String(row.student_id), String(row.charm ?? ''));
    }

    const exWantMap = new Map<string, string>();
    for (const row of exWants) {
      exWantMap.set(String(row.student_id), String(row.charm ?? ''));
    }

    return NextResponse.json({
      students: students.map((row) => {
        const id = String(row.student_id);
        return {
          student_id: id,
          name: row.name ?? '',
          gender: Boolean(row.gender),
          age: row.age === null ? null : Number(row.age),
          mbti: row.mbti ?? '',
          have: haveMap.get(id) ?? [],
          want: wantMap.get(id) ?? [],
          ex_have: exHaveMap.get(id) || null,
          ex_want: exWantMap.get(id) || null,
        };
      }),
    });
  } catch (err) {
    console.error('GET /api/admin/students', err);
    return jsonError(500, 'INTERNAL_ERROR', '참가자 목록을 불러오지 못했습니다.');
  }
}
