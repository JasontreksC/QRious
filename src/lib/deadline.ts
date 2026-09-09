/** 접수 마감: 2026-10-15 00:00 KST (10월 14일 밤 자정). */
export const SURVEY_DEADLINE = new Date('2026-10-15T00:00:00+09:00');

export function msUntilDeadline(now = Date.now()): number {
  return SURVEY_DEADLINE.getTime() - now;
}

export function isSurveyOpen(now = Date.now()): boolean {
  return msUntilDeadline(now) > 0;
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
