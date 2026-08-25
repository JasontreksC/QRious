import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  adminPasswordConfigured,
  buildSessionCookieValue,
  cookieOptions,
  passwordMatches,
} from '@/lib/admin-auth';
import { jsonError } from '@/lib/http';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!adminPasswordConfigured()) {
    return jsonError(
      503,
      'CONFIG_MISSING',
      'ADMIN_PASSWORD가 설정되지 않았습니다.'
    );
  }

  let body: { password?: unknown };
  try {
    body = (await req.json()) as { password?: unknown };
  } catch {
    return jsonError(400, 'VALIDATION_ERROR', 'JSON 본문이 올바르지 않습니다.');
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (!passwordMatches(password)) {
    return jsonError(401, 'INVALID_PASSWORD', '비밀번호가 올바르지 않습니다.');
  }

  const token = buildSessionCookieValue();
  if (!token) {
    return jsonError(
      503,
      'CONFIG_MISSING',
      'ADMIN_PASSWORD가 설정되지 않았습니다.'
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, cookieOptions());
  return res;
}
