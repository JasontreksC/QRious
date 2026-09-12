import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import {
  loadEventTimes,
  saveEventTimes,
  validateEventTimes,
} from '@/lib/event-schedule';
import { DEFAULT_EVENT_TIMES } from '@/lib/deadline';
import { getSql } from '@/lib/db';
import { jsonError } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const sql = getSql();
    const times = await loadEventTimes(sql);
    return NextResponse.json({
      times,
      defaults: DEFAULT_EVENT_TIMES,
    });
  } catch (err) {
    console.error('GET /api/admin/schedule', err);
    return jsonError(500, 'INTERNAL_ERROR', '일정을 불러오지 못했습니다.');
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'VALIDATION_ERROR', 'JSON 본문이 올바르지 않습니다.');
  }

  const parsed = validateEventTimes(
    body && typeof body === 'object' && 'times' in body
      ? (body as { times: unknown }).times
      : body
  );
  if (!parsed.ok) {
    return jsonError(400, 'VALIDATION_ERROR', parsed.message);
  }

  try {
    const sql = getSql();
    const times = await saveEventTimes(sql, parsed.times);
    return NextResponse.json({ times, defaults: DEFAULT_EVENT_TIMES });
  } catch (err) {
    console.error('PUT /api/admin/schedule', err);
    return jsonError(500, 'INTERNAL_ERROR', '일정을 저장하지 못했습니다.');
  }
}
