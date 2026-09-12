/**
 * 축제 접수·매칭 타임라인.
 *
 * 기본값은 `DEFAULT_EVENT_TIMES`입니다. 운영 중 일정은 DB(`event_schedule`)와
 * 관리자 페이지에서 바꾸고, 헬퍼에는 불러온 `EventTimes`를 넘기세요.
 */

const KST = '+09:00';

function kst(isoLocal: string): string {
  return `${isoLocal}${KST}`;
}

export const EVENT_IDS = [
  'round1Close',
  'round1Announce',
  'round2Open',
  'round2Close',
  'round2Announce',
] as const;

export type EventId = (typeof EVENT_IDS)[number];

export type EventTimes = Record<EventId, string>;

/** 코드에 적힌 기본 일정. DB에 값이 없으면 이 시각을 씁니다. */
export const DEFAULT_EVENT_TIMES: EventTimes = {
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
};

/** @deprecated DB에서 불러온 일정을 쓰세요. 기본값과 동일합니다. */
export const EVENT_TIMES = DEFAULT_EVENT_TIMES;

export type RegistrationRound = 1 | 2;

/** 화면에 그리는 순서. 시각은 `EventTimes`에서 가져옵니다. */
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

export function registrationWindows(times: EventTimes = DEFAULT_EVENT_TIMES): {
  round: RegistrationRound;
  opensAt: string | null;
  closesAt: string;
}[] {
  return [
    { round: 1, opensAt: null, closesAt: times.round1Close },
    {
      round: 2,
      opensAt: times.round2Open,
      closesAt: times.round2Close,
    },
  ];
}

export const REGISTRATION_WINDOWS = registrationWindows(DEFAULT_EVENT_TIMES);

export function eventTimeMs(
  id: EventId,
  times: EventTimes = DEFAULT_EVENT_TIMES
): number {
  return new Date(times[id]).getTime();
}

export function currentRegistrationRound(
  now = Date.now(),
  times: EventTimes = DEFAULT_EVENT_TIMES
): RegistrationRound | null {
  for (const window of registrationWindows(times)) {
    const opens = window.opensAt ? new Date(window.opensAt).getTime() : 0;
    const closes = new Date(window.closesAt).getTime();
    if (now >= opens && now < closes) return window.round;
  }
  return null;
}

export function isSurveyOpen(
  now = Date.now(),
  times: EventTimes = DEFAULT_EVENT_TIMES
): boolean {
  return currentRegistrationRound(now, times) != null;
}

/** 접수 마감 후, 해당 차수 매칭 발표 전. 로그인·접수 내역·결과 확인을 열지 않습니다. */
export function isAwaitingAnnouncement(
  now = Date.now(),
  times: EventTimes = DEFAULT_EVENT_TIMES
): boolean {
  const afterRound1Close = now >= eventTimeMs('round1Close', times);
  const beforeRound1Announce = now < eventTimeMs('round1Announce', times);
  const afterRound2Close = now >= eventTimeMs('round2Close', times);
  const beforeRound2Announce = now < eventTimeMs('round2Announce', times);
  return (
    (afterRound1Close && beforeRound1Announce) ||
    (afterRound2Close && beforeRound2Announce)
  );
}

/** 접수 중이거나, 발표가 난 뒤에만 구글 로그인을 보여 줍니다. */
export function shouldShowGoogleLogin(
  now = Date.now(),
  times: EventTimes = DEFAULT_EVENT_TIMES
): boolean {
  if (isAwaitingAnnouncement(now, times)) return false;
  return isSurveyOpen(now, times) || now >= eventTimeMs('round1Announce', times);
}

export function isRound2Open(
  now = Date.now(),
  times: EventTimes = DEFAULT_EVENT_TIMES
): boolean {
  return currentRegistrationRound(now, times) === 2;
}

/** 1차 발표와 2차 접수가 겹치는 구간. 결과 확인·2차 접수를 함께 안내합니다. */
export function isRound1ResultAndRound2Open(
  now = Date.now(),
  times: EventTimes = DEFAULT_EVENT_TIMES
): boolean {
  return (
    now >= eventTimeMs('round1Announce', times) &&
    currentRegistrationRound(now, times) === 2
  );
}

