import type { Sql } from '@/lib/db';
import type { AdminStudent } from '@/lib/api';

export async function fetchJoinedStudents(sql: Sql): Promise<AdminStudent[]> {
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

  return students.map((row) => {
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
  });
}

export function filterStudents(
  students: AdminStudent[],
  query: string
): AdminStudent[] {
  const q = query.trim().toLowerCase();
  if (!q) return students;
  return students.filter(
    (s) =>
      s.student_id.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q)
  );
}
