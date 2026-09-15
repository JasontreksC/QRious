import type { AdminDailyStats, DailyStatPoint } from '@/lib/api';
import type { Sql } from '@/lib/db';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

function parseYmd(ymd: string): Date {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function kstTodayYmd(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formatLabels(ymd: string): { label: string; fullLabel: string } {
  const date = parseYmd(ymd);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const weekday = WEEKDAYS[date.getUTCDay()];
  return {
    label: `${month}/${day}`,
    fullLabel: `${month}월 ${day}일 (${weekday})`,
  };
}

function coerceDay(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toYmd(value);
  }
  const text = String(value ?? '').trim();
  const matched = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return matched?.[1] ?? null;
}

export function buildDailySeries(
  rows: ReadonlyArray<Record<string, unknown>>,
  todayYmd = kstTodayYmd()
): AdminDailyStats {
  const byDay = new Map<string, { round1: number; round2: number }>();

  for (const row of rows) {
    const day = coerceDay(row.day);
    if (!day) continue;
    const round = Number(row.round);
    const count = Number(row.count) || 0;
    if (count <= 0) continue;
    const current = byDay.get(day) ?? { round1: 0, round2: 0 };
    if (round === 1) current.round1 += count;
    else if (round === 2) current.round2 += count;
    byDay.set(day, current);
  }

  if (byDay.size === 0) {
    return {
      days: [],
      totals: { all: 0, round1: 0, round2: 0 },
    };
  }

  const sortedDays = [...byDay.keys()].sort();
  const start = parseYmd(sortedDays[0]);
  const lastData = parseYmd(sortedDays[sortedDays.length - 1]);
  const today = parseYmd(todayYmd);
  const end = lastData > today ? lastData : today;

  const days: DailyStatPoint[] = [];
  let cumulative = 0;
  let cumulativeRound1 = 0;
  let cumulativeRound2 = 0;

  for (
    let cursor = new Date(start);
    cursor.getTime() <= end.getTime();
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    const date = toYmd(cursor);
    const counts = byDay.get(date) ?? { round1: 0, round2: 0 };
    cumulativeRound1 += counts.round1;
    cumulativeRound2 += counts.round2;
    cumulative += counts.round1 + counts.round2;
    const { label, fullLabel } = formatLabels(date);
    days.push({
      date,
      label,
      fullLabel,
      round1: counts.round1,
      round2: counts.round2,
      total: counts.round1 + counts.round2,
      cumulative,
      cumulativeRound1,
      cumulativeRound2,
    });
  }

  const last = days[days.length - 1];
  return {
    days,
    totals: {
      all: last?.cumulative ?? 0,
      round1: last?.cumulativeRound1 ?? 0,
      round2: last?.cumulativeRound2 ?? 0,
    },
  };
}

export async function fetchAdminDailyStats(sql: Sql): Promise<AdminDailyStats> {
  const rows = await sql`
    WITH submitted AS (
      SELECT
        r.round::int AS round,
        to_char(
          (MIN(c.consented_at) AT TIME ZONE 'Asia/Seoul'),
          'YYYY-MM-DD'
        ) AS day
      FROM registration r
      INNER JOIN consent c ON c.registration_id = r.registration_id
      WHERE c.notice_version NOT LIKE '%-tp'
      GROUP BY r.registration_id, r.round
    )
    SELECT day, round, COUNT(*)::int AS count
    FROM submitted
    GROUP BY day, round
    ORDER BY day ASC, round ASC
  `;

  return buildDailySeries(rows);
}
