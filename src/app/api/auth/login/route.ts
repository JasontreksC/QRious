import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '@/lib/http';
import { isValidKrPhone, phoneDigits } from '@/lib/phone';
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

  let body: { name?: unknown; phone?: unknown };
  try {
    body = (await req.json()) as { name?: unknown; phone?: unknown };
  } catch {
    return jsonError(400, 'VALIDATION_ERROR', 'JSON 본문이 올바르지 않습니다.');
  }

  const name = parseSubmittedName(body.name);
  const phone = typeof body.phone === 'string' ? body.phone : '';
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

  const token = encodeSession({ name, phone: phoneDigits(phone) });
  if (!token) {
    return jsonError(
      503,
      'CONFIG_MISSING',
      '로그인이 아직 설정되지 않았습니다.'
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
