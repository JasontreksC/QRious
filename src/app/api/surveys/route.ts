import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { parseAgePrefIds } from '@/lib/age-pref';
import {
  CONSENT_BODY,
  CONSENT_HASH,
  CONSENT_ITEMS,
  CONSENT_OPTIONAL_ITEMS,
  CONSENT_PURPOSE,
  CONSENT_REFUSAL,
  CONSENT_RETENTION,
  CONSENT_TITLE,
  CONSENT_VERSION,
  THIRD_PARTY_CONSENT_BODY,
  THIRD_PARTY_CONSENT_HASH,
  THIRD_PARTY_CONSENT_TITLE,
  THIRD_PARTY_CONSENT_VERSION,
  THIRD_PARTY_ITEMS,
  THIRD_PARTY_OPTIONAL_ITEMS,
  THIRD_PARTY_PURPOSE,
  THIRD_PARTY_REFUSAL,
  THIRD_PARTY_RETENTION,
} from '@/lib/consent';
import { currentRegistrationRound } from '@/lib/deadline';
import { loadEventTimes } from '@/lib/event-schedule';
import { getSql } from '@/lib/db';
import { isUniqueViolation, jsonError } from '@/lib/http';
import { deleteOrphanStudent, loadOwnSurvey } from '@/lib/own-survey';
import { formatKrPhone, isValidKrPhone, nameKey, phoneDigits } from '@/lib/phone';
import {
  SESSION_COOKIE,
  encodeSession,
  getSessionFromRequest,
  sessionCookieOptions,
} from '@/lib/session';
import { parseSubmittedName } from '@/lib/student-name';

export const runtime = 'nodejs';

const MBTI_OPTIONS = new Set([
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SurveyBody = {
  name?: unknown;
  phone?: unknown;
  gender?: unknown;
  major?: unknown;
  major_id?: unknown;
  mbti?: unknown;
  age_pref_ids?: unknown;
  have_charm_ids?: unknown;
  want_charm_ids?: unknown;
  ex_have?: unknown;
  ex_want?: unknown;
  consent_agreed?: unknown;
  consent_version?: unknown;
  third_party_consent_agreed?: unknown;
  third_party_consent_version?: unknown;
};

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asCharmIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length === 0) return null;
  const ids = value.map((item) => (typeof item === 'string' ? item.trim() : ''));
  if (ids.some((id) => !UUID_RE.test(id))) return null;
  return [...new Set(ids)];
}

function requireSession(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return jsonError(401, 'UNAUTHORIZED', '이름과 전화번호로 로그인해 주세요.');
  }
  return session;
}

