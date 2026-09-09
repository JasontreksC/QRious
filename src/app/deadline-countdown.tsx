'use client';

import { useEffect, useState } from 'react';
import {
  formatDeadlineRemaining,
  isSurveyOpen,
  msUntilDeadline,
} from '@/lib/deadline';

export function DeadlineCountdown() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!isSurveyOpen(now)) {
    return null;
  }

  const clock = formatDeadlineRemaining(msUntilDeadline(now));

  return (
    <div className="text-center mb-8 -mt-1">
      <p className="text-sm font-semibold text-[#8C7A8E]">접수 마감까지</p>
      <p
        className="mt-1 text-[26px] leading-snug font-extrabold tabular-nums tracking-tight text-[#E8526A]"
        suppressHydrationWarning
      >
        {clock}
      </p>
      <p className="mt-2 text-sm font-semibold text-[#8C7A8E]">남음</p>
    </div>
  );
}

export function SurveyClosedPage() {
  return (
    <div className="text-center py-12 bg-white border border-[#F0D9DF] rounded-2xl p-6 shadow-sm">
      <div className="text-[60px]" aria-hidden>
        💌
      </div>
      <h2 className="text-[22px] font-bold text-[#E8526A] mt-4">접수 마감</h2>
      <p className="text-[17px] font-semibold text-[#2B1B2E] mt-3 leading-relaxed">
        접수가 마감되었고, 매칭이 시작되었습니다.
        <br />
        기대하세요!
      </p>
    </div>
  );
}

export function useSurveyOpen(): boolean {
  const [open, setOpen] = useState(() => isSurveyOpen());

  useEffect(() => {
    const tick = () => setOpen(isSurveyOpen());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return open;
}
