import type { Sql } from '@/lib/db';
import { getSql } from '@/lib/db';
import { eventTimeMs } from '@/lib/deadline';

export type MatchPartner = {
  round: 1 | 2;
  name: string;
  phone: string;
  gender: boolean;
  age: number | null;
  mbti: string;
  major: string | null;
  have: string[];
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** 2차 발표 이후에는 2차 매칭만 결과로 인정합니다. 그 전에는 있는 매칭을 보여 줍니다. */
export function shouldShowMatchResult({
  hasRound2,
  hasMatchRound2,
  hasAnyMatch,
  now = Date.now(),
}: {
  hasRound2: boolean;
  hasMatchRound2: boolean;
  hasAnyMatch: boolean;
  now?: number;
}): boolean {
  if (hasRound2 && now >= eventTimeMs('round2Announce')) return hasMatchRound2;
  return hasAnyMatch;
}

async function loadMatchRows(
  email: string,
  sql: Sql,
  round: 1 | 2 | null
) {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];

  if (round != null) {
    return sql`
      SELECT
        COALESCE(mr.round, me.round) AS round,
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
      WHERE lower(me.email) = ${normalized} AND me.round = ${round}
      ORDER BY COALESCE(mr.round, me.round) DESC, me.round DESC
      LIMIT 1
    `;
  }

  return sql`
    SELECT
      COALESCE(mr.round, me.round) AS round,
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
    ORDER BY COALESCE(mr.round, me.round) DESC, me.round DESC
    LIMIT 1
  `;
}

async function partnerFromRow(
  sql: Sql,
  row: {
    round: unknown;
    student_id: unknown;
    name: unknown;
    phone: unknown;
    gender: unknown;
    age: unknown;
    mbti: unknown;
    major: unknown;
  }
): Promise<MatchPartner> {
  const partnerId = String(row.student_id);
  const haveRows = await sql`
    SELECT c.name
    FROM have h
    JOIN charm c ON c.charm_id = h.charm_id
    WHERE h.student_id = ${partnerId}
    ORDER BY c.name ASC
  `;

  return {
    round: Number(row.round) === 2 ? 2 : 1,
    name: String(row.name ?? ''),
    phone: String(row.phone ?? ''),
    gender: Boolean(row.gender),
    age: row.age == null ? null : Number(row.age),
    mbti: String(row.mbti ?? ''),
    major: row.major == null ? null : String(row.major),
    have: haveRows.map((item) => String(item.name ?? '')).filter(Boolean),
  };
}

async function studentRoundsByEmail(
  email: string,
  sql: Sql
): Promise<number[]> {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];
  const rows = await sql`
    SELECT round
    FROM student
    WHERE lower(email) = ${normalized}
  `;
  return rows
    .map((row) => Number(row.round))
    .filter((round) => round === 1 || round === 2);
}

export async function studentHasMatchByEmail(
  email: string,
  sql: Sql = getSql(),
  now = Date.now()
): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  const rounds = await studentRoundsByEmail(email, sql);
  const matchRows = await sql`
    SELECT me.round
    FROM student AS me
    JOIN match_result AS mr
      ON mr.male_id = me.student_id OR mr.female_id = me.student_id
    WHERE lower(me.email) = ${normalized}
  `;
  const matchRounds = new Set(
    matchRows
      .map((row) => Number(row.round))
      .filter((round) => round === 1 || round === 2)
  );

  return shouldShowMatchResult({
    hasRound2: rounds.includes(2),
    hasMatchRound2: matchRounds.has(2),
    hasAnyMatch: matchRounds.size > 0,
    now,
  });
}

/** 화면에 보여줄 매칭. 2차 발표 후 2차 접수가 있으면 2차 매칭만 반환합니다. */
export async function loadMatchPartnerByEmail(
  email: string,
  sql: Sql = getSql(),
  now = Date.now()
): Promise<MatchPartner | null> {
  const rounds = await studentRoundsByEmail(email, sql);
  const restrictToRound2 =
    rounds.includes(2) && now >= eventTimeMs('round2Announce');
  const rows = await loadMatchRows(
    email,
    sql,
    restrictToRound2 ? 2 : null
  );
  const row = rows[0];
  if (!row) return null;
  return partnerFromRow(sql, row);
}