export async function GET(req: NextRequest) {
  const session = requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const sql = getSql();
    const times = await loadEventTimes(sql);
    const survey = await loadOwnSurvey(
      sql,
      session,
      currentRegistrationRound(Date.now(), times)
    );
    if (!survey) {
      return jsonError(404, 'NOT_FOUND', '접수 내역이 없습니다.');
    }
    return NextResponse.json(survey);
  } catch (err) {
    console.error('GET /api/surveys', err);
    const message =
      err instanceof Error && err.message.includes('DATABASE_URL')
        ? err.message
        : '접수 정보를 불러오지 못했습니다.';
    const code =
      err instanceof Error && err.message.includes('DATABASE_URL')
        ? 'CONFIG_MISSING'
        : 'INTERNAL_ERROR';
    return jsonError(code === 'CONFIG_MISSING' ? 503 : 500, code, message);
  }
}

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return jsonError(401, 'UNAUTHORIZED', '이름과 전화번호로 로그인해 주세요.');
  }

  const sql = getSql();
  const times = await loadEventTimes(sql);
  const round = currentRegistrationRound(Date.now(), times);
  if (round == null) {
    return jsonError(403, 'DEADLINE', '접수가 마감되었습니다.');
  }

  let body: SurveyBody;
  try {
    body = (await req.json()) as SurveyBody;
  } catch {
    return jsonError(400, 'VALIDATION_ERROR', 'JSON 본문이 올바르지 않습니다.');
  }

  const registrationId = randomUUID();
  const name = parseSubmittedName(body.name) ?? parseSubmittedName(session.name);
  const majorId =
    asTrimmedString(body.major_id) ?? asTrimmedString(body.major);
  const phoneRaw = asTrimmedString(body.phone) ?? session.phone;
  const mbti = asTrimmedString(body.mbti)?.toUpperCase() ?? null;
  const haveCharmIds = asCharmIds(body.have_charm_ids);
  const wantCharmIds = asCharmIds(body.want_charm_ids);
  const agePrefIds = parseAgePrefIds(body.age_pref_ids);
  const exHave =
    typeof body.ex_have === 'string' ? body.ex_have.trim() : '';
  const exWant =
    typeof body.ex_want === 'string' ? body.ex_want.trim() : '';

  if (!name) {
    return jsonError(400, 'VALIDATION_ERROR', '이름을 올바르게 입력해 주세요.');
  }
  if (!majorId) {
    return jsonError(400, 'VALIDATION_ERROR', '학과를 선택해 주세요.');
  }
  if (!isValidKrPhone(phoneRaw)) {
    return jsonError(400, 'VALIDATION_ERROR', '전화번호를 올바르게 입력해 주세요.');
  }
  const phone = formatKrPhone(phoneRaw);
  if (typeof body.gender !== 'boolean') {
    return jsonError(400, 'VALIDATION_ERROR', '성별을 선택해 주세요.');
  }
  if (!session.birth) {
    return jsonError(401, 'UNAUTHORIZED', '이름과 전화번호로 로그인해 주세요.');
  }
  if (!mbti || !MBTI_OPTIONS.has(mbti)) {
    return jsonError(400, 'VALIDATION_ERROR', 'MBTI를 올바르게 선택해 주세요.');
  }
  if (!agePrefIds) {
    return jsonError(
      400,
      'VALIDATION_ERROR',
      '선호하는 연령 조건을 선택해 주세요.'
    );
  }
  if (!haveCharmIds) {
    return jsonError(
      400,
      'VALIDATION_ERROR',
      '나의 매력을 하나 이상 선택해 주세요.'
    );
  }
  if (!wantCharmIds) {
    return jsonError(
      400,
      'VALIDATION_ERROR',
      '이상형 매력을 하나 이상 선택해 주세요.'
    );
  }
  if (body.consent_agreed !== true) {
    return jsonError(
      400,
      'VALIDATION_ERROR',
      '개인정보 수집·이용에 동의해 주세요.'
    );
  }
  if (asTrimmedString(body.consent_version) !== CONSENT_VERSION) {
    return jsonError(
      400,
      'VALIDATION_ERROR',
      '동의문 버전이 올바르지 않습니다. 페이지를 새로고침한 뒤 다시 동의해 주세요.'
    );
  }
  if (body.third_party_consent_agreed !== true) {
    return jsonError(
      400,
      'VALIDATION_ERROR',
      '개인정보 제3자 제공에 동의해 주세요.'
    );
  }
  if (
    asTrimmedString(body.third_party_consent_version) !==
    THIRD_PARTY_CONSENT_VERSION
  ) {
    return jsonError(
      400,
      'VALIDATION_ERROR',
      '제3자 제공 동의문 버전이 올바르지 않습니다. 페이지를 새로고침한 뒤 다시 동의해 주세요.'
    );
  }

  const gender = body.gender;
  const birth = session.birth;

  try {
    const allCharmIds = [...new Set([...haveCharmIds, ...wantCharmIds])];

    const existing = await sql`
      SELECT charm_id::text AS charm_id
      FROM charm
      WHERE charm_id::text = ANY(${allCharmIds})
    `;
    if (existing.length !== allCharmIds.length) {
      return jsonError(
        400,
        'VALIDATION_ERROR',
        '존재하지 않는 매력 태그가 포함되어 있습니다.'
      );
    }

    const existingPerson = await sql`
      SELECT student_id
      FROM student
      WHERE lower(btrim(name)) = ${nameKey(name)}
        AND regexp_replace(phone, '[^0-9]', '', 'g') = ${phoneDigits(phone)}
      LIMIT 1
    `;
    const studentId = existingPerson[0]
      ? String(existingPerson[0].student_id)
      : randomUUID();
    const isNewPerson = existingPerson.length === 0;

    if (!isNewPerson) {
      const duplicateRound = await sql`
        SELECT registration_id
        FROM registration
        WHERE student_id = ${studentId} AND round = ${round}
        LIMIT 1
      `;
      if (duplicateRound.length > 0) {
        return jsonError(
          409,
          'DUPLICATE_STUDENT',
          `이미 ${round}차 접수를 완료했습니다.`
        );
      }
    }

    const existingPrefs = await sql`
      SELECT age_pref_id
      FROM age_pref
      WHERE age_pref_id = ANY(${agePrefIds})
    `;
    if (existingPrefs.length !== agePrefIds.length) {
      return jsonError(
        400,
        'VALIDATION_ERROR',
        '선호 연령 조건이 올바르지 않습니다.'
      );
    }

    const existingMajor = await sql`
      SELECT major_id
      FROM major
      WHERE major_id = ${majorId}
      LIMIT 1
    `;
    if (existingMajor.length === 0) {
      return jsonError(400, 'VALIDATION_ERROR', '학과를 선택해 주세요.');
    }

    const queries = [
      isNewPerson
        ? sql`
            INSERT INTO student (student_id, name, phone, gender, birth, major_id)
            VALUES (
              ${studentId}, ${name}, ${phone}, ${gender}, ${birth}, ${majorId}
            )
          `
        : sql`
            UPDATE student
            SET name = ${name},
                phone = ${phone},
                gender = ${gender},
                birth = ${birth},
                major_id = ${majorId}
            WHERE student_id = ${studentId}
          `,
      sql`
        INSERT INTO registration (registration_id, student_id, round, mbti)
        VALUES (${registrationId}, ${studentId}, ${round}, ${mbti})
      `,
      ...agePrefIds.map(
        (prefId) => sql`
          INSERT INTO prefer_age (registration_id, age_pref_id)
          VALUES (${registrationId}, ${prefId})
        `
      ),
      ...haveCharmIds.map(
        (charmId) => sql`
          INSERT INTO have (registration_id, charm_id)
          VALUES (${registrationId}, ${charmId})
        `
      ),
      ...wantCharmIds.map(
        (charmId) => sql`
          INSERT INTO want (registration_id, charm_id)
          VALUES (${registrationId}, ${charmId})
        `
      ),
    ];

    if (exHave) {
      queries.push(sql`
        INSERT INTO ex_have (registration_id, charm)
        VALUES (${registrationId}, ${exHave})
      `);
    }
    if (exWant) {
      queries.push(sql`
        INSERT INTO ex_want (registration_id, charm)
        VALUES (${registrationId}, ${exWant})
      `);
    }

    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null;
    const userAgent = req.headers.get('user-agent') || null;

    queries.push(sql`
      INSERT INTO consent_notice (
        version, title, body, purpose, collected_items, optional_items,
        retention_period, refusal_notice, body_hash
      )
      VALUES (
        ${CONSENT_VERSION},
        ${CONSENT_TITLE},
        ${CONSENT_BODY},
        ${CONSENT_PURPOSE},
        ${CONSENT_ITEMS},
        ${CONSENT_OPTIONAL_ITEMS},
        ${CONSENT_RETENTION},
        ${CONSENT_REFUSAL},
        ${CONSENT_HASH}
      )
      ON CONFLICT (version) DO NOTHING
    `);

    queries.push(sql`
      INSERT INTO consent_notice (
        version, title, body, purpose, collected_items, optional_items,
        retention_period, refusal_notice, body_hash
      )
      VALUES (
        ${THIRD_PARTY_CONSENT_VERSION},
        ${THIRD_PARTY_CONSENT_TITLE},
        ${THIRD_PARTY_CONSENT_BODY},
        ${THIRD_PARTY_PURPOSE},
        ${THIRD_PARTY_ITEMS},
        ${THIRD_PARTY_OPTIONAL_ITEMS},
        ${THIRD_PARTY_RETENTION},
        ${THIRD_PARTY_REFUSAL},
        ${THIRD_PARTY_CONSENT_HASH}
      )
      ON CONFLICT (version) DO NOTHING
    `);

    queries.push(sql`
      INSERT INTO consent (
        registration_id, notice_version, agreed, consent_text_snapshot,
        consent_hash, ip_address, user_agent
      )
      VALUES (
        ${registrationId},
        ${CONSENT_VERSION},
        true,
        ${CONSENT_BODY},
        ${CONSENT_HASH},
        ${ipAddress},
        ${userAgent}
      )
    `);

    queries.push(sql`
      INSERT INTO consent (
        registration_id, notice_version, agreed, consent_text_snapshot,
        consent_hash, ip_address, user_agent
      )
      VALUES (
        ${registrationId},
        ${THIRD_PARTY_CONSENT_VERSION},
        true,
        ${THIRD_PARTY_CONSENT_BODY},
        ${THIRD_PARTY_CONSENT_HASH},
        ${ipAddress},
        ${userAgent}
      )
    `);

    await sql.transaction(queries);

    const res = NextResponse.json(
      { student_id: studentId, registration_id: registrationId },
      { status: 201 }
    );
    const token = encodeSession({ name, phone, birth: session.birth });
    if (token) res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (err) {
    console.error('POST /api/surveys', err);
    if (isUniqueViolation(err)) {
      return jsonError(
        409,
        'DUPLICATE_STUDENT',
        '이미 이번 차수에 접수했습니다.'
      );
    }
    const message =
      err instanceof Error && err.message.includes('DATABASE_URL')
        ? err.message
        : '설문 제출에 실패했습니다.';
    const code =
      err instanceof Error && err.message.includes('DATABASE_URL')
        ? 'CONFIG_MISSING'
        : 'INTERNAL_ERROR';
    return jsonError(code === 'CONFIG_MISSING' ? 503 : 500, code, message);
  }
}

