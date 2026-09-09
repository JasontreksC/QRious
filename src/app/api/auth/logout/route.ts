import { NextResponse } from 'next/server';
import { GOOGLE_COOKIE, cookieBaseOptions } from '@/lib/google-auth';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(GOOGLE_COOKIE, '', { ...cookieBaseOptions(), maxAge: 0 });
  return res;
}
