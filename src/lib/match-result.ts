import type { Sql } from '@/lib/db';
import { getSql } from '@/lib/db';
import { eventTimeMs, type EventTimes } from '@/lib/deadline';
import { loadEventTimes } from '@/lib/event-schedule';
import { nameKey, phoneDigits } from '@/lib/phone';
import type { StudentIdentity } from '@/lib/own-survey';

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

function identityKeys(identity: StudentIdentity): {
  name: string;
  phone: string;
} | null {
  const name = nameKey(identity.name);
  const phone = phoneDigits(identity.phone);
  if (!name || !phone) return null;
  return { name, phone };
}

/** 2차 접수한 사람은 1차 매칭을 무시합니다. 2차 발표 후에만 2차 매칭을 보여 줍니다. */
export function shouldShowMatchResult({
  hasRound2,
  hasMatchRound2,
  hasAnyMatch,
  now = Date.now(),
  times,
}: {
  hasRound2: boolean;
  hasMatchRound2: boolean;
  hasAnyMatch: boolean;
  now?: number;
  times: EventTimes;
}): boolean {
  if (hasRound2) {
    if (now >= eventTimeMs('round2Announce', times)) return hasMatchRound2;
    return false;
  }
  return hasAnyMatch;
}

async function loadMatchRows(
  identity: StudentIdentity,
  sql: Sql,
  round: 1 | 2 | null
) {
  const keys = identityKeys(identity);
  if (!keys) return [];

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
      WHERE lower(btrim(me.name)) = ${keys.name}
        AND regexp_replace(me.phone, '[^0-9]', '', 'g') = ${keys.phone}
        AND me.round = ${round}
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
    WHERE lower(btrim(me.name)) = ${keys.name}
      AND regexp_replace(me.phone, '[^0-9]', '', 'g') = ${keys.phone}
    ORDER BY COALESCE(mr.round, me.round) DESC, me.round DESC
    LIMIT 1
  `;
}

async function partnerFromRow(
  sql: Sql,
  row: Record<string, unknown>
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

async function studentRoundsByIdentity(
  identity: StudentIdentity,
  sql: Sql
): Promise<number[]> {
  const keys = identityKeys(identity);
  if (!keys) return [];
  const rows = await sql`
    SELECT round
    FROM student
    WHERE lower(btrim(name)) = ${keys.name}
      AND regexp_replace(phone, '[^0-9]', '', 'g') = ${keys.phone}
  `;
  return rows
    .map((row) => Number(row.round))
    .filter((round) => round === 1 || round === 2);
}

export async function studentHasMatchByIdentity(
  identity: StudentIdentity,
  sql: Sql = getSql(),
  now = Date.now()
): Promise<boolean> {
  const keys = identityKeys(identity);
  if (!keys) return false;

  const times = await loadEventTimes(sql);
  const rounds = await studentRoundsByIdentity(identity, sql);
  const matchRows = await sql`
    SELECT me.round
    FROM student AS me
    JOIN match_result AS mr
      ON mr.male_id = me.student_id OR mr.female_id = me.student_id
    WHERE lower(btrim(me.name)) = ${keys.name}
      AND regexp_replace(me.phone, '[^0-9]', '', 'g') = ${keys.phone}
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
    times,
  });
}

/** 화면에 보여줄 매칭. 2차 접수가 있으면 2차 발표 전에는 숨기고, 이후에는 2차 매칭만 반환합니다. */
export async function loadMatchPartnerByIdentity(
  identity: StudentIdentity,
  sql: Sql = getSql(),
  now = Date.now()
): Promise<MatchPartner | null> {
  const times = await loadEventTimes(sql);
  const rounds = await studentRoundsByIdentity(identity, sql);
  const hasRound2 = rounds.includes(2);
  const announced2 = now >= eventTimeMs('round2Announce', times);
  if (hasRound2 && !announced2) return null;
  const rows = await loadMatchRows(identity, sql, hasRound2 ? 2 : null);
  const row = rows[0];
  if (!row) return null;
  return partnerFromRow(sql, row);
}