export async function PATCH(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return jsonError(401, 'UNAUTHORIZED', '이름과 전화번호로 로그인해 주세요.');
  }

  const roundSql = getSql();
  const times = await loadEventTimes(roundSql);
  const round = currentRegistrationRound(Date.now(), times);
  if (round == null) {
    return jsonError(403, 'DEADLINE', '접수가 마감되었습니다.');
  }

  let body: SurveyBody;
  try {
    body = (await req.json()) as SurveyBody;
  } catch {
    return jsonError(400, 'VALIDATION_ERROR', 'JSON 본문이 올바르지 않습니다.');
  }

  const has = (key: keyof SurveyBody) =>
    Object.prototype.hasOwnProperty.call(body, key);

  if (
    !has('name') &&
    !has('phone') &&
    !has('gender') &&
    !has('major') &&
    !has('major_id') &&
    !has('mbti') &&
    !has('age_pref_ids') &&
    !has('have_charm_ids') &&
    !has('want_charm_ids') &&
    !has('ex_have') &&
    !has('ex_want')
  ) {
    return jsonError(400, 'VALIDATION_ERROR', '수정할 항목이 없습니다.');
  }

  try {
    const sql = roundSql;
    const existing = await sql`
      SELECT r.registration_id, r.student_id
      FROM registration r
      JOIN student s ON s.student_id = r.student_id
      WHERE lower(btrim(s.name)) = ${nameKey(session.name)}
        AND regexp_replace(s.phone, '[^0-9]', '', 'g') = ${phoneDigits(session.phone)}
        AND r.round = ${round}
      LIMIT 1
    `;
    const registrationId = existing[0]
      ? String(existing[0].registration_id)
      : '';
    const studentId = existing[0] ? String(existing[0].student_id) : '';
    if (!registrationId || !studentId) {
      return jsonError(404, 'NOT_FOUND', '접수 내역이 없습니다.');
    }

    const queries = [];

    if (has('name')) {
      const name = parseSubmittedName(body.name);
      if (!name) {
        return jsonError(
          400,
          'VALIDATION_ERROR',
          '이름을 올바르게 입력해 주세요.'
        );
      }
      queries.push(sql`
        UPDATE student SET name = ${name} WHERE student_id = ${studentId}
      `);
    }

    if (has('phone')) {
      const phoneRaw = asTrimmedString(body.phone);
      if (!phoneRaw || !isValidKrPhone(phoneRaw)) {
        return jsonError(
          400,
          'VALIDATION_ERROR',
          '전화번호를 올바르게 입력해 주세요.'
        );
      }
      const phone = formatKrPhone(phoneRaw);
      queries.push(sql`
        UPDATE student SET phone = ${phone} WHERE student_id = ${studentId}
      `);
    }

    if (has('gender')) {
      if (typeof body.gender !== 'boolean') {
        return jsonError(400, 'VALIDATION_ERROR', '성별을 선택해 주세요.');
      }
      queries.push(sql`
        UPDATE student SET gender = ${body.gender} WHERE student_id = ${studentId}
      `);
    }

    if (has('major_id') || has('major')) {
      const majorId =
        asTrimmedString(body.major_id) ?? asTrimmedString(body.major);
      if (!majorId) {
        return jsonError(400, 'VALIDATION_ERROR', '학과를 선택해 주세요.');
      }
      const existingMajor = await sql`
        SELECT major_id FROM major WHERE major_id = ${majorId} LIMIT 1
      `;
      if (existingMajor.length === 0) {
        return jsonError(400, 'VALIDATION_ERROR', '학과를 선택해 주세요.');
      }
      queries.push(sql`
        UPDATE student SET major_id = ${majorId} WHERE student_id = ${studentId}
      `);
    }

    if (has('mbti')) {
      const mbti = asTrimmedString(body.mbti)?.toUpperCase() ?? null;
      if (!mbti || !MBTI_OPTIONS.has(mbti)) {
        return jsonError(400, 'VALIDATION_ERROR', 'MBTI를 올바르게 선택해 주세요.');
      }
      queries.push(sql`
        UPDATE registration SET mbti = ${mbti} WHERE registration_id = ${registrationId}
      `);
    }

    if (has('age_pref_ids')) {
      const agePrefIds = parseAgePrefIds(body.age_pref_ids);
      if (!agePrefIds) {
        return jsonError(
          400,
          'VALIDATION_ERROR',
          '선호하는 연령 조건을 선택해 주세요.'
        );
      }
      const existingPrefs = await sql`
        SELECT age_pref_id
        FROM age_pref
        WHERE age_pref_id = ANY(${agePrefIds})
      `;
      if (existingPrefs.length !== agePrefIds.length) {
        return jsonError(
          400,
          'VALIDATION_ERROR',
          '선호 연령 조건이 올바르지 않습니다.'
        );
      }
      queries.push(sql`DELETE FROM prefer_age WHERE registration_id = ${registrationId}`);
      for (const prefId of agePrefIds) {
        queries.push(sql`
          INSERT INTO prefer_age (registration_id, age_pref_id)
          VALUES (${registrationId}, ${prefId})
        `);
      }
    }

    if (has('have_charm_ids')) {
      const haveCharmIds = asCharmIds(body.have_charm_ids);
      if (!haveCharmIds) {
        return jsonError(
          400,
          'VALIDATION_ERROR',
          '나의 매력을 하나 이상 선택해 주세요.'
        );
      }
      const existingCharms = await sql`
        SELECT charm_id::text AS charm_id
        FROM charm
        WHERE charm_id::text = ANY(${haveCharmIds})
      `;
      if (existingCharms.length !== haveCharmIds.length) {
        return jsonError(
          400,
          'VALIDATION_ERROR',
          '존재하지 않는 매력 태그가 포함되어 있습니다.'
        );
      }
      queries.push(sql`DELETE FROM have WHERE registration_id = ${registrationId}`);
      for (const charmId of haveCharmIds) {
        queries.push(sql`
          INSERT INTO have (registration_id, charm_id)
          VALUES (${registrationId}, ${charmId})
        `);
      }
    }

    if (has('want_charm_ids')) {
      const wantCharmIds = asCharmIds(body.want_charm_ids);
      if (!wantCharmIds) {
        return jsonError(
          400,
          'VALIDATION_ERROR',
          '이상형 매력을 하나 이상 선택해 주세요.'
        );
      }
      const existingCharms = await sql`
        SELECT charm_id::text AS charm_id
        FROM charm
        WHERE charm_id::text = ANY(${wantCharmIds})
      `;
      if (existingCharms.length !== wantCharmIds.length) {
        return jsonError(
          400,
          'VALIDATION_ERROR',
          '존재하지 않는 매력 태그가 포함되어 있습니다.'
        );
      }
      queries.push(sql`DELETE FROM want WHERE registration_id = ${registrationId}`);
      for (const charmId of wantCharmIds) {
        queries.push(sql`
          INSERT INTO want (registration_id, charm_id)
          VALUES (${registrationId}, ${charmId})
        `);
      }
    }

    if (has('ex_have')) {
      const exHave =
        typeof body.ex_have === 'string' ? body.ex_have.trim() : '';
      queries.push(sql`DELETE FROM ex_have WHERE registration_id = ${registrationId}`);
      if (exHave) {
        queries.push(sql`
          INSERT INTO ex_have (registration_id, charm)
          VALUES (${registrationId}, ${exHave})
        `);
      }
    }

    if (has('ex_want')) {
      const exWant =
        typeof body.ex_want === 'string' ? body.ex_want.trim() : '';
      queries.push(sql`DELETE FROM ex_want WHERE registration_id = ${registrationId}`);
      if (exWant) {
        queries.push(sql`
          INSERT INTO ex_want (registration_id, charm)
          VALUES (${registrationId}, ${exWant})
        `);
      }
    }

    if (queries.length > 0) {
      await sql.transaction(queries);
    }

    const nextName = has('name')
      ? parseSubmittedName(body.name) ?? session.name
      : session.name;
    const nextPhone = has('phone')
      ? formatKrPhone(String(body.phone ?? session.phone))
      : session.phone;
    const survey = await loadOwnSurvey(
      sql,
      { name: nextName, phone: nextPhone },
      round
    );
    if (!survey) {
      return jsonError(404, 'NOT_FOUND', '접수 내역이 없습니다.');
    }
    const res = NextResponse.json(survey);
    if (has('name') || has('phone')) {
      const token = encodeSession({
        name: survey.name,
        phone: survey.phone,
        birth: session.birth,
      });
      if (token) res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    }
    return res;
  } catch (err) {
    console.error('PATCH /api/surveys', err);
    const message =
      err instanceof Error && err.message.includes('DATABASE_URL')
        ? err.message
        : '접수 정보를 수정하지 못했습니다.';
    const code =
      err instanceof Error && err.message.includes('DATABASE_URL')
        ? 'CONFIG_MISSING'
        : 'INTERNAL_ERROR';
    return jsonError(code === 'CONFIG_MISSING' ? 503 : 500, code, message);
  }
}

export async function DELETE(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return jsonError(401, 'UNAUTHORIZED', '이름과 전화번호로 로그인해 주세요.');
  }

  const sql = getSql();
  const times = await loadEventTimes(sql);
  const round = currentRegistrationRound(Date.now(), times);
  if (round == null) {
    return jsonError(403, 'DEADLINE', '접수가 마감되었습니다.');
  }

  try {
    const deleted = await sql`
      DELETE FROM registration r
      USING student s
      WHERE r.student_id = s.student_id
        AND lower(btrim(s.name)) = ${nameKey(session.name)}
        AND regexp_replace(s.phone, '[^0-9]', '', 'g') = ${phoneDigits(session.phone)}
        AND r.round = ${round}
      RETURNING r.student_id
    `;
    if (deleted.length === 0) {
      return jsonError(404, 'NOT_FOUND', '접수 내역이 없습니다.');
    }
    await deleteOrphanStudent(sql, String(deleted[0].student_id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/surveys', err);
    return jsonError(500, 'INTERNAL_ERROR', '접수를 취소하지 못했습니다.');
  }
}

