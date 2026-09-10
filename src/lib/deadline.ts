/**
 * 축제 접수·매칭 타임라인.
 *
 * 모든 시각은 KST (UTC+9)입니다. 일정을 바꿀 때는 아래 `EVENT_TIMES`만 수정하세요.
 * `EVENT_SCHEDULE` 문구와 접수 창(`REGISTRATION_WINDOWS`)은 이 값을 참조합니다.
 */

const KST = '+09:00';

function kst(isoLocal: string): string {
  return `${isoLocal}${KST}`;
}

/** 일정 변경 포인트. `YYYY-MM-DDTHH:mm:ss` (초 단위, 타임존은 KST로 붙습니다). */
export const EVENT_TIMES = {
  /** 1차 접수 마감 */
  round1Close: kst('2026-10-15T00:00:00'),
  /** 1차 매칭 발표 — 2차 접수 시작과 같은 시각 (마감 12시간 뒤) */
  round1Announce: kst('2026-10-15T12:00:00'),
  /** 2차 접수 시작 */
  round2Open: kst('2026-10-15T12:00:00'),
  /** 2차 접수 마감 (2차 시작 12시간 뒤) */
  round2Close: kst('2026-10-16T00:00:00'),
  /** 2차 매칭 발표 (2차 마감 12시간 뒤) */
  round2Announce: kst('2026-10-16T12:00:00'),
} as const;

export type EventId = keyof typeof EVENT_TIMES;

export type RegistrationRound = 1 | 2;

/** 화면에 그리는 순서. 시각은 모두 `EVENT_TIMES`에서 가져옵니다. */
export const EVENT_SCHEDULE: {
  id: EventId;
  title: string;
}[] = [
  { id: 'round1Close', title: '1차 접수 마감' },
  { id: 'round1Announce', title: '1차 매칭 발표' },
  { id: 'round2Open', title: '2차 접수 시작' },
  { id: 'round2Close', title: '2차 접수 마감' },
  { id: 'round2Announce', title: '2차 매칭 발표' },
];

export const REGISTRATION_WINDOWS: {
  round: RegistrationRound;
  opensAt: string | null;
  closesAt: string;
}[] = [
  { round: 1, opensAt: null, closesAt: EVENT_TIMES.round1Close },
  {
    round: 2,
    opensAt: EVENT_TIMES.round2Open,
    closesAt: EVENT_TIMES.round2Close,
  },
];

export const SURVEY_DEADLINE = new Date(EVENT_TIMES.round1Close);

export function eventTimeMs(id: EventId): number {
  return new Date(EVENT_TIMES[id]).getTime();
}

export function currentRegistrationRound(
  now = Date.now()
): RegistrationRound | null {
  for (const window of REGISTRATION_WINDOWS) {
    const opens = window.opensAt ? new Date(window.opensAt).getTime() : 0;
    const closes = new Date(window.closesAt).getTime();
    if (now >= opens && now < closes) return window.round;
  }
  return null;
}

export function isSurveyOpen(now = Date.now()): boolean {
  return currentRegistrationRound(now) != null;
}

/** 접수 마감 후, 해당 차수 매칭 발표 전. 로그인·접수 내역·결과 확인을 열지 않습니다. */
export function isAwaitingAnnouncement(now = Date.now()): boolean {
  const afterRound1Close = now >= eventTimeMs('round1Close');
  const beforeRound1Announce = now < eventTimeMs('round1Announce');
  const afterRound2Close = now >= eventTimeMs('round2Close');
  const beforeRound2Announce = now < eventTimeMs('round2Announce');
  return (
    (afterRound1Close && beforeRound1Announce) ||
    (afterRound2Close && beforeRound2Announce)
  );
}

/** 접수 중이거나, 발표가 난 뒤에만 구글 로그인을 보여 줍니다. */
export function shouldShowGoogleLogin(now = Date.now()): boolean {
  if (isAwaitingAnnouncement(now)) return false;
  return isSurveyOpen(now) || now >= eventTimeMs('round1Announce');
}

export function isRound2Open(now = Date.now()): boolean {
  return currentRegistrationRound(now) === 2;
}

/** 1차 발표와 2차 접수가 겹치는 구간. 결과 확인·2차 접수를 함께 안내합니다. */
export function isRound1ResultAndRound2Open(now = Date.now()): boolean {
  return now >= eventTimeMs('round1Announce') && currentRegistrationRound(now) === 2;
}

/** 히어로 팻말. 일정 구간에 맞는 문구를 1~2개 반환합니다. */
export function getHeroTitlePlaques(now = Date.now()): string[] {
  if (now < eventTimeMs('round1Close')) return ['QR 소개팅 1차 접수'];
  if (now < eventTimeMs('round1Announce')) return ['QR 소개팅 1차 접수 마감'];
  if (now < eventTimeMs('round2Open')) return ['QR 소개팅 1차 발표'];
  if (now < eventTimeMs('round2Close')) {
    return now >= eventTimeMs('round1Announce')
      ? ['QR 소개팅 1차 발표', 'QR 소개팅 2차 접수']
      : ['QR 소개팅 2차 접수'];
  }
  if (now < eventTimeMs('round2Announce')) return ['QR 소개팅 2차 접수 마감'];
  return ['QR 소개팅 2차 발표'];
}

