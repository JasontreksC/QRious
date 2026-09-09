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
import { getSql } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/google-auth';
import { isUniqueViolation, jsonError } from '@/lib/http';
import { parseStudentDisplayName } from '@/lib/student-name';

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
  phone?: unknown;
  gender?: unknown;
  age?: unknown;
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

export async function POST(req: NextRequest) {
  const googleUser = getSessionFromRequest(req);
  if (!googleUser) {
    return jsonError(
      401,
      'UNAUTHORIZED',
      '학교 구글 계정으로 로그인해 주세요.'
    );
  }

  const name = parseStudentDisplayName(googleUser.name);
  if (!name) {
    return jsonError(403, 'NOT_STUDENT', '학생만 참가할 수 있습니다.');
  }

  let body: SurveyBody;
  try {
    body = (await req.json()) as SurveyBody;
  } catch {
    return jsonError(400, 'VALIDATION_ERROR', 'JSON 본문이 올바르지 않습니다.');
  }

  const studentId = randomUUID();
  const majorId =
    asTrimmedString(body.major_id) ?? asTrimmedString(body.major);
  const phoneRaw = asTrimmedString(body.phone);
  const phoneDigits = phoneRaw ? phoneRaw.replace(/\D/g, '') : '';
  const mbti = asTrimmedString(body.mbti)?.toUpperCase() ?? null;
  const haveCharmIds = asCharmIds(body.have_charm_ids);
  const wantCharmIds = asCharmIds(body.want_charm_ids);
  const agePrefIds = parseAgePrefIds(body.age_pref_ids);
  const exHave =
    typeof body.ex_have === 'string' ? body.ex_have.trim() : '';
  const exWant =
    typeof body.ex_want === 'string' ? body.ex_want.trim() : '';

  if (!majorId) {
    return jsonError(400, 'VALIDATION_ERROR', '학과를 선택해 주세요.');
  }
  if (!/^01[016789]\d{7,8}$/.test(phoneDigits)) {
    return jsonError(400, 'VALIDATION_ERROR', '전화번호를 올바르게 입력해 주세요.');
  }
  const phone =
    phoneDigits.length === 11
      ? `${phoneDigits.slice(0, 3)}-${phoneDigits.slice(3, 7)}-${phoneDigits.slice(7)}`
      : `${phoneDigits.slice(0, 3)}-${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`;
  if (typeof body.gender !== 'boolean') {
    return jsonError(400, 'VALIDATION_ERROR', '성별을 선택해 주세요.');
  }
  if (
    typeof body.age !== 'number' ||
    !Number.isInteger(body.age) ||
    body.age < 17 ||
    body.age > 40
  ) {
    return jsonError(400, 'VALIDATION_ERROR', '나이를 올바르게 입력해 주세요.');
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
  const age = body.age;

  try {
    const sql = getSql();
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

    const duplicateGoogle = await sql`
      SELECT student_id
      FROM student
      WHERE google_sub = ${googleUser.sub}
      LIMIT 1
    `;
    if (duplicateGoogle.length > 0) {
      return jsonError(
        409,
        'DUPLICATE_GOOGLE',
        '이미 이 구글 계정으로 접수했습니다.'
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
      sql`
        INSERT INTO student (student_id, name, phone, gender, age, mbti, google_sub, email, major_id)
        VALUES (
          ${studentId}, ${name}, ${phone}, ${gender}, ${age}, ${mbti},
          ${googleUser.sub}, ${googleUser.email}, ${majorId}
        )
      `,
      ...agePrefIds.map(
        (prefId) => sql`
          INSERT INTO prefer_age (student_id, age_pref_id)
          VALUES (${studentId}, ${prefId})
        `
      ),
      ...haveCharmIds.map(
        (charmId) => sql`
          INSERT INTO have (student_id, charm_id)
          VALUES (${studentId}, ${charmId})
        `
      ),
      ...wantCharmIds.map(
        (charmId) => sql`
          INSERT INTO want (student_id, charm_id)
          VALUES (${studentId}, ${charmId})
        `
      ),
    ];

    if (exHave) {
      queries.push(sql`
        INSERT INTO ex_have (student_id, charm)
        VALUES (${studentId}, ${exHave})
      `);
    }
    if (exWant) {
      queries.push(sql`
        INSERT INTO ex_want (student_id, charm)
        VALUES (${studentId}, ${exWant})
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
        student_id, notice_version, agreed, consent_text_snapshot,
        consent_hash, ip_address, user_agent
      )
      VALUES (
        ${studentId},
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
        student_id, notice_version, agreed, consent_text_snapshot,
        consent_hash, ip_address, user_agent
      )
      VALUES (
        ${studentId},
        ${THIRD_PARTY_CONSENT_VERSION},
        true,
        ${THIRD_PARTY_CONSENT_BODY},
        ${THIRD_PARTY_CONSENT_HASH},
        ${ipAddress},
        ${userAgent}
      )
    `);

    await sql.transaction(queries);

    return NextResponse.json({ student_id: studentId }, { status: 201 });
  } catch (err) {
    console.error('POST /api/surveys', err);
    if (isUniqueViolation(err)) {
      return jsonError(
        409,
        'DUPLICATE_GOOGLE',
        '이미 이 구글 계정으로 접수했습니다.'
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

export async function DELETE(req: NextRequest) {
  const googleUser = getSessionFromRequest(req);
  if (!googleUser) {
    return jsonError(
      401,
      'UNAUTHORIZED',
      '학교 구글 계정으로 로그인해 주세요.'
    );
  }

  try {
    const sql = getSql();
    const deleted = await sql`
      DELETE FROM student
      WHERE google_sub = ${googleUser.sub}
      RETURNING student_id
    `;
    if (deleted.length === 0) {
      return jsonError(404, 'NOT_FOUND', '접수 내역이 없습니다.');
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/surveys', err);
    return jsonError(500, 'INTERNAL_ERROR', '접수를 취소하지 못했습니다.');
  }
}

