import type { Sql } from '@/lib/db';
import {
  currentRegistrationRound,
  type RegistrationRound,
} from '@/lib/deadline';
import { nameKey, phoneDigits } from '@/lib/phone';

export type OwnSurvey = {
  student_id: string;
  registration_id: string;
  round: RegistrationRound;
  name: string;
  phone: string;
  gender: boolean;
  birth: string | null;
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

export type StudentIdentity = {
  name: string;
  phone: string;
};

function identityKeys(identity: StudentIdentity): {
  name: string;
  phone: string;
} | null {
  const name = nameKey(identity.name);
  const phone = phoneDigits(identity.phone);
  if (!name || !phone) return null;
  return { name, phone };
}

export async function listStudentRounds(
  sql: Sql,
  identity: StudentIdentity
): Promise<RegistrationRound[]> {
  const keys = identityKeys(identity);
  if (!keys) return [];
  const rows = await sql`
    SELECT r.round
    FROM registration r
    JOIN student s ON s.student_id = r.student_id
    WHERE lower(btrim(s.name)) = ${keys.name}
      AND regexp_replace(s.phone, '[^0-9]', '', 'g') = ${keys.phone}
    ORDER BY r.round ASC
  `;
  return rows
    .map((row) => Number(row.round))
    .filter((round): round is RegistrationRound => round === 1 || round === 2);
}

export async function loadRoundSubmittedAts(
  sql: Sql,
  identity: StudentIdentity
): Promise<{ 1: string | null; 2: string | null }> {
  const keys = identityKeys(identity);
  const result: { 1: string | null; 2: string | null } = { 1: null, 2: null };
  if (!keys) return result;
  const rows = await sql`
    SELECT r.round, MIN(c.consented_at) AS submitted_at
    FROM registration r
    JOIN student s ON s.student_id = r.student_id
    JOIN consent c ON c.registration_id = r.registration_id
    WHERE lower(btrim(s.name)) = ${keys.name}
      AND regexp_replace(s.phone, '[^0-9]', '', 'g') = ${keys.phone}
    GROUP BY r.round
  `;
  for (const row of rows) {
    const round = Number(row.round);
    if (round !== 1 && round !== 2) continue;
    const value = row.submitted_at;
    if (!value) continue;
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) continue;
    result[round] = date.toISOString();
  }
  return result;
}

export async function studentHasRoundByIdentity(
  identity: StudentIdentity,
  round: RegistrationRound,
  sql: Sql
): Promise<boolean> {
  const keys = identityKeys(identity);
  if (!keys) return false;
  const rows = await sql`
    SELECT 1
    FROM registration r
    JOIN student s ON s.student_id = r.student_id
    WHERE lower(btrim(s.name)) = ${keys.name}
      AND regexp_replace(s.phone, '[^0-9]', '', 'g') = ${keys.phone}
      AND r.round = ${round}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function deleteOrphanStudent(
  sql: Sql,
  studentId: string
): Promise<void> {
  await sql`
    DELETE FROM student s
    WHERE s.student_id = ${studentId}
      AND NOT EXISTS (
        SELECT 1 FROM registration r WHERE r.student_id = s.student_id
      )
  `;
}

export async function loadOwnSurvey(
  sql: Sql,
  identity: StudentIdentity,
  round: RegistrationRound | null = currentRegistrationRound()
): Promise<OwnSurvey | null> {
  const keys = identityKeys(identity);
  if (!keys) return null;

  const rows = round
    ? await sql`
        SELECT
          s.student_id,
          r.registration_id,
          r.round,
          s.name,
          s.phone,
          s.gender,
          s.birth,
          r.mbti,
          s.major_id,
          m.name AS major
        FROM registration r
        JOIN student s ON s.student_id = r.student_id
        JOIN major m ON m.major_id = s.major_id
        WHERE lower(btrim(s.name)) = ${keys.name}
          AND regexp_replace(s.phone, '[^0-9]', '', 'g') = ${keys.phone}
          AND r.round = ${round}
        LIMIT 1
      `
    : await sql`
        SELECT
          s.student_id,
          r.registration_id,
          r.round,
          s.name,
          s.phone,
          s.gender,
          s.birth,
          r.mbti,
          s.major_id,
          m.name AS major
        FROM registration r
        JOIN student s ON s.student_id = r.student_id
        JOIN major m ON m.major_id = s.major_id
        WHERE lower(btrim(s.name)) = ${keys.name}
          AND regexp_replace(s.phone, '[^0-9]', '', 'g') = ${keys.phone}
        ORDER BY r.round DESC
        LIMIT 1
      `;
  const row = rows[0];
  if (!row) return null;

  const studentId = String(row.student_id);
  const registrationId = String(row.registration_id);

  const [agePrefRows, haveRows, wantRows, exHaveRows, exWantRows] =
    await Promise.all([
      sql`
        SELECT p.age_pref_id, a.name
        FROM prefer_age p
        JOIN age_pref a ON a.age_pref_id = p.age_pref_id
        WHERE p.registration_id = ${registrationId}
        ORDER BY a.sort_order ASC
      `,
      sql`
        SELECT h.charm_id::text AS charm_id, c.name
        FROM have h
        JOIN charm c ON c.charm_id = h.charm_id
        WHERE h.registration_id = ${registrationId}
        ORDER BY c.name ASC
      `,
      sql`
        SELECT w.charm_id::text AS charm_id, c.name
        FROM want w
        JOIN charm c ON c.charm_id = w.charm_id
        WHERE w.registration_id = ${registrationId}
        ORDER BY c.name ASC
      `,
      sql`
        SELECT charm
        FROM ex_have
        WHERE registration_id = ${registrationId}
        LIMIT 1
      `,
      sql`
        SELECT charm
        FROM ex_want
        WHERE registration_id = ${registrationId}
        LIMIT 1
      `,
    ]);

  const storedRound = Number(row.round);
  return {
    student_id: studentId,
    registration_id: registrationId,
    round: storedRound === 2 ? 2 : 1,
    name: String(row.name ?? ''),
    phone: String(row.phone ?? ''),
    gender: Boolean(row.gender),
    birth: row.birth ? String(row.birth) : null,
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
