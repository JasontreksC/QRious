import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { jsonError } from '@/lib/http';
import { phoneDigits } from '@/lib/phone';
import { getSessionFromRequest } from '@/lib/session';

function adminPhonesFromEnv(): string[] {
  return (process.env.ADMIN_PHONES ?? '')
    .split(/[,\s]+/)
    .map((value) => phoneDigits(value))
    .filter(Boolean);
}

export async function phoneIsAdmin(phone: string): Promise<boolean> {
  const normalized = phoneDigits(phone);
  if (!normalized) return false;
  if (adminPhonesFromEnv().includes(normalized)) return true;
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT 1
      FROM admin
      WHERE phone IS NOT NULL
        AND regexp_replace(phone, '[^0-9]', '', 'g') = ${normalized}
      LIMIT 1
    `;
    return rows.length > 0;
  } catch (err) {
    console.error('phoneIsAdmin', err);
    return false;
  }
}

export async function sessionIsAdmin(req: NextRequest): Promise<boolean> {
  const session = getSessionFromRequest(req);
  if (!session) return false;
  return phoneIsAdmin(session.phone);
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
