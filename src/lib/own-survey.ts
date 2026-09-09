import type { Sql } from '@/lib/db';

export type OwnSurvey = {
  student_id: string;
  name: string;
  phone: string;
  gender: boolean;
  age: number;
  mbti: string;
  major_id: string;
  major: string;
  age_pref_ids: string[];
  age_prefs: string[];
  have_charm_ids: string[];
  have: string[];
  want_charm_ids: string[];
  want: string[];
  ex_have: string | null;
  ex_want: string | null;
};

export async function loadOwnSurvey(
  sql: Sql,
  googleSub: string
): Promise<OwnSurvey | null> {
  const students = await sql`
    SELECT
      s.student_id,
      s.name,
      s.phone,
      s.gender,
      s.age,
      s.mbti,
      s.major_id,
      m.name AS major
    FROM student s
    JOIN major m ON m.major_id = s.major_id
    WHERE s.google_sub = ${googleSub}
    LIMIT 1
  `;
  const row = students[0];
  if (!row) return null;

  const studentId = String(row.student_id);

  const [agePrefRows, haveRows, wantRows, exHaveRows, exWantRows] =
    await Promise.all([
      sql`
        SELECT p.age_pref_id, a.name
        FROM prefer_age p
        JOIN age_pref a ON a.age_pref_id = p.age_pref_id
        WHERE p.student_id = ${studentId}
        ORDER BY a.sort_order ASC
      `,
      sql`
        SELECT h.charm_id::text AS charm_id, c.name
        FROM have h
        JOIN charm c ON c.charm_id = h.charm_id
        WHERE h.student_id = ${studentId}
        ORDER BY c.name ASC
      `,
      sql`
        SELECT w.charm_id::text AS charm_id, c.name
        FROM want w
        JOIN charm c ON c.charm_id = w.charm_id
        WHERE w.student_id = ${studentId}
        ORDER BY c.name ASC
      `,
      sql`
        SELECT charm
        FROM ex_have
        WHERE student_id = ${studentId}
        LIMIT 1
      `,
      sql`
        SELECT charm
        FROM ex_want
        WHERE student_id = ${studentId}
        LIMIT 1
      `,
    ]);

  return {
    student_id: studentId,
    name: String(row.name ?? ''),
    phone: String(row.phone ?? ''),
    gender: Boolean(row.gender),
    age: Number(row.age),
    mbti: String(row.mbti ?? ''),
    major_id: String(row.major_id),
    major: String(row.major ?? ''),
    age_pref_ids: agePrefRows.map((item) => String(item.age_pref_id)),
    age_prefs: agePrefRows.map((item) => String(item.name ?? '')),
    have_charm_ids: haveRows.map((item) => String(item.charm_id)),
    have: haveRows.map((item) => String(item.name ?? '')),
    want_charm_ids: wantRows.map((item) => String(item.charm_id)),
    want: wantRows.map((item) => String(item.name ?? '')),
    ex_have: exHaveRows[0]?.charm ? String(exHaveRows[0].charm) : null,
    ex_want: exWantRows[0]?.charm ? String(exWantRows[0].charm) : null,
  };
}
