'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { getAdminSchedule, ApiError, type EventTimes } from '@/lib/api';
import {
  DEFAULT_EVENT_TIMES,
  EVENT_SCHEDULE,
  getHeroTitlePlaques,
  getScheduleView,
  kstInputToIso,
  toKstInputValue,
  type EventId,
} from '@/lib/deadline';

type FormState = Record<EventId, string>;

const HOUR_OPTIONS = Array.from(
  { length: 24 },
  (_, hour) => `${String(hour).padStart(2, '0')}:00`
);

function splitFormValue(value: string): { date: string; hour: string } {
  const [date = '', time = '00:00'] = value.split('T');
  const hour = time.slice(0, 2);
  const normalized = /^\d{2}$/.test(hour) ? `${hour}:00` : '00:00';
  return {
    date,
    hour: HOUR_OPTIONS.includes(normalized) ? normalized : '00:00',
  };
}

function joinFormValue(date: string, hour: string): string {
  return `${date}T${hour}`;
}

function timesToForm(times: EventTimes): FormState {
  return {
    round1Close: toHourlyKstInput(times.round1Close),
    round1Announce: toHourlyKstInput(times.round1Announce),
    round2Open: toHourlyKstInput(times.round2Open),
    round2Close: toHourlyKstInput(times.round2Close),
    round2Announce: toHourlyKstInput(times.round2Announce),
  };
}

function toHourlyKstInput(at: string): string {
  const value = toKstInputValue(at);
  const { date, hour } = splitFormValue(value);
  return joinFormValue(date, hour);
}

function formToTimes(form: FormState): EventTimes | null {
  const times = {} as EventTimes;
  for (const item of EVENT_SCHEDULE) {
    const iso = kstInputToIso(form[item.id]);
    if (!iso) return null;
    times[item.id] = iso;
  }
  return times;
}

export default function AdminSchedulePage() {
  const [form, setForm] = useState<FormState>(() =>
    timesToForm(DEFAULT_EVENT_TIMES)
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [linkRound2Open, setLinkRound2Open] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getAdminSchedule();
        if (cancelled) return;
        setForm(timesToForm(data.times));
        setLinkRound2Open(
          toHourlyKstInput(data.times.round1Announce) ===
            toHourlyKstInput(data.times.round2Open)
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : '일정을 불러오지 못했습니다.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const previewTimes = useMemo(() => formToTimes(form), [form]);
  const plaques = previewTimes
    ? getHeroTitlePlaques(Date.now(), previewTimes)
    : [];
  const scheduleView = previewTimes
    ? getScheduleView(Date.now(), previewTimes)
    : [];

  const handleChange = (id: EventId, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [id]: value };
      if (id === 'round1Announce' && linkRound2Open) {
        next.round2Open = value;
      }
      return next;
    });
  };

  const handleDateChange = (id: EventId, date: string) => {
    handleChange(id, joinFormValue(date, splitFormValue(form[id]).hour));
  };

  const handleHourChange = (id: EventId, hour: string) => {
    handleChange(id, joinFormValue(splitFormValue(form[id]).date, hour));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <>
      <section className="h-full min-h-0 bg-white border border-[#F0D9DF] rounded-2xl shadow-sm p-5 overflow-auto">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold">이벤트 일정</h2>
            <p className="text-xs text-[#8C7A8E] mt-1">
              한국 시간(KST) · 행사 진행 중에는 일정을 바꿀 수 없습니다.
            </p>
          </div>
          <button
            type="button"
            disabled
            title="행사 진행 중에는 일정을 바꿀 수 없습니다."
            className="px-3 py-2 rounded-xl text-xs font-bold border border-[#F0D9DF] text-[#8C7A8E] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            코드 기본값 불러오기
          </button>
        </div>

        {error && <p className="mb-3 text-xs text-[#E8526A]">{error}</p>}

        {loading ? (
          <p className="text-sm text-[#8C7A8E]">불러오는 중…</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            {plaques.length > 0 && (
              <div className="rounded-2xl border border-[#F0D9DF] bg-[#FBF6F0] px-4 py-3">
                <p className="text-[11px] font-bold text-[#8C7A8E]">지금 화면</p>
                <p className="text-sm font-extrabold text-[#E8526A] mt-1">
                  {plaques.join(' · ')}
                </p>
              </div>
            )}

            <label className="flex items-center gap-2 text-xs font-semibold text-[#8C7A8E]">
              <input
                type="checkbox"
                checked={linkRound2Open}
                disabled
                onChange={(e) => {
                  const checked = e.target.checked;
                  setLinkRound2Open(checked);
                  if (checked) {
                    setForm((prev) => ({
                      ...prev,
                      round2Open: prev.round1Announce,
                    }));
                  }
                }}
                className="accent-[#E8526A]"
              />
              2차 접수 시작을 1차 매칭 발표와 같게
            </label>

            <div className="grid gap-3">
              {EVENT_SCHEDULE.map((item) => {
                const { date, hour } = splitFormValue(form[item.id]);
                const disabled = true;
                return (
                  <div
                    key={item.id}
                    className={`flex flex-col sm:flex-row sm:items-center gap-2 rounded-2xl border border-[#F0D9DF] px-4 py-3 ${
                      disabled ? 'bg-[#FBF6F0]' : 'bg-white'
                    }`}
                  >
                    <span className="sm:w-40 text-sm font-bold">{item.title}</span>
                    <div className="flex flex-1 gap-2">
                      <input
                        type="date"
                        required
                        aria-label={`${item.title} 날짜`}
                        value={date}
                        disabled={disabled}
                        onChange={(e) => handleDateChange(item.id, e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2.5 border border-[#F0D9DF] rounded-xl text-[16px] bg-[#FDE8EC] outline-none focus:border-[#E8526A] focus:bg-white disabled:opacity-60"
                      />
                      <select
                        required
                        aria-label={`${item.title} 시각`}
                        value={hour}
                        disabled={disabled}
                        onChange={(e) => handleHourChange(item.id, e.target.value)}
                        className="w-[7.5rem] shrink-0 px-3 py-2.5 border border-[#F0D9DF] rounded-xl text-[16px] bg-[#FDE8EC] outline-none focus:border-[#E8526A] focus:bg-white disabled:opacity-60"
                      >
                        {HOUR_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            {scheduleView.length > 0 && (
              <ul className="text-xs text-[#8C7A8E] space-y-1 px-1">
                {scheduleView.map((item) => (
                  <li key={item.id}>
                    {item.state === 'next' ? '다음 · ' : item.state === 'past' ? '지남 · ' : ''}
                    {item.title} {item.whenLabel}
                  </li>
                ))}
              </ul>
            )}

            <button
              type="submit"
              disabled
              title="행사 진행 중에는 일정을 바꿀 수 없습니다."
              className="w-full sm:w-auto min-h-[48px] px-5 py-3 rounded-xl bg-[#E8526A] text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              일정 저장
            </button>
          </form>
        )}
      </section>
    </>
  );
}
