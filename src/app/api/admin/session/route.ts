import { NextResponse } from 'next/server';
import { isAdminCookieRequest } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function GET() {
  const authenticated = await isAdminCookieRequest();
  return NextResponse.json({ authenticated });
}
