'use client';

import React, { useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import type { SurveyStats } from '@/lib/api';

const SLIDES = ['성별 접수 통계', '학과별 TOP10'] as const;
const BAR_PINK = ['#E8526A', '#EC6A7C', '#F28C6E', '#F0A3B2', '#F5C3CC'];

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      aria-hidden
    >
      <path
        d={direction === 'left' ? 'M14.5 5.5 8.5 12l6 6.5' : 'M9.5 5.5 15.5 12l-6 6.5'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StatsBoard({
  stats,
  loading,
}: {
  stats: SurveyStats;
  loading: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);

  const genderData = [
    { name: '남자', value: stats.male, color: '#3B82F6' },
    { name: '여자', value: stats.female, color: '#E8526A' },
  ];
  const majorData = stats.majors.slice(0, 10).map((item, index) => ({
    ...item,
    label: item.short_name,
    fill: BAR_PINK[Math.min(index, BAR_PINK.length - 1)],
  }));

  const goToSlide = (index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const next = (index + SLIDES.length) % SLIDES.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    setSlide(next);
  };

  if (loading) {
    return (
      <div className="bg-white border border-[#F0D9DF] rounded-2xl p-5 shadow-sm mb-6 h-[220px] animate-pulse flex flex-col items-center justify-center text-xs text-[#8C7A8E] gap-2">
        <span>참여 현황 불러오는 중…</span>
      </div>
    );
  }

  return (
    <div className="relative bg-white border border-[#F0D9DF] rounded-2xl p-5 shadow-sm mb-6 text-center">
      <button
        type="button"
        aria-label="이전 통계"
        onClick={() => goToSlide(slide - 1)}
        className="absolute left-1 top-[46%] z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#F0D9DF] bg-white/95 text-[#E8526A] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#E8526A]/40"
      >
        <ChevronIcon direction="left" />
      </button>
      <button
        type="button"
        aria-label="다음 통계"
        onClick={() => goToSlide(slide + 1)}
        className="absolute right-1 top-[46%] z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#F0D9DF] bg-white/95 text-[#E8526A] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#E8526A]/40"
      >
        <ChevronIcon direction="right" />
      </button>
      <div
        ref={scrollerRef}
        className="flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-x-contain"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (!el.clientWidth) return;
          setSlide(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        <section
          className="min-w-full snap-center shrink-0"
          aria-label={SLIDES[0]}
        >
          <h2 className="text-xs font-bold text-[#8C7A8E] tracking-wider uppercase mb-1">
            지금까지
          </h2>
          <div className="text-2xl font-extrabold text-[#E8526A] mb-3 leading-snug">
            총 <span className="text-[#2B1B2E]">{stats.major_count}</span>개 학과{' '}
            <span className="text-[#2B1B2E]">{stats.total}</span>명이 접수했어요.
          </div>
          {stats.total > 0 ? (
            <div className="flex flex-col items-center">
              <div className="w-full h-[140px] pointer-events-none px-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={4}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {genderData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 text-xs font-bold text-[#2B1B2E] -mt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                  <span>
                    남자 {stats.male}명 (
                    {Math.round((stats.male / stats.total) * 100)}%)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E8526A]" />
                  <span>
                    여자 {stats.female}명 (
                    {Math.round((stats.female / stats.total) * 100)}%)
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-xs text-[#8C7A8E] bg-[#FDE8EC] rounded-xl border border-[#F0D9DF]/60">
              아직 신청한 학생이 없습니다. 첫 번째 신청자가 되어보세요! 🚀
            </div>
          )}
        </section>

        <section
          className="min-w-full snap-center shrink-0"
          aria-label={SLIDES[1]}
        >
          <h2 className="text-xs font-bold text-[#8C7A8E] tracking-wider uppercase mb-1">
            학과별 TOP10
          </h2>
          <p className="text-[11px] text-[#8C7A8E] mb-3">
            접수가 많은 학과 순이에요.
          </p>
          {majorData.length > 0 ? (
            <div className="w-full h-[210px] pointer-events-none px-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={majorData}
                  margin={{ top: 18, right: 10, left: 2, bottom: 4 }}
                  barCategoryGap="42%"
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="#F0D9DF"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="label"
                    interval={0}
                    angle={-32}
                    textAnchor="end"
                    height={62}
                    tick={{ fill: '#8C7A8E', fontSize: 11 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    width={24}
                    tick={{ fill: '#8C7A8E', fontSize: 10 }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[4, 4, 0, 0]}
                    barSize={12}
                    isAnimationActive={false}
                    activeBar={false}
                  >
                    {majorData.map((entry) => (
                      <Cell key={entry.major_id} fill={entry.fill} />
                    ))}
                    <LabelList
                      dataKey="count"
                      position="top"
                      fill="#2B1B2E"
                      fontSize={10}
                      fontWeight={700}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-6 text-xs text-[#8C7A8E] bg-[#FDE8EC] rounded-xl border border-[#F0D9DF]/60">
              아직 학과별 점수가 없어요. 접수하면 순위가 생겨요.
            </div>
          )}
        </section>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1">
        {SLIDES.map((label, index) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            aria-current={slide === index ? 'true' : undefined}
            onClick={() => goToSlide(index)}
            className="flex h-8 w-8 items-center justify-center"
          >
            <span
              className={`h-1.5 rounded-full transition-all ${
                slide === index ? 'w-5 bg-[#E8526A]' : 'w-1.5 bg-[#F0D9DF]'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
