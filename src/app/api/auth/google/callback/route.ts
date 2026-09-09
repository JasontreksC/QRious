import { NextRequest, NextResponse } from 'next/server';
import { parseStudentDisplayName } from '@/lib/student-name';
import { getSql } from '@/lib/db';
import {
  GOOGLE_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  cookieBaseOptions,
  encodeSession,
  exchangeGoogleCode,
  getRequestOrigin,
  googleAuthConfigured,
  sessionCookieOptions,
} from '@/lib/google-auth';

export const runtime = 'nodejs';

function redirectHome(req: NextRequest, error?: string) {
  const origin = getRequestOrigin(req);
  const url = new URL('/', origin);
  if (error) url.searchParams.set('error', error);
  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_STATE_COOKIE, '', { ...cookieBaseOptions(), maxAge: 0 });
  res.cookies.set(OAUTH_VERIFIER_COOKIE, '', { ...cookieBaseOptions(), maxAge: 0 });
  return res;
}

export async function GET(req: NextRequest) {
  if (!googleAuthConfigured()) {
    return redirectHome(req, 'config');
  }

  const error = req.nextUrl.searchParams.get('error');
  if (error) {
    return redirectHome(req, 'google');
  }

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const savedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const verifier = req.cookies.get(OAUTH_VERIFIER_COOKIE)?.value;
  if (!code || !state || !savedState || !verifier || state !== savedState) {
    return redirectHome(req, 'google');
  }

  try {
    const profile = await exchangeGoogleCode({
      origin: getRequestOrigin(req),
      code,
      verifier,
    });
    if (!profile.sub) {
      return redirectHome(req, 'google');
    }
    if (!parseStudentDisplayName(profile.name)) {
      return redirectHome(req, 'not_student');
    }

    const sql = getSql();
    await sql`
      INSERT INTO google_user (google_sub, email, name, picture, last_login_at)
      VALUES (
        ${profile.sub},
        ${profile.email},
        ${profile.name},
        ${profile.picture},
        now()
      )
      ON CONFLICT (google_sub) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        picture = EXCLUDED.picture,
        last_login_at = now()
    `;

    const token = encodeSession({
      sub: profile.sub,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    });
    if (!token) {
      return redirectHome(req, 'config');
    }

    const res = redirectHome(req);
    res.cookies.set(GOOGLE_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (err) {
    console.error('GET /api/auth/google/callback', err);
    const message = err instanceof Error ? err.message : '';
    return redirectHome(req, message === 'domain' ? 'domain' : 'google');
  }
}
