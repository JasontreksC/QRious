import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '@/lib/http';

export const ADMIN_COOKIE = 'qrious_admin';
const SESSION_PAYLOAD = 'qrious-admin-session';

function getAdminPassword(): string | null {
  const password = process.env.ADMIN_PASSWORD?.trim();
  return password ? password : null;
}

export function adminPasswordConfigured(): boolean {
  return Boolean(getAdminPassword());
}

function sessionTokenFor(password: string): string {
  return createHmac('sha256', password).update(SESSION_PAYLOAD).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function passwordMatches(input: string): boolean {
  const password = getAdminPassword();
  if (!password) return false;
  return safeEqual(input, password);
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function buildSessionCookieValue(): string | null {
  const password = getAdminPassword();
  if (!password) return null;
  return sessionTokenFor(password);
}

export function isValidSessionToken(token: string | undefined): boolean {
  const expected = buildSessionCookieValue();
  if (!expected || !token) return false;
  return safeEqual(token, expected);
}

export async function isAdminCookieRequest(): Promise<boolean> {
  const store = await cookies();
  return isValidSessionToken(store.get(ADMIN_COOKIE)?.value);
}

export function isAdminRequest(req: NextRequest): boolean {
  return isValidSessionToken(req.cookies.get(ADMIN_COOKIE)?.value);
}

export function unauthorized() {
  return jsonError(401, 'UNAUTHORIZED', '관리자 로그인이 필요합니다.');
}

export function requireAdmin(req: NextRequest): NextResponse | null {
  if (!adminPasswordConfigured()) {
    return jsonError(
      503,
      'CONFIG_MISSING',
      'ADMIN_PASSWORD가 설정되지 않았습니다.'
    );
  }
  if (!isAdminRequest(req)) {
    return unauthorized();
  }
  return null;
}
