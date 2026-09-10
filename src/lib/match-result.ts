import type { Sql } from '@/lib/db';
import { getSql } from '@/lib/db';

export type MatchPartner = {
  name: string;
  phone: string;
  gender: boolean;
  age: number | null;
  mbti: string;
  major: string | null;
  have: string[];
};

export async function studentHasMatchByEmail(
  email: string,
  sql: Sql = getSql()
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  const rows = await sql`
    SELECT 1
    FROM student AS me
    JOIN match_result AS mr
      ON mr.male_id = me.student_id OR mr.female_id = me.student_id
    WHERE lower(me.email) = ${normalized}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function loadMatchPartnerByEmail(
  email: string,
  sql: Sql = getSql()
): Promise<MatchPartner | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const rows = await sql`
    SELECT
      partner.student_id,
      partner.name,
      partner.phone,
      partner.gender,
      partner.age,
      partner.mbti,
      major.name AS major
    FROM student AS me
    JOIN match_result AS mr
      ON mr.male_id = me.student_id OR mr.female_id = me.student_id
    JOIN student AS partner
      ON partner.student_id = CASE
        WHEN me.student_id = mr.male_id THEN mr.female_id
        ELSE mr.male_id
      END
    LEFT JOIN major ON major.major_id = partner.major_id
    WHERE lower(me.email) = ${normalized}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;

  const partnerId = String(row.student_id);
  const haveRows = await sql`
    SELECT c.name
    FROM have h
    JOIN charm c ON c.charm_id = h.charm_id
    WHERE h.student_id = ${partnerId}
    ORDER BY c.name ASC
  `;

  return {
    name: String(row.name ?? ''),
    phone: String(row.phone ?? ''),
    gender: Boolean(row.gender),
    age: row.age == null ? null : Number(row.age),
    mbti: String(row.mbti ?? ''),
    major: row.major == null ? null : String(row.major),
    have: haveRows.map((item) => String(item.name ?? '')).filter(Boolean),
  };
}
