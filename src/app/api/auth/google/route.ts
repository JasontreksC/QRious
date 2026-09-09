import { NextRequest, NextResponse } from 'next/server';
import {
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  buildGoogleAuthorizeUrl,
  createOAuthPair,
  getRequestOrigin,
  googleAuthConfigured,
  oauthCookieOptions,
} from '@/lib/google-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!googleAuthConfigured()) {
    const url = new URL('/', getRequestOrigin(req));
    url.searchParams.set('error', 'config');
    return NextResponse.redirect(url);
  }

  const origin = getRequestOrigin(req);
  const { state, verifier, challenge } = createOAuthPair();
  const url = buildGoogleAuthorizeUrl({ origin, state, challenge });
  const res = NextResponse.redirect(url);
  const opts = oauthCookieOptions();
  res.cookies.set(OAUTH_STATE_COOKIE, state, opts);
  res.cookies.set(OAUTH_VERIFIER_COOKIE, verifier, opts);
  return res;
}