export function statsRound(now = Date.now()): RegistrationRound {
  return now >= eventTimeMs('round2Open') ? 2 : 1;
}

export function msUntilDeadline(now = Date.now()): number {
  const round = currentRegistrationRound(now);
  if (round === 1) return eventTimeMs('round1Close') - now;
  if (round === 2) return eventTimeMs('round2Close') - now;
  return 0;
}

/** `D일 H시간 M분 S초` */
export function formatDeadlineRemaining(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSec = Math.floor(clamped / 1000);
  const seconds = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const minutes = totalMin % 60;
  const totalHour = Math.floor(totalMin / 60);
  const hours = totalHour % 24;
  const days = Math.floor(totalHour / 24);
  return `${days}일 ${hours}시간 ${minutes}분 ${seconds}초`;
}

export function formatKstMonthDayTime(at: Date | string | number): string {
  const date = at instanceof Date ? at : new Date(at);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Seoul',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  return `${Number(parts.month)}월 ${Number(parts.day)}일 ${parts.hour}:${parts.minute}`;
}

export type ScheduleItemState = 'past' | 'next' | 'later';

export type ScheduleItemView = {
  id: EventId;
  title: string;
  at: number;
  whenLabel: string;
  state: ScheduleItemState;
};

export function getScheduleView(now = Date.now()): ScheduleItemView[] {
  const items = EVENT_SCHEDULE.map((item) => {
    const at = eventTimeMs(item.id);
    return {
      id: item.id,
      title: item.title,
      at,
      whenLabel: formatKstMonthDayTime(at),
    };
  });
  const upcoming = items.filter((item) => item.at > now);
  const nextAt = upcoming.length ? Math.min(...upcoming.map((item) => item.at)) : null;
  return items.map((item) => ({
    ...item,
    state:
      item.at <= now ? 'past' : nextAt != null && item.at === nextAt ? 'next' : 'later',
  }));
}

export function msUntilNextSchedule(now = Date.now()): number {
  const next = getScheduleView(now).find((item) => item.state === 'next');
  return next ? Math.max(0, next.at - now) : 0;
}

export function roundLabel(round: RegistrationRound): string {
  return `${round}차`;
}

export type SurveyClosedCopy = {
  title: string;
  body: string;
};

export function getSurveyClosedCopy(now = Date.now()): SurveyClosedCopy {
  if (now < eventTimeMs('round1Announce')) {
    return {
      title: '1차 접수 마감',
      body: `1차 접수가 마감되었고, 매칭이 진행 중이에요.\n1차 매칭 발표는 ${formatKstMonthDayTime(EVENT_TIMES.round1Announce)}입니다.\n2차 접수도 같은 시각에 시작됩니다.`,
    };
  }
  if (now < eventTimeMs('round2Close')) {
    return {
      title: '접수 마감',
      body: '접수가 마감되었고, 매칭이 시작되었습니다.\n기대하세요!',
    };
  }
  if (now < eventTimeMs('round2Announce')) {
    return {
      title: '2차 접수 마감',
      body: `2차 접수가 마감되었고, 매칭이 진행 중이에요.\n2차 매칭 발표는 ${formatKstMonthDayTime(EVENT_TIMES.round2Announce)}입니다.`,
    };
  }
  return {
    title: '접수 마감',
    body: '접수가 모두 마감되었습니다.\n매칭 결과는 로그인 후 확인할 수 있어요.',
  };
}

export function getRound1ResultAndRound2OpenCopy(): SurveyClosedCopy {
  return {
    title: '1차 매칭 발표 · 2차 접수',
    body: '1차 매칭 결과는 로그인하면 확인할 수 있어요.\n2차 접수도 지금 진행할 수 있어요.',
  };
}

export type ParticipantHomeView =
  | 'form'
  | 'submitted'
  | 'unmatched'
  | 'unmatched-with-round2'
  | 'never'
  | 'closed';

export function getParticipantHomeView({
  rounds,
  applyRound2,
  now = Date.now(),
}: {
  rounds: number[];
  applyRound2: boolean;
  now?: number;
}): ParticipantHomeView {
  const round = currentRegistrationRound(now);
  const has1 = rounds.includes(1);
  const has2 = rounds.includes(2);
  const announced1 = now >= eventTimeMs('round1Announce');
  const announced2 = now >= eventTimeMs('round2Announce');

  if (isAwaitingAnnouncement(now)) return 'closed';

  if (round === 2 && applyRound2 && !has2) return 'form';

  if (!has1 && !has2) {
    if (round != null) return 'form';
    return announced1 ? 'never' : 'closed';
  }

  if (has2) {
    if (announced2) return 'unmatched';
    return 'submitted';
  }

  if (announced1) {
    if (round === 2) return 'unmatched-with-round2';
    if (now >= eventTimeMs('round2Close')) return 'never';
    return 'unmatched';
  }
  return 'submitted';
}

export type Round2CtaState = 'upcoming' | 'open' | 'submitted' | 'closed';

export function getRound2CtaState(
  hasRound2: boolean,
  now = Date.now()
): Round2CtaState {
  if (hasRound2) return 'submitted';
  if (now >= eventTimeMs('round2Close')) return 'closed';
  if (now >= eventTimeMs('round2Open')) return 'open';
  return 'upcoming';
}