/** 히어로 팻말. 일정 구간에 맞는 문구를 1~2개 반환합니다. */
export function getHeroTitlePlaques(
  now = Date.now(),
  times: EventTimes = DEFAULT_EVENT_TIMES
): string[] {
  if (now < eventTimeMs('round1Close', times)) return ['QR 소개팅 1차 접수'];
  if (now < eventTimeMs('round1Announce', times)) return ['QR 소개팅 1차 접수 마감'];
  if (now < eventTimeMs('round2Open', times)) return ['QR 소개팅 1차 발표'];
  if (now < eventTimeMs('round2Close', times)) {
    return now >= eventTimeMs('round1Announce', times)
      ? ['QR 소개팅 1차 발표', 'QR 소개팅 2차 접수']
      : ['QR 소개팅 2차 접수'];
  }
  if (now < eventTimeMs('round2Announce', times)) return ['QR 소개팅 2차 접수 마감'];
  return ['QR 소개팅 2차 발표'];
}

export function statsRound(
  now = Date.now(),
  times: EventTimes = DEFAULT_EVENT_TIMES
): RegistrationRound {
  return now >= eventTimeMs('round2Open', times) ? 2 : 1;
}

export function msUntilDeadline(
  now = Date.now(),
  times: EventTimes = DEFAULT_EVENT_TIMES
): number {
  const round = currentRegistrationRound(now, times);
  if (round === 1) return eventTimeMs('round1Close', times) - now;
  if (round === 2) return eventTimeMs('round2Close', times) - now;
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

/** datetime-local 값 (`YYYY-MM-DDTHH:mm`) — 한국 시간. */
export function toKstInputValue(at: Date | string | number): string {
  const date = at instanceof Date ? at : new Date(at);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** datetime-local (KST) → ISO 문자열. */
export function kstInputToIso(value: string): string | null {
  const matched = value.trim().match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::\d{2})?$/);
  if (!matched) return null;
  const iso = `${matched[1]}:00${KST}`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return iso;
}

export type ScheduleItemState = 'past' | 'next' | 'later';

export type ScheduleItemView = {
  id: EventId;
  title: string;
  at: number;
  whenLabel: string;
  state: ScheduleItemState;
};

export function getScheduleView(
  now = Date.now(),
  times: EventTimes = DEFAULT_EVENT_TIMES
): ScheduleItemView[] {
  const items = EVENT_SCHEDULE.map((item) => {
    const at = eventTimeMs(item.id, times);
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

export function msUntilNextSchedule(
  now = Date.now(),
  times: EventTimes = DEFAULT_EVENT_TIMES
): number {
  const next = getScheduleView(now, times).find((item) => item.state === 'next');
  return next ? Math.max(0, next.at - now) : 0;
}

export function roundLabel(round: RegistrationRound): string {
  return `${round}차`;
}

export type SurveyClosedCopy = {
  title: string;
  body: string;
};

export function getSurveyClosedCopy(
  now = Date.now(),
  times: EventTimes = DEFAULT_EVENT_TIMES
): SurveyClosedCopy {
  if (now < eventTimeMs('round1Announce', times)) {
    return {
      title: '1차 접수 마감',
      body: `1차 접수가 마감되었고, 매칭이 진행 중이에요.\n1차 매칭 발표는 ${formatKstMonthDayTime(times.round1Announce)}입니다.\n2차 접수도 같은 시각에 시작됩니다.`,
    };
  }
  if (now < eventTimeMs('round2Close', times)) {
    return {
      title: '접수 마감',
      body: '접수가 마감되었고, 매칭이 시작되었습니다.\n기대하세요!',
    };
  }
  if (now < eventTimeMs('round2Announce', times)) {
    return {
      title: '2차 접수 마감',
      body: `2차 접수가 마감되었고, 매칭이 진행 중이에요.\n2차 매칭 발표는 ${formatKstMonthDayTime(times.round2Announce)}입니다.`,
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
  times = DEFAULT_EVENT_TIMES,
}: {
  rounds: number[];
  applyRound2: boolean;
  now?: number;
  times?: EventTimes;
}): ParticipantHomeView {
  const round = currentRegistrationRound(now, times);
  const has1 = rounds.includes(1);
  const has2 = rounds.includes(2);
  const announced1 = now >= eventTimeMs('round1Announce', times);
  const announced2 = now >= eventTimeMs('round2Announce', times);

  if (isAwaitingAnnouncement(now, times)) return 'closed';

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
    if (now >= eventTimeMs('round2Close', times)) return 'never';
    return 'unmatched';
  }
  return 'submitted';
}

export type Round2CtaState = 'upcoming' | 'open' | 'submitted' | 'closed';

export function getRound2CtaState(
  hasRound2: boolean,
  now = Date.now(),
  times: EventTimes = DEFAULT_EVENT_TIMES
): Round2CtaState {
  if (hasRound2) return 'submitted';
  if (now >= eventTimeMs('round2Close', times)) return 'closed';
  if (now >= eventTimeMs('round2Open', times)) return 'open';
  return 'upcoming';
}
