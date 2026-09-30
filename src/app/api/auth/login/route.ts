import { NextRequest, NextResponse } from 'next/server';
import { identityIsAdmin } from '@/lib/admin-auth';
import { isValidBirth, normalizeBirth } from '@/lib/birth';
import { getSql } from '@/lib/db';
import { isUniqueViolation, jsonError } from '@/lib/http';
import { isValidKrPhone, phoneDigits } from '@/lib/phone';
import {
  StudentNumberConflict,
  adoptStudentNumber,
  parseStudentNumber,
} from '@/lib/student-number';
import { parseSubmittedName } from '@/lib/student-name';
import {
  SESSION_COOKIE,
  encodeSession,
  sessionConfigured,
  sessionCookieOptions,
} from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!sessionConfigured()) {
    return jsonError(
      503,
      'CONFIG_MISSING',
      '로그인이 아직 설정되지 않았습니다.'
    );
  }

  let body: {
    name?: unknown;
    phone?: unknown;
    birth?: unknown;
    studentNumber?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonError(400, 'VALIDATION_ERROR', 'JSON 본문이 올바르지 않습니다.');
  }

  const name = parseSubmittedName(body.name);
  const phone = typeof body.phone === 'string' ? body.phone : '';
  const birthRaw = typeof body.birth === 'string' ? body.birth : '';
  const studentNumber = parseStudentNumber(body.studentNumber);
  if (!name) {
    return jsonError(400, 'VALIDATION_ERROR', '이름을 올바르게 입력해 주세요.');
  }
  if (!studentNumber) {
    return jsonError(
      400,
      'VALIDATION_ERROR',
      '학번은 10자리 숫자로 입력해 주세요.'
    );
  }
  if (!isValidKrPhone(phone)) {
    return jsonError(
      400,
      'VALIDATION_ERROR',
      '전화번호를 올바르게 입력해 주세요.'
    );
  }
  if (!isValidBirth(birthRaw)) {
    return jsonError(
      400,
      'VALIDATION_ERROR',
      '생년월일은 6자리(YYMMDD)로 입력해 주세요.'
    );
  }
  const birth = normalizeBirth(birthRaw);
  if (!birth) {
    return jsonError(
      400,
      'VALIDATION_ERROR',
      '생년월일은 6자리(YYMMDD)로 입력해 주세요.'
    );
  }

  const phoneNorm = phoneDigits(phone);
  try {
    const sql = getSql();
    await adoptStudentNumber(sql, {
      studentNumber,
      name,
      phone: phoneNorm,
      birth,
    });
  } catch (err) {
    console.error('POST /api/auth/login', err);
    if (err instanceof StudentNumberConflict || isUniqueViolation(err)) {
      return jsonError(
        409,
        'STUDENT_NUMBER_CONFLICT',
        '이 학번은 다른 접수 정보와 겹칩니다. 이름과 전화번호를 확인해 주세요.'
      );
    }
    return jsonError(500, 'INTERNAL_ERROR', '로그인에 실패했습니다.');
  }

  const token = encodeSession({
    name,
    phone: phoneNorm,
    birth,
    studentNumber,
  });
  if (!token) {
    return jsonError(
      503,
      'CONFIG_MISSING',
      '로그인이 아직 설정되지 않았습니다.'
    );
  }

  const isAdmin = await identityIsAdmin({
    name,
    phone: phoneNorm,
    birth,
    studentNumber,
    exp: 0,
  });
  const res = NextResponse.json({ ok: true, isAdmin });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
