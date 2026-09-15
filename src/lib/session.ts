import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { phoneDigits } from '@/lib/phone';

export const SESSION_COOKIE = 'qrious_session';
export const LEGACY_GOOGLE_COOKIE = 'qrious_google';

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

export type AppSession = {
  name: string;
  phone: string;
  exp: number;
};

export type AppPublicSession = {
  authenticated: true;
  name: string;
  phone: string;
  submitted: boolean;
  rounds: number[];
  round1SubmittedAt: string | null;
  round2SubmittedAt: string | null;
  matched: boolean;
};

function getAuthSecret(): string | null {
  const secret = process.env.AUTH_SECRET?.trim();
  return secret ? secret : null;
}

export function sessionConfigured(): boolean {
  return Boolean(getAuthSecret());
}

export function cookieBaseOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

export function sessionCookieOptions() {
  return { ...cookieBaseOptions(), maxAge: SESSION_MAX_AGE_SEC };
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function signPayload(encoded: string, secret: string): string {
  return createHmac('sha256', secret).update(encoded).digest('base64url');
}

export function encodeSession(session: Omit<AppSession, 'exp'>): string | null {
  const secret = getAuthSecret();
  if (!secret) return null;
  const payload: AppSession = {
    name: normalizeSessionName(session.name),
    phone: phoneDigits(session.phone),
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC,
  };
  if (!payload.name || !payload.phone) return null;
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encoded}.${signPayload(encoded, secret)}`;
}

export function decodeSession(token: string | undefined): AppSession | null {
  const secret = getAuthSecret();
  if (!secret || !token) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const expected = signPayload(encoded, secret);
  if (!safeEqual(sig, expected)) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as AppSession;
    if (
      typeof parsed.name !== 'string' ||
      typeof parsed.phone !== 'string' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }
    if (parsed.exp * 1000 < Date.now()) return null;
    const name = normalizeSessionName(parsed.name);
    const phone = phoneDigits(parsed.phone);
    if (!name || !phone) return null;
    return { name, phone, exp: parsed.exp };
  } catch {
    return null;
  }
}

export function normalizeSessionName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function getSessionFromRequest(req: NextRequest): AppSession | null {
  return decodeSession(req.cookies.get(SESSION_COOKIE)?.value);
}

export async function getSessionFromCookies(): Promise<AppSession | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}
