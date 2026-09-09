import { NextRequest, NextResponse } from 'next/server';
import { sessionIsAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const authenticated = await sessionIsAdmin(req);
  return NextResponse.json({ authenticated });
}
