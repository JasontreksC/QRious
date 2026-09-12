'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getAdminDailyStats,
  ApiError,
  type AdminDailyStats,
  type DailyStatPoint,
} from '@/lib/api';

type RoundFilter = 'all' | 1 | 2;
type ChartMode = 'daily' | 'cumulative';

const EMPTY_STATS: AdminDailyStats = {
  days: [],
  totals: { all: 0, round1: 0, round2: 0 },
};

function DailyTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DailyStatPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-xl border border-[#F0D9DF] bg-white px-3 py-2.5 shadow-sm text-left">
      <p className="text-xs font-bold text-[#2B1B2E] mb-1.5">{row.fullLabel}</p>
      <p className="text-[11px] text-[#8C7A8E]">
        1차 {row.round1}명 · 2차 {row.round2}명
      </p>
      <p className="text-[11px] font-semibold text-[#E8526A] mt-0.5">
        당일 {row.total}명 · 누적 {row.cumulative}명
      </p>
    </div>
  );
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<AdminDailyStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roundFilter, setRoundFilter] = useState<RoundFilter>('all');
  const [mode, setMode] = useState<ChartMode>('daily');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const next = await getAdminDailyStats();
        if (!cancelled) setStats(next);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : '일별 접수 통계를 불러오지 못했습니다.'
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

  const chartData = useMemo(() => {
    return stats.days.map((day) => {
      if (roundFilter === 1) {
        return {
          ...day,
          bar1: mode === 'daily' ? day.round1 : day.cumulativeRound1,
          bar2: 0,
          line: day.cumulativeRound1,
        };
      }
      if (roundFilter === 2) {
        return {
          ...day,
          bar1: 0,
          bar2: mode === 'daily' ? day.round2 : day.cumulativeRound2,
          line: day.cumulativeRound2,
        };
      }
      return {
        ...day,
        bar1: mode === 'daily' ? day.round1 : day.cumulativeRound1,
        bar2: mode === 'daily' ? day.round2 : day.cumulativeRound2,
        line: day.cumulative,
      };
    });
  }, [stats.days, roundFilter, mode]);

  const peak = useMemo(() => {
    if (stats.days.length === 0) return null;
    return stats.days.reduce((best, day) => {
      const value =
        roundFilter === 1
          ? day.round1
          : roundFilter === 2
            ? day.round2
            : day.total;
      const bestValue =
        roundFilter === 1
          ? best.round1
          : roundFilter === 2
            ? best.round2
            : best.total;
      return value > bestValue ? day : best;
    });
  }, [stats.days, roundFilter]);

  const peakCount = peak
    ? roundFilter === 1
      ? peak.round1
      : roundFilter === 2
        ? peak.round2
        : peak.total
    : 0;

  const tickInterval =
    chartData.length > 14 ? Math.ceil(chartData.length / 10) - 1 : 0;

  return (
    <section className="h-full min-h-0 bg-white border border-[#F0D9DF] rounded-2xl shadow-sm p-5 overflow-auto">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold">일별 접수 통계</h2>
          <p className="text-xs text-[#8C7A8E] mt-1">
            접수 동의 시각 기준 · 한국 시간(KST)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 p-1 rounded-xl bg-[#FBF6F0] border border-[#F0D9DF]">
            {(
              [
                ['daily', '일별'],
                ['cumulative', '누적'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  mode === value
                    ? 'bg-[#E8526A] text-white'
                    : 'text-[#8C7A8E] hover:bg-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 p-1 rounded-xl bg-[#FBF6F0] border border-[#F0D9DF]">
            {(
              [
                ['all', '전체'],
                [1, '1차'],
                [2, '2차'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={String(value)}
                type="button"
                aria-pressed={roundFilter === value}
                onClick={() => setRoundFilter(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  roundFilter === value
                    ? 'bg-[#2B1B2E] text-white'
                    : 'text-[#8C7A8E] hover:bg-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="mb-3 text-xs text-[#E8526A]">{error}</p>}

      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { label: '전체', value: stats.totals.all },
          { label: '1차', value: stats.totals.round1 },
          { label: '2차', value: stats.totals.round2 },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-[#F0D9DF] bg-[#FBF6F0] px-3 py-3 text-center"
          >
            <p className="text-[11px] font-bold text-[#8C7A8E]">{card.label}</p>
            <p className="text-xl font-extrabold text-[#2B1B2E] mt-0.5 tabular-nums">
              {loading ? '—' : `${card.value}명`}
            </p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="h-[320px] rounded-2xl border border-[#F0D9DF] bg-[#FBF6F0] animate-pulse flex items-center justify-center text-sm text-[#8C7A8E]">
          통계 불러오는 중…
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-[220px] rounded-2xl border border-[#F0D9DF] bg-[#FDE8EC] flex items-center justify-center text-sm text-[#8C7A8E]">
          동의 시각이 있는 접수가 아직 없어요.
        </div>
      ) : (
        <>
          {peak && peakCount > 0 && (
            <p className="text-xs text-[#8C7A8E] mb-3">
              가장 많이 접수한 날{' '}
              <span className="font-bold text-[#2B1B2E]">{peak.fullLabel}</span>
              {' · '}
              <span className="font-bold text-[#E8526A]">{peakCount}명</span>
            </p>
          )}
          <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#F0D9DF"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="label"
                  interval={tickInterval}
                  tick={{ fill: '#8C7A8E', fontSize: 11 }}
                />
                <YAxis
                  allowDecimals={false}
                  width={32}
                  tick={{ fill: '#8C7A8E', fontSize: 11 }}
                />
                <Tooltip content={<DailyTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                {(roundFilter === 'all' || roundFilter === 1) && (
                  <Bar
                    dataKey="bar1"
                    name="1차"
                    stackId="daily"
                    fill="#50B0D1"
                    radius={roundFilter === 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                    maxBarSize={28}
                    isAnimationActive={false}
                  />
                )}
                {(roundFilter === 'all' || roundFilter === 2) && (
                  <Bar
                    dataKey="bar2"
                    name="2차"
                    stackId="daily"
                    fill="#E8526A"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                    isAnimationActive={false}
                  />
                )}
                {mode === 'daily' && (
                  <Line
                    type="monotone"
                    dataKey="line"
                    name="누적"
                    stroke="#2B1B2E"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-[#8C7A8E] border-b border-[#F0D9DF]">
                  <th className="py-2 pr-3 font-bold">날짜</th>
                  <th className="py-2 px-2 font-bold text-right">1차</th>
                  <th className="py-2 px-2 font-bold text-right">2차</th>
                  <th className="py-2 px-2 font-bold text-right">합계</th>
                  <th className="py-2 pl-2 font-bold text-right">누적</th>
                </tr>
              </thead>
              <tbody>
                {stats.days
                  .filter((day) => day.total > 0)
                  .map((day) => (
                    <tr
                      key={day.date}
                      className="border-b border-[#F0D9DF]/70 text-[#2B1B2E]"
                    >
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        {day.fullLabel}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums">
                        {day.round1}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums">
                        {day.round2}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums font-semibold">
                        {day.total}
                      </td>
                      <td className="py-2.5 pl-2 text-right tabular-nums text-[#8C7A8E]">
                        {day.cumulative}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
