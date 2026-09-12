import {
  DEFAULT_EVENT_TIMES,
  EVENT_IDS,
  eventTimeMs,
  type EventId,
  type EventTimes,
} from '@/lib/deadline';
import type { Sql } from '@/lib/db';
import { getSql } from '@/lib/db';

const EVENT_ORDER: EventId[] = [
  'round1Close',
  'round1Announce',
  'round2Open',
  'round2Close',
  'round2Announce',
];

function coerceIso(value: unknown, fallback: string): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  const text = String(value ?? '').trim();
  if (!text) return fallback;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString();
}

function rowToTimes(row: Record<string, unknown>): EventTimes {
  return {
    round1Close: coerceIso(row.round1_close, DEFAULT_EVENT_TIMES.round1Close),
    round1Announce: coerceIso(
      row.round1_announce,
      DEFAULT_EVENT_TIMES.round1Announce
    ),
    round2Open: coerceIso(row.round2_open, DEFAULT_EVENT_TIMES.round2Open),
    round2Close: coerceIso(row.round2_close, DEFAULT_EVENT_TIMES.round2Close),
    round2Announce: coerceIso(
      row.round2_announce,
      DEFAULT_EVENT_TIMES.round2Announce
    ),
  };
}

export function validateEventTimes(
  input: unknown
): { ok: true; times: EventTimes } | { ok: false; message: string } {
  if (!input || typeof input !== 'object') {
    return { ok: false, message: '일정 값이 올바르지 않습니다.' };
  }
  const body = input as Record<string, unknown>;
  const times = {} as EventTimes;
  for (const id of EVENT_IDS) {
    const raw = body[id];
    if (typeof raw !== 'string' || !raw.trim()) {
      return { ok: false, message: '모든 일정을 입력해 주세요.' };
    }
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return { ok: false, message: '날짜 형식이 올바르지 않습니다.' };
    }
    times[id] = date.toISOString();
  }

  for (let i = 1; i < EVENT_ORDER.length; i += 1) {
    const prev = EVENT_ORDER[i - 1];
    const next = EVENT_ORDER[i];
    const prevMs = eventTimeMs(prev, times);
    const nextMs = eventTimeMs(next, times);
    if (prev === 'round1Announce' && next === 'round2Open') {
      if (nextMs < prevMs) {
        return {
          ok: false,
          message: '2차 접수 시작은 1차 매칭 발표보다 빠를 수 없어요.',
        };
      }
      continue;
    }
    if (nextMs <= prevMs) {
      return { ok: false, message: '일정은 시간 순서대로 이어져야 해요.' };
    }
  }

  return { ok: true, times };
}

export async function loadEventTimes(sql?: Sql): Promise<EventTimes> {
  try {
    const client = sql ?? getSql();
    const rows = await client`
      SELECT
        round1_close,
        round1_announce,
        round2_open,
        round2_close,
        round2_announce
      FROM event_schedule
      WHERE id = 1
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return { ...DEFAULT_EVENT_TIMES };
    return rowToTimes(row);
  } catch (err) {
    console.error('loadEventTimes', err);
    return { ...DEFAULT_EVENT_TIMES };
  }
}

export async function saveEventTimes(
  sql: Sql,
  times: EventTimes
): Promise<EventTimes> {
  await sql`
    INSERT INTO event_schedule (
      id,
      round1_close,
      round1_announce,
      round2_open,
      round2_close,
      round2_announce,
      updated_at
    )
    VALUES (
      1,
      ${times.round1Close},
      ${times.round1Announce},
      ${times.round2Open},
      ${times.round2Close},
      ${times.round2Announce},
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      round1_close = EXCLUDED.round1_close,
      round1_announce = EXCLUDED.round1_announce,
      round2_open = EXCLUDED.round2_open,
      round2_close = EXCLUDED.round2_close,
      round2_announce = EXCLUDED.round2_announce,
      updated_at = now()
  `;
  return loadEventTimes(sql);
}
