import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export const GOOGLE_COOKIE = 'qrious_google';
export const OAUTH_STATE_COOKIE = 'qrious_oauth_state';
export const OAUTH_VERIFIER_COOKIE = 'qrious_oauth_verifier';
export const SCHOOL_HOSTED_DOMAIN = 'yeonsung.ac.kr';

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

export type GoogleSession = {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
  exp: number;
};

export type GooglePublicSession = {
  authenticated: true;
  email: string;
  name: string;
  picture: string | null;
  submitted: boolean;
};

function getAuthSecret(): string | null {
  const secret = process.env.AUTH_SECRET?.trim();
  return secret ? secret : null;
}

export function googleAuthConfigured(): boolean {
  return Boolean(
    getAuthSecret() &&
      process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
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

export function oauthCookieOptions() {
  return { ...cookieBaseOptions(), maxAge: 60 * 10 };
}

export function getRequestOrigin(req: NextRequest): string {
  const configured = process.env.AUTH_URL?.trim().replace(/\/$/, '');
  if (configured) return configured;
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  const host =
    req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

export function googleCallbackUrl(origin: string): string {
  return `${origin}/api/auth/google/callback`;
}

export function isSchoolGoogleEmail(email: string, hd?: string | null): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized.endsWith(`@${SCHOOL_HOSTED_DOMAIN}`)) return false;
  if (hd && hd.toLowerCase() !== SCHOOL_HOSTED_DOMAIN) return false;
  return true;
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

export function encodeSession(session: Omit<GoogleSession, 'exp'>): string | null {
  const secret = getAuthSecret();
  if (!secret) return null;
  const payload: GoogleSession = {
    ...session,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encoded}.${signPayload(encoded, secret)}`;
}

export function decodeSession(token: string | undefined): GoogleSession | null {
  const secret = getAuthSecret();
  if (!secret || !token) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const expected = signPayload(encoded, secret);
  if (!safeEqual(sig, expected)) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as GoogleSession;
    if (
      typeof parsed.sub !== 'string' ||
      typeof parsed.email !== 'string' ||
      typeof parsed.name !== 'string' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }
    if (parsed.exp * 1000 < Date.now()) return null;
    if (!isSchoolGoogleEmail(parsed.email)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(req: NextRequest): GoogleSession | null {
  return decodeSession(req.cookies.get(GOOGLE_COOKIE)?.value);
}

export async function getSessionFromCookies(): Promise<GoogleSession | null> {
  const store = await cookies();
  return decodeSession(store.get(GOOGLE_COOKIE)?.value);
}

export function createOAuthPair(): { state: string; verifier: string; challenge: string } {
  const state = randomBytes(16).toString('hex');
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { state, verifier, challenge };
}

export function buildGoogleAuthorizeUrl(params: {
  origin: string;
  state: string;
  challenge: string;
}): string {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID missing');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', googleCallbackUrl(params.origin));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', params.state);
  url.searchParams.set('code_challenge', params.challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('hd', SCHOOL_HOSTED_DOMAIN);
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

type GoogleIdTokenInfo = {
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  hd?: string;
  given_name?: string;
  family_name?: string;
  aud?: string;
};

export async function exchangeGoogleCode(params: {
  origin: string;
  code: string;
  verifier: string;
}): Promise<GoogleSession> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT missing');
  }

  const body = new URLSearchParams({
    code: params.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: googleCallbackUrl(params.origin),
    grant_type: 'authorization_code',
    code_verifier: params.verifier,
  });

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!tokenRes.ok) {
    throw new Error('token_exchange_failed');
  }
  const tokenJson = (await tokenRes.json()) as { id_token?: string };
  if (!tokenJson.id_token) {
    throw new Error('missing_id_token');
  }

  const infoRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenJson.id_token)}`
  );
  if (!infoRes.ok) {
    throw new Error('id_token_invalid');
  }
  const info = (await infoRes.json()) as GoogleIdTokenInfo;
  if (info.aud !== clientId) {
    throw new Error('aud_mismatch');
  }

  const email = info.email?.trim().toLowerCase() ?? '';
  const verified = info.email_verified === true || info.email_verified === 'true';
  if (!email || !verified || !isSchoolGoogleEmail(email, info.hd ?? null)) {
    throw new Error('domain');
  }

  const name =
    info.name?.trim() ||
    [info.family_name, info.given_name].filter(Boolean).join(' ').trim() ||
    email.split('@')[0];

  return {
    sub: String(info.sub ?? ''),
    email,
    name,
    picture: info.picture ?? null,
    exp: 0,
  };
}
