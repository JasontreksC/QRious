import { NextRequest, NextResponse } from 'next/server';
import { emailIsAdmin } from '@/lib/admin-auth';
import { getSql } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/google-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  let submitted = false;
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT student_id
      FROM student
      WHERE google_sub = ${session.sub}
      LIMIT 1
    `;
    submitted = rows.length > 0;
  } catch (err) {
    console.error('GET /api/auth/session', err);
  }

  return NextResponse.json({
    authenticated: true,
    email: session.email,
    name: session.name,
    picture: session.picture,
    submitted,
    isAdmin: await emailIsAdmin(session.email),
  });
}
