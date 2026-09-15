import { NextRequest, NextResponse } from 'next/server';
import { identityIsAdmin } from '@/lib/admin-auth';
import { isValidBirth, normalizeBirth } from '@/lib/birth';
import { getSql } from '@/lib/db';
import { jsonError } from '@/lib/http';
import { isValidKrPhone, nameKey, phoneDigits } from '@/lib/phone';
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

  let body: { name?: unknown; phone?: unknown; birth?: unknown };
  try {
    body = (await req.json()) as {
      name?: unknown;
      phone?: unknown;
      birth?: unknown;
    };
  } catch {
    return jsonError(400, 'VALIDATION_ERROR', 'JSON 본문이 올바르지 않습니다.');
  }

  const name = parseSubmittedName(body.name);
  const phone = typeof body.phone === 'string' ? body.phone : '';
  const birthRaw = typeof body.birth === 'string' ? body.birth : '';
  if (!name) {
    return jsonError(400, 'VALIDATION_ERROR', '이름을 올바르게 입력해 주세요.');
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
    await sql`
      UPDATE student
      SET birth = ${birth}
      WHERE lower(btrim(name)) = ${nameKey(name)}
        AND regexp_replace(phone, '[^0-9]', '', 'g') = ${phoneNorm}
    `;
  } catch (err) {
    console.error('POST /api/auth/login birth', err);
  }

  const token = encodeSession({ name, phone: phoneNorm, birth });
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
    exp: 0,
  });
  const res = NextResponse.json({ ok: true, isAdmin });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
