import { NextResponse } from 'next/server';
import {
  LEGACY_GOOGLE_COOKIE,
  SESSION_COOKIE,
  cookieBaseOptions,
} from '@/lib/session';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const expired = { ...cookieBaseOptions(), maxAge: 0 };
  res.cookies.set(SESSION_COOKIE, '', expired);
  res.cookies.set(LEGACY_GOOGLE_COOKIE, '', expired);
  return res;
}
