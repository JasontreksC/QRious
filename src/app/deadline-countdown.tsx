'use client';

import { useEffect, useState } from 'react';
import { useEventTimes } from './event-times-context';
import {
  currentRegistrationRound,
  formatDeadlineRemaining,
  formatKstMonthDayTime,
  getRound1ResultAndRound2OpenCopy,
  getScheduleView,
  getSurveyClosedCopy,
  isSurveyOpen,
  msUntilNextSchedule,
  type ScheduleItemView,
} from '@/lib/deadline';

const PINK = '#E8526A';
const MUTED = '#8C7A8E';

function groupScheduleLines(items: ScheduleItemView[]) {
  const lines: {
    key: string;
    title: string;
    whenLabel: string;
    state: ScheduleItemView['state'];
  }[] = [];
  for (const item of items) {
    const prev = lines[lines.length - 1];
    if (prev && prev.whenLabel === item.whenLabel && prev.state === item.state) {
      prev.title = `${prev.title} & ${item.title}`;
      prev.key = `${prev.key}+${item.id}`;
      continue;
    }
    lines.push({
      key: item.id,
      title: item.title,
      whenLabel: item.whenLabel,
      state: item.state,
    });
  }
  return lines;
}

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}

export function DeadlineCountdown() {
  const now = useNow();
  const times = useEventTimes();
  const items = getScheduleView(now, times);
  const lines = groupScheduleLines(items);
  const clock = formatDeadlineRemaining(msUntilNextSchedule(now, times));

  return (
    <div className="text-center mb-8 -mt-1 space-y-1">
      {lines.map((line) =>
        line.state === 'next' ? (
          <div key={line.key} className="py-1">
            <p
              className="text-[18px] leading-snug font-extrabold"
              style={{ color: PINK }}
            >
              {line.title}까지
            </p>
            <p
              className="mt-1 text-[26px] leading-snug font-extrabold tabular-nums tracking-tight"
              style={{ color: PINK }}
              suppressHydrationWarning
            >
              {clock}
            </p>
          </div>
        ) : (
          <p
            key={line.key}
            className={`text-xs font-semibold ${
              line.state === 'past' ? 'line-through' : ''
            }`}
            style={{ color: MUTED }}
          >
            {line.title} : {line.whenLabel}
          </p>
        )
      )}
    </div>
  );
}

function NoticeCard({
  title,
  body,
  emoji = '💌',
}: {
  title: string;
  body: string;
  emoji?: string | null;
}) {
  return (
    <div className="text-center py-12 bg-white border border-[#F0D9DF] rounded-2xl p-6 shadow-sm">
      {emoji ? (
        <div className="text-[60px]" aria-hidden>
          {emoji}
        </div>
      ) : null}
      <h2 className="text-[22px] font-bold text-[#E8526A] mt-4">{title}</h2>
      <p className="text-[17px] font-semibold text-[#2B1B2E] mt-3 leading-relaxed whitespace-pre-line">
        {body}
      </p>
    </div>
  );
}

export function SurveyClosedPage({
  hasSurvey = true,
}: {
  hasSurvey?: boolean;
}) {
  const now = useNow();
  const times = useEventTimes();
  const copy = hasSurvey
    ? getSurveyClosedCopy(now, times)
    : {
        title: '매칭 결과 없음',
        body: '접수한 적이 없어 매칭 결과가 없어요.',
      };
  return (
    <NoticeCard
      title={copy.title}
      body={copy.body}
      emoji={hasSurvey ? '💌' : null}
    />
  );
}

export function Round1ResultAndRound2OpenNotice() {
  const copy = getRound1ResultAndRound2OpenCopy();
  return <NoticeCard title={copy.title} body={copy.body} />;
}

export function UnmatchedPage({
  unmatchedRound,
  showRound2Cta,
  submittedAt = null,
}: {
  unmatchedRound: 1 | 2;
  showRound2Cta: boolean;
  submittedAt?: string | null;
}) {
  const submittedWhen = submittedAt ? formatKstMonthDayTime(submittedAt) : null;
  return (
    <div className="text-center py-12 bg-white border border-[#F0D9DF] rounded-2xl p-6 shadow-sm">
      <div className="text-[60px]" aria-hidden>
        🥺
      </div>
      <h2 className="text-[22px] font-bold text-[#E8526A] mt-4">
        {unmatchedRound}차에서는 매칭되지 않았어요
      </h2>
      <p className="text-[17px] font-semibold text-[#2B1B2E] mt-3 leading-relaxed">
        {submittedWhen ? `${submittedWhen}에 ` : null}
        {unmatchedRound}차에 접수하셨지만,
        <br />
        이번에는 아쉽게도 짝을 찾지 못했어요.
        <br />
        더 좋은 기회가 찾아올 거예요.
      </p>
      {showRound2Cta ? (
        <a
          href="/?apply=2"
          className="mt-6 inline-flex items-center justify-center min-h-[52px] px-5 py-3 rounded-xl bg-[#E8526A] text-white text-[16px] font-bold"
        >
          2차 접수하기
        </a>
      ) : null}
    </div>
  );
}

export function useSurveyOpen(): boolean {
  const now = useNow();
  const times = useEventTimes();
  return isSurveyOpen(now, times);
}

export function useRegistrationRound() {
  const now = useNow();
  const times = useEventTimes();
  return currentRegistrationRound(now, times);
}
