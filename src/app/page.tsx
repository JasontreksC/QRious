'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import {
  getCharms,
  getStats,
  submitSurvey,
  ApiError,
  type Charm,
} from '@/lib/api';

const MBTI_OPTIONS = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
] as const;

type FormData = {
  studentId: string;
  name: string;
  gender: boolean | null;
  age: string;
  mbti: string;
  haveCharmIds: string[];
  wantCharmIds: string[];
  exHave: string;
  exWant: string;
};

type FieldKey =
  | 'studentId'
  | 'name'
  | 'gender'
  | 'age'
  | 'mbti'
  | 'haveCharmIds'
  | 'wantCharmIds';

const initialFormData: FormData = {
  studentId: '',
  name: '',
  gender: null,
  age: '',
  mbti: '',
  haveCharmIds: [],
  wantCharmIds: [],
  exHave: '',
  exWant: '',
};

export default function Home() {
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({
    studentId: false,
    name: false,
    gender: false,
    age: false,
    mbti: false,
    haveCharmIds: false,
    wantCharmIds: false,
  });

  const [errors, setErrors] = useState<Record<FieldKey, string>>({
    studentId: '',
    name: '',
    gender: '',
    age: '',
    mbti: '',
    haveCharmIds: '',
    wantCharmIds: '',
  });

  const [charms, setCharms] = useState<Charm[]>([]);
  const [charmsLoading, setCharmsLoading] = useState(true);
  const [charmsError, setCharmsError] = useState('');

  const [stats, setStats] = useState({
    total: 0,
    male: 0,
    female: 0,
  });

  const [isMounted, setIsMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
  };

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const fetchStats = async () => {
    try {
      const data = await getStats();
      setStats({
        total: data.total ?? 0,
        male: data.male ?? 0,
        female: data.female ?? 0,
      });
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  const fetchCharms = async () => {
    setCharmsLoading(true);
    setCharmsError('');
    try {
      const list = await getCharms();
      setCharms(list);
    } catch (err) {
      console.error('Error fetching charms:', err);
      const message =
        err instanceof ApiError
          ? err.message
          : '매력 태그를 불러오지 못했습니다.';
      setCharmsError(message);
      setCharms([]);
    } finally {
      setCharmsLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchStats();
    fetchCharms();
  }, []);

  const validateField = (name: FieldKey, value: FormData[FieldKey]): string => {
    switch (name) {
      case 'gender':
        if (value === null || value === undefined) return '성별을 선택해 주세요.';
        return '';
      case 'name': {
        const v = typeof value === 'string' ? value.trim() : '';
        if (!v) return '이름을 입력해 주세요.';
        if (v.length < 2) return '이름은 2글자 이상이어야 합니다.';
        if (/[0-9]/.test(v)) return '이름에 숫자는 포함할 수 없습니다.';
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(v))
          return '특수문자는 사용할 수 없습니다.';
        return '';
      }
      case 'studentId': {
        const v = typeof value === 'string' ? value.trim() : '';
        if (!v) return '학번을 입력해 주세요.';
        if (!/^\d{10}$/.test(v)) return '학번은 정확히 10자리 숫자여야 합니다.';
        return '';
      }
      case 'age': {
        const v = typeof value === 'string' ? value.trim() : '';
        if (!v) return '나이를 입력해 주세요.';
        if (!/^\d+$/.test(v)) return '나이는 숫자만 입력해 주세요.';
        const n = Number(v);
        if (n < 17 || n > 40) return '나이는 17~40 사이로 입력해 주세요.';
        return '';
      }
      case 'mbti': {
        const v = typeof value === 'string' ? value.trim() : '';
        if (!v) return 'MBTI를 선택해 주세요.';
        if (!(MBTI_OPTIONS as readonly string[]).includes(v))
          return '올바른 MBTI를 선택해 주세요.';
        return '';
      }
      case 'haveCharmIds':
        if (!Array.isArray(value) || value.length === 0)
          return '나의 매력을 하나 이상 선택해 주세요.';
        return '';
      case 'wantCharmIds':
        if (!Array.isArray(value) || value.length === 0)
          return '이상형 매력을 하나 이상 선택해 주세요.';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'studentId') {
      finalValue = value.replace(/\D/g, '').slice(0, 10);
    }
    if (name === 'age') {
      finalValue = value.replace(/\D/g, '').slice(0, 2);
    }

    setFormData((prev) => ({ ...prev, [name]: finalValue }));

    if (name in errors) {
      const error = validateField(
        name as FieldKey,
        finalValue as FormData[FieldKey]
      );
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const handleGenderSelect = (value: boolean) => {
    setFormData((prev) => ({ ...prev, gender: value }));
    setTouched((prev) => ({ ...prev, gender: true }));
    setErrors((prev) => ({ ...prev, gender: '' }));
  };

  const toggleCharm = (group: 'haveCharmIds' | 'wantCharmIds', charmId: string) => {
    setFormData((prev) => {
      const current = prev[group];
      const next = current.includes(charmId)
        ? current.filter((id) => id !== charmId)
        : [...current, charmId];
      setErrors((errs) => ({
        ...errs,
        [group]: validateField(group, next),
      }));
      return { ...prev, [group]: next };
    });
    setTouched((prev) => ({ ...prev, [group]: true }));
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name } = e.target;
    if (!(name in touched)) return;
    const key = name as FieldKey;
    setTouched((prev) => ({ ...prev, [key]: true }));
    const error = validateField(key, formData[key]);
    setErrors((prev) => ({ ...prev, [key]: error }));
  };

  const handleSubmit = async () => {
    const fields: FieldKey[] = [
      'studentId',
      'name',
      'gender',
      'age',
      'mbti',
      'haveCharmIds',
      'wantCharmIds',
    ];

    setTouched({
      studentId: true,
      name: true,
      gender: true,
      age: true,
      mbti: true,
      haveCharmIds: true,
      wantCharmIds: true,
    });

    const newErrors = {
      studentId: validateField('studentId', formData.studentId),
      name: validateField('name', formData.name),
      gender: validateField('gender', formData.gender),
      age: validateField('age', formData.age),
      mbti: validateField('mbti', formData.mbti),
      haveCharmIds: validateField('haveCharmIds', formData.haveCharmIds),
      wantCharmIds: validateField('wantCharmIds', formData.wantCharmIds),
    };

    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some((err) => err !== '');
    if (hasErrors) {
      triggerToast('⚠️ 입력 내용을 다시 확인해 주세요.');
      const firstInvalidField = fields.find((key) => newErrors[key] !== '');
      if (firstInvalidField) {
        const el = document.getElementById(firstInvalidField);
        el?.focus();
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true);

    try {
      const exHave = formData.exHave.trim();
      const exWant = formData.exWant.trim();

      await submitSurvey({
        student_id: formData.studentId,
        name: formData.name.trim(),
        gender: formData.gender as boolean,
        age: Number(formData.age),
        mbti: formData.mbti,
        have_charm_ids: formData.haveCharmIds,
        want_charm_ids: formData.wantCharmIds,
        ex_have: exHave || null,
        ex_want: exWant || null,
      });

      setSubmitted(true);
      fetchStats();
    } catch (err: unknown) {
      console.error('Submit error:', err);
      if (err instanceof ApiError && err.status === 409) {
        triggerToast(
          '⚠️ 이미 접수된 학번입니다. 사전조사는 한 번만 참여하실 수 있습니다.'
        );
      } else {
        const message =
          err instanceof Error ? err.message : '서버 응답 오류';
        triggerToast(`❌ 오류가 발생했습니다: ${message}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const textInputKeys = ['studentId', 'name', 'age', 'mbti'] as const;

  const getInputClass = (fieldName: (typeof textInputKeys)[number]) => {
    const base =
      'w-full px-4 py-3 border-1.5 border-[#F0D9DF] rounded-xl font-sans text-[16px] text-[#2B1B2E] bg-[#FDE8EC] transition-all duration-200 outline-none placeholder-[#C9B0BE] focus:border-[#E8526A] focus:bg-white focus:ring-3 focus:ring-[#E8526A]/10 appearance-none';
    if (!touched[fieldName]) return base;
    return errors[fieldName]
      ? `${base} border-[#E8526A] bg-[#FEF0F2]`
      : `${base} border-[#4CAF82] bg-[#F2FBF6]`;
  };

  const getHintDetails = (fieldName: (typeof textInputKeys)[number]) => {
    if (!touched[fieldName]) {
      return { text: '', style: 'text-[#8C7A8E] min-h-[0px] mt-0' };
    }
    if (errors[fieldName]) {
      return { text: errors[fieldName], style: 'text-[#E8526A] min-h-[16px] mt-1' };
    }
    return { text: '✓ 확인됐어요', style: 'text-[#4CAF82] font-semibold min-h-[16px] mt-1' };
  };

  const charmChipClass = (selected: boolean) =>
    `px-3 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${
      selected
        ? 'bg-[#E8526A] text-white border-[#E8526A] shadow-sm'
        : 'bg-[#FDE8EC] text-[#2B1B2E] border-[#F0D9DF] hover:bg-[#fcdde3]'
    }`;

  const chartData = [
    { name: '남자', value: stats.male, color: '#3B82F6' },
    { name: '여자', value: stats.female, color: '#E8526A' },
  ];

  return (
    <div className="min-h-screen bg-[#FBF6F0] text-[#2B1B2E] font-sans pb-[calc(80px+env(safe-area-inset-bottom))]">
      <Link
        href="/admin"
        className="fixed top-4 right-4 z-40 px-3 py-2 rounded-xl text-xs font-bold tracking-wide bg-white/90 border border-[#F0D9DF] text-[#8C7A8E] shadow-sm hover:bg-[#FDE8EC] hover:text-[#E8526A]"
      >
        관리자
      </Link>
      <div className="max-w-[480px] mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative mx-auto mb-3 h-[120px] w-[120px] sm:h-[140px] sm:w-[140px]">
            <Image
              src="/qr-heart.png"
              alt="QRious"
              fill
              priority
              className="object-contain drop-shadow-sm animate-[pulse_2.4s_ease-in-out_infinite]"
              sizes="140px"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#E8526A]">
            QRious - QR 소개팅 <br /> 사전 접수
          </h1>
          <p className="text-sm text-[#8C7A8E] mt-1.5 leading-relaxed">
            즐거운 축제를 새 인연과 함께하고 싶으신가요? <br /> 저희가 도와드릴게요!
          </p>
        </div>

        {/* Statistics Board */}
        {!isMounted ? (
          <div className="bg-white border border-[#F0D9DF] rounded-2xl p-5 shadow-sm mb-6 h-[170px] animate-pulse flex flex-col items-center justify-center text-xs text-[#8C7A8E] gap-2">
            <span>참여 현황 불러오는 중…</span>
          </div>
        ) : (
          <div className="bg-white border border-[#F0D9DF] rounded-2xl p-5 shadow-sm mb-6 text-center">
            <h2 className="text-xs font-bold text-[#8C7A8E] tracking-wider uppercase mb-1">
              지금까지
            </h2>
            <div className="text-3xl font-extrabold text-[#E8526A] mb-3">
              총<span className="text-[#2B1B2E]">{stats.total}</span>명이 접수했어요.
            </div>

            {stats.total > 0 ? (
              <div className="flex flex-col items-center">
                <div className="w-full h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value}명`]}
                        contentStyle={{
                          background: '#2B1B2E',
                          border: 'none',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
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
          </div>
        )}

        <div className="text-center mb-8">
          <p className="text-sm text-[#8C7A8E] mt-1.5 leading-relaxed">
            아래 정보를 입력해 주세요.
            <br />
            매칭에만 사용하고, 이벤트가 끝나는 즉시 폐기해요.
          </p>
        </div>

        {submitted ? (
          <div className="text-center py-10 bg-white border border-[#F0D9DF] rounded-2xl p-6 shadow-sm">
            <div className="text-[60px]">🎉</div>
            <h2 className="text-[22px] font-bold text-[#E8526A] mt-4">제출 완료!</h2>
            <p className="text-[15px] text-[#8C7A8E] mt-2 leading-relaxed">
              사전조사가 성공적으로 접수됐어요.
              <br />곧 좋은 인연을 연결해 드릴게요 💕
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[#F0D9DF] rounded-2xl p-6 shadow-sm">
            <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-5">
              {/* Student ID */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="studentId"
                  className="flex flex-wrap items-center gap-y-0.5 text-xs font-semibold text-[#8C7A8E] tracking-wider uppercase"
                >
                  <span>
                    🎓 학번<span className="text-[#E8526A]">*</span>
                  </span>
                  <span className="text-[10px] text-[#8C7A8E] normal-case sm:ml-2 font-normal leading-relaxed">
                    우리 학교 학생인지 확인하기 위해 사용해요. 외부에 공개되지 않아요.
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    id="studentId"
                    name="studentId"
                    placeholder="학번 10자리 숫자"
                    maxLength={10}
                    inputMode="numeric"
                    autoComplete="off"
                    value={formData.studentId}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`${getInputClass('studentId')} pr-12`}
                  />
                  {touched.studentId && (
                    <span
                      className={`absolute right-4 top-1/2 -translate-y-1/2 font-bold text-lg pointer-events-none transition-all duration-200 ${
                        errors.studentId ? 'text-[#E8526A]' : 'text-[#4CAF82]'
                      }`}
                    >
                      {errors.studentId ? '✕' : '✓'}
                    </span>
                  )}
                </div>
                <p
                  className={`text-xs leading-relaxed transition-all duration-150 ${getHintDetails('studentId').style}`}
                >
                  {getHintDetails('studentId').text}
                </p>
              </div>

              {/* Name */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="name"
                  className="flex flex-wrap items-center gap-y-0.5 text-xs font-semibold text-[#8C7A8E] tracking-wider uppercase"
                >
                  <span>
                    🪪 이름<span className="text-[#E8526A]">*</span>
                  </span>
                  <span className="text-[10px] text-[#8C7A8E] normal-case sm:ml-2 font-normal leading-relaxed">
                    우리 학교 학생인지 확인하기 위해 사용해요. 외부에 공개되지 않아요.
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="실명을 입력해 주세요"
                    maxLength={20}
                    autoComplete="name"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`${getInputClass('name')} pr-12`}
                  />
                  {touched.name && (
                    <span
                      className={`absolute right-4 top-1/2 -translate-y-1/2 font-bold text-lg pointer-events-none transition-all duration-200 ${
                        errors.name ? 'text-[#E8526A]' : 'text-[#4CAF82]'
                      }`}
                    >
                      {errors.name ? '✕' : '✓'}
                    </span>
                  )}
                </div>
                <p
                  className={`text-xs leading-relaxed transition-all duration-150 ${getHintDetails('name').style}`}
                >
                  {getHintDetails('name').text}
                </p>
              </div>

              <hr className="border-t-1.5 border-dashed border-[#F0D9DF] my-5" />

              {/* Gender */}
              <div className="flex flex-col gap-1" id="gender">
                <label className="flex flex-wrap items-center gap-y-0.5 text-xs font-semibold text-[#8C7A8E] tracking-wider uppercase">
                  <span>
                    ⚧ 성별<span className="text-[#E8526A]">*</span>
                  </span>
                  <span className="text-[10px] text-[#8C7A8E] normal-case sm:ml-2 font-normal leading-relaxed">
                    매칭 그룹을 나누는 데 활용해요.
                  </span>
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => handleGenderSelect(false)}
                    className={`flex-1 py-3 px-4 rounded-xl border text-[16px] font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                      formData.gender === false
                        ? 'bg-[#E8526A] text-white border-[#E8526A] shadow-sm'
                        : 'bg-[#FDE8EC] text-[#2B1B2E] border-[#F0D9DF] hover:bg-[#fcdde3]'
                    }`}
                  >
                    🙋‍♂️ 남자{' '}
                    {formData.gender === false && (
                      <span className="text-white text-base">✓</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenderSelect(true)}
                    className={`flex-1 py-3 px-4 rounded-xl border text-[16px] font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                      formData.gender === true
                        ? 'bg-[#E8526A] text-white border-[#E8526A] shadow-sm'
                        : 'bg-[#FDE8EC] text-[#2B1B2E] border-[#F0D9DF] hover:bg-[#fcdde3]'
                    }`}
                  >
                    🙋‍♀️ 여자{' '}
                    {formData.gender === true && (
                      <span className="text-white text-base">✓</span>
                    )}
                  </button>
                </div>
                <p
                  className={`text-xs leading-relaxed transition-all duration-150 ${
                    errors.gender
                      ? 'text-[#E8526A] min-h-[16px] mt-1'
                      : formData.gender !== null
                        ? 'text-[#4CAF82] font-semibold min-h-[16px] mt-1'
                        : 'text-[#8C7A8E] min-h-[0px] mt-0'
                  }`}
                >
                  {errors.gender ||
                    (formData.gender !== null ? '✓ 확인됐어요' : '')}
                </p>
              </div>

              {/* Age */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="age"
                  className="flex flex-wrap items-center gap-y-0.5 text-xs font-semibold text-[#8C7A8E] tracking-wider uppercase"
                >
                  <span>
                    🎂 나이<span className="text-[#E8526A]">*</span>
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    id="age"
                    name="age"
                    placeholder="예: 22"
                    maxLength={2}
                    inputMode="numeric"
                    autoComplete="off"
                    value={formData.age}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`${getInputClass('age')} pr-12`}
                  />
                  {touched.age && (
                    <span
                      className={`absolute right-4 top-1/2 -translate-y-1/2 font-bold text-lg pointer-events-none transition-all duration-200 ${
                        errors.age ? 'text-[#E8526A]' : 'text-[#4CAF82]'
                      }`}
                    >
                      {errors.age ? '✕' : '✓'}
                    </span>
                  )}
                </div>
                <p
                  className={`text-xs leading-relaxed transition-all duration-150 ${getHintDetails('age').style}`}
                >
                  {getHintDetails('age').text}
                </p>
              </div>

              {/* MBTI */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="mbti"
                  className="flex flex-wrap items-center gap-y-0.5 text-xs font-semibold text-[#8C7A8E] tracking-wider uppercase"
                >
                  <span>
                    🧠 MBTI<span className="text-[#E8526A]">*</span>
                  </span>
                </label>
                <div className="relative">
                  <select
                    id="mbti"
                    name="mbti"
                    value={formData.mbti}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`${getInputClass('mbti')} pr-10`}
                  >
                    <option value="" disabled>
                      MBTI를 선택해 주세요
                    </option>
                    {MBTI_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <p
                  className={`text-xs leading-relaxed transition-all duration-150 ${getHintDetails('mbti').style}`}
                >
                  {getHintDetails('mbti').text}
                </p>
              </div>

              <hr className="border-t-1.5 border-dashed border-[#F0D9DF] my-5" />

              {/* Have charms */}
              <div className="flex flex-col gap-2" id="haveCharmIds">
                <div>
                  <h3 className="text-base font-bold text-[#2B1B2E]">
                    나의 매력은...<span className="text-[#E8526A]">*</span>
                  </h3>
                  <p className="text-[11px] text-[#8C7A8E] mt-1 leading-relaxed">
                    해당하는 태그를 모두 골라 주세요. 여러 개 선택할 수 있어요.
                  </p>
                </div>
                {charmsLoading ? (
                  <div className="py-6 text-center text-xs text-[#8C7A8E] bg-[#FDE8EC] rounded-xl animate-pulse">
                    매력 태그 불러오는 중…
                  </div>
                ) : charmsError ? (
                  <div className="py-4 px-3 text-center text-xs text-[#E8526A] bg-[#FEF0F2] rounded-xl border border-[#F0D9DF]">
                    <p>{charmsError}</p>
                    <button
                      type="button"
                      onClick={fetchCharms}
                      className="mt-2 underline font-semibold"
                    >
                      다시 시도
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {charms.map((charm) => (
                      <button
                        key={`have-${charm.charm_id}`}
                        type="button"
                        onClick={() => toggleCharm('haveCharmIds', charm.charm_id)}
                        className={charmChipClass(
                          formData.haveCharmIds.includes(charm.charm_id)
                        )}
                      >
                        {charm.name}
                        {formData.haveCharmIds.includes(charm.charm_id) && ' ✓'}
                      </button>
                    ))}
                  </div>
                )}
                <p
                  className={`text-xs leading-relaxed transition-all duration-150 ${
                    touched.haveCharmIds && errors.haveCharmIds
                      ? 'text-[#E8526A] min-h-[16px] mt-1'
                      : touched.haveCharmIds && !errors.haveCharmIds
                        ? 'text-[#4CAF82] font-semibold min-h-[16px] mt-1'
                        : 'text-[#8C7A8E] min-h-[0px] mt-0'
                  }`}
                >
                  {touched.haveCharmIds
                    ? errors.haveCharmIds || '✓ 확인됐어요'
                    : ''}
                </p>
              </div>

              {/* ExHave */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="exHave"
                  className="flex flex-wrap items-center gap-y-0.5 text-xs font-semibold text-[#8C7A8E] tracking-wider uppercase"
                >
                  <span>✨ 추가로 어필하고 싶은 나만의 매력</span>
                </label>
                <p className="text-[11px] text-[#8C7A8E] leading-relaxed -mt-0.5 mb-1">
                  이거를 작성하면 원하는 상대를 찾는데 도움을 줄 수 있어요.
                </p>
                <textarea
                  id="exHave"
                  name="exHave"
                  placeholder="예: 요리 잘해요, 대화가 끊기지 않아요"
                  rows={3}
                  maxLength={300}
                  value={formData.exHave}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-1.5 border-[#F0D9DF] rounded-xl font-sans text-[16px] text-[#2B1B2E] bg-[#FDE8EC] transition-all duration-200 outline-none placeholder-[#C9B0BE] focus:border-[#E8526A] focus:bg-white focus:ring-3 focus:ring-[#E8526A]/10 appearance-none resize-none"
                />
                <div className="flex justify-end">
                  <div
                    className={`text-[11px] ${
                      formData.exHave.length >= 280
                        ? 'text-[#E8526A]'
                        : 'text-[#8C7A8E]'
                    }`}
                  >
                    {formData.exHave.length} / 300
                  </div>
                </div>
              </div>

              <hr className="border-t-1.5 border-dashed border-[#F0D9DF] my-5" />

              {/* Want charms */}
              <div className="flex flex-col gap-2" id="wantCharmIds">
                <div>
                  <h3 className="text-base font-bold text-[#2B1B2E]">
                    나의 이상형은...<span className="text-[#E8526A]">*</span>
                  </h3>
                  <p className="text-[11px] text-[#8C7A8E] mt-1 leading-relaxed">
                    원하는 상대의 매력을 모두 골라 주세요. 여러 개 선택할 수 있어요.
                  </p>
                </div>
                {charmsLoading ? (
                  <div className="py-6 text-center text-xs text-[#8C7A8E] bg-[#FDE8EC] rounded-xl animate-pulse">
                    매력 태그 불러오는 중…
                  </div>
                ) : charmsError ? (
                  <div className="py-4 px-3 text-center text-xs text-[#E8526A] bg-[#FEF0F2] rounded-xl border border-[#F0D9DF]">
                    <p>{charmsError}</p>
                    <button
                      type="button"
                      onClick={fetchCharms}
                      className="mt-2 underline font-semibold"
                    >
                      다시 시도
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {charms.map((charm) => (
                      <button
                        key={`want-${charm.charm_id}`}
                        type="button"
                        onClick={() => toggleCharm('wantCharmIds', charm.charm_id)}
                        className={charmChipClass(
                          formData.wantCharmIds.includes(charm.charm_id)
                        )}
                      >
                        {charm.name}
                        {formData.wantCharmIds.includes(charm.charm_id) && ' ✓'}
                      </button>
                    ))}
                  </div>
                )}
                <p
                  className={`text-xs leading-relaxed transition-all duration-150 ${
                    touched.wantCharmIds && errors.wantCharmIds
                      ? 'text-[#E8526A] min-h-[16px] mt-1'
                      : touched.wantCharmIds && !errors.wantCharmIds
                        ? 'text-[#4CAF82] font-semibold min-h-[16px] mt-1'
                        : 'text-[#8C7A8E] min-h-[0px] mt-0'
                  }`}
                >
                  {touched.wantCharmIds
                    ? errors.wantCharmIds || '✓ 확인됐어요'
                    : ''}
                </p>
              </div>

              {/* ExWant */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="exWant"
                  className="flex flex-wrap items-center gap-y-0.5 text-xs font-semibold text-[#8C7A8E] tracking-wider uppercase"
                >
                  <span>💭 추가로 원하는 이상형</span>
                </label>
                <p className="text-[11px] text-[#8C7A8E] leading-relaxed -mt-0.5 mb-1">
                  이거를 작성하면 원하는 상대를 찾는데 도움을 줄 수 있어요.
                </p>
                <textarea
                  id="exWant"
                  name="exWant"
                  placeholder="예: 같이 운동할 사람, 유머 감각 있는 사람"
                  rows={3}
                  maxLength={300}
                  value={formData.exWant}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-1.5 border-[#F0D9DF] rounded-xl font-sans text-[16px] text-[#2B1B2E] bg-[#FDE8EC] transition-all duration-200 outline-none placeholder-[#C9B0BE] focus:border-[#E8526A] focus:bg-white focus:ring-3 focus:ring-[#E8526A]/10 appearance-none resize-none"
                />
                <div className="flex justify-end">
                  <div
                    className={`text-[11px] ${
                      formData.exWant.length >= 280
                        ? 'text-[#E8526A]'
                        : 'text-[#8C7A8E]'
                    }`}
                  >
                    {formData.exWant.length} / 300
                  </div>
                </div>
              </div>
            </form>

            <hr className="border-t-1.5 border-dashed border-[#F0D9DF] my-5" />

            {/* Kakao Info */}
            <div className="space-y-3.5">
              <h3 className="font-bold text-base">
                카카오톡 오픈채팅방에 입장하고 알림을 받으세요!
              </h3>
              <p className="text-sm text-[#8C7A8E] leading-relaxed">
                매칭이 완료되면 오픈채팅방으로 공지를 올려드려요.
                <br />
                직접 만나기 전까지는 상대가 누구인지 알 수 없어요!
              </p>
              <a
                href="#"
                className="w-full inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#FEE500] hover:bg-[#E6CE00] active:bg-[#D5BE00] text-[#191919] text-[16px] font-semibold rounded-xl text-center transition-colors duration-200"
              >
                <svg
                  className="w-5 h-5 fill-current"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 3c-5.523 0-10 3.582-10 8 0 2.536 1.487 4.797 3.75 6.223l-1.042 3.125a.5.5 0 0 0 .62.62l3.414-1.138A10.82 10.82 0 0 0 12 19c5.523 0 10-3.582 10-8s-4.477-8-10-8z" />
                </svg>
                카카오톡 오픈채팅 입장하기
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Floating Submit Bar */}
      {!submitted && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#FBF6F0]/92 backdrop-blur-md border-t border-[#F0D9DF] px-4 py-3 z-50 pb-[calc(12px+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full max-w-[480px] mx-auto block min-h-[52px] py-4 bg-gradient-to-r from-[#E8526A] to-[#F28C6E] hover:from-[#d1445b] hover:to-[#db795b] active:scale-98 disabled:opacity-50 text-white font-bold text-[16px] tracking-wide rounded-2xl shadow-md transition-all duration-150 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-[18px] h-[18px] border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                제출 중…
              </>
            ) : (
              '💌 제출하기'
            )}
          </button>
        </div>
      )}

      {/* Toast Popup */}
      <div
        className={`fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 bg-[#2B1B2E] text-white px-5 py-2.5 rounded-full text-sm font-medium z-[100] transition-all duration-300 pointer-events-none max-w-[calc(100vw-32px)] text-center shadow-lg ${
          showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}
      >
        {toastMessage}
      </div>
    </div>
  );
}
