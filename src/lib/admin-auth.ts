import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/google-auth';
import { jsonError } from '@/lib/http';

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function emailIsAdmin(email: string): Promise<boolean> {
  const normalized = normalizeAdminEmail(email);
  if (!normalized) return false;
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT 1
      FROM admin
      WHERE email = ${normalized}
      LIMIT 1
    `;
    return rows.length > 0;
  } catch (err) {
    console.error('emailIsAdmin', err);
    return false;
  }
}

export async function sessionIsAdmin(req: NextRequest): Promise<boolean> {
  const session = getSessionFromRequest(req);
  if (!session) return false;
  return emailIsAdmin(session.email);
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
