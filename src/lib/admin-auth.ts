import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { jsonError } from '@/lib/http';
import { nameKey, phoneDigits } from '@/lib/phone';
import { getSessionFromRequest, type AppSession } from '@/lib/session';

export async function identityIsAdmin(session: AppSession): Promise<boolean> {
  const name = nameKey(session.name);
  const phone = phoneDigits(session.phone);
  const birth = session.birth;
  if (!name || !phone || birth.length !== 6) return false;
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT 1
      FROM admin
      WHERE name IS NOT NULL
        AND phone IS NOT NULL
        AND birth IS NOT NULL
        AND lower(btrim(name)) = ${name}
        AND regexp_replace(phone, '[^0-9]', '', 'g') = ${phone}
        AND birth = ${birth}
      LIMIT 1
    `;
    return rows.length > 0;
  } catch (err) {
    console.error('identityIsAdmin', err);
    return false;
  }
}

export async function sessionIsAdmin(req: NextRequest): Promise<boolean> {
  const session = getSessionFromRequest(req);
  if (!session) return false;
  return identityIsAdmin(session);
}

export function unauthorized() {
  return jsonError(401, 'UNAUTHORIZED', '관리자 로그인이 필요합니다.');
}

export async function requireAdmin(
  req: NextRequest
): Promise<NextResponse | null> {
  if (!(await sessionIsAdmin(req))) {
    return unauthorized();
  }
  return null;
}
