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
import {
  CONSENT_ITEMS,
  CONSENT_OPTIONAL_ITEMS,
  CONSENT_PROCESSOR,
  CONSENT_PURPOSE,
  CONSENT_REFUSAL,
  CONSENT_RETENTION,
  CONSENT_THIRD_PARTY,
  CONSENT_ENTRUSTMENT,
  CONSENT_TITLE,
  CONSENT_VERSION,
} from '@/lib/consent-notice';

const MBTI_OPTIONS = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
] as const;

const MBTI_AXES = [
  { key: 'ei', left: 'E', right: 'I', leftHint: '외향', rightHint: '내향' },
  { key: 'ns', left: 'N', right: 'S', leftHint: '직관', rightHint: '감각' },
  { key: 'tf', left: 'T', right: 'F', leftHint: '사고', rightHint: '감정' },
  { key: 'jp', left: 'J', right: 'P', leftHint: '판단', rightHint: '인식' },
] as const;

type MbtiAxisKey = (typeof MBTI_AXES)[number]['key'];
type MbtiAxes = Record<MbtiAxisKey, string | null>;

const initialMbtiAxes: MbtiAxes = { ei: 'E', ns: 'N', tf: 'T', jp: 'J' };

function composeMbti(axes: MbtiAxes): string {
  if (!axes.ei || !axes.ns || !axes.tf || !axes.jp) return '';
  return `${axes.ei}${axes.ns}${axes.tf}${axes.jp}`;
}

function formatKrPhone(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

function isValidKrPhone(value: string): boolean {
  const d = value.replace(/\D/g, '');
  return /^01[016789]\d{7,8}$/.test(d);
}

type FormData = {
  studentId: string;
  name: string;
  phone: string;
  gender: boolean | null;
  age: string;
  mbti: string;
  haveCharmIds: string[];
  wantCharmIds: string[];
  exHave: string;
  exWant: string;
  consent: boolean;
};

type FieldKey =
  | 'studentId'
  | 'name'
  | 'phone'
  | 'gender'
  | 'age'
  | 'mbti'
  | 'haveCharmIds'
  | 'wantCharmIds'
  | 'consent';

const initialFormData: FormData = {
  studentId: '',
  name: '',
  phone: '',
  gender: null,
  age: '',
  mbti: 'ENTJ',
  haveCharmIds: [],
  wantCharmIds: [],
  exHave: '',
  exWant: '',
  consent: false,
};

export default function Home() {
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const [mbtiAxes, setMbtiAxes] = useState<MbtiAxes>(initialMbtiAxes);

  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({
    studentId: false,
    name: false,
    phone: false,
    gender: false,
    age: false,
    mbti: false,
    haveCharmIds: false,
    wantCharmIds: false,
    consent: false,
  });

  const [errors, setErrors] = useState<Record<FieldKey, string>>({
    studentId: '',
    name: '',
    phone: '',
    gender: '',
    age: '',
    mbti: '',
    haveCharmIds: '',
    wantCharmIds: '',
    consent: '',
  });

  const [charms, setCharms] = useState<Charm[]>([]);
  const [charmsLoading, setCharmsLoading] = useState(true);
  const [charmsError, setCharmsError] = useState('');
  const [consentOpen, setConsentOpen] = useState(false);

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
      case 'phone': {
        const v = typeof value === 'string' ? value.trim() : '';
        if (!v) return '전화번호를 입력해 주세요.';
        if (!isValidKrPhone(v))
          return '휴대폰 번호 형식(010-1234-5678)으로 입력해 주세요.';
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
      case 'consent':
        if (value !== true) return '개인정보 수집·이용에 동의해 주세요.';
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
    if (name === 'phone') {
      finalValue = formatKrPhone(value);
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

  const handleMbtiAxis = (key: MbtiAxisKey, letter: string) => {
    const nextAxes = { ...mbtiAxes, [key]: letter };
    setMbtiAxes(nextAxes);
    const nextMbti = composeMbti(nextAxes);
    setFormData((prev) => ({ ...prev, mbti: nextMbti }));
    setTouched((prev) => ({ ...prev, mbti: true }));
    setErrors((prev) => ({ ...prev, mbti: validateField('mbti', nextMbti) }));
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
      'phone',
      'gender',
      'age',
      'mbti',
      'haveCharmIds',
      'wantCharmIds',
      'consent',
    ];

    setTouched({
      studentId: true,
      name: true,
      phone: true,
      gender: true,
      age: true,
      mbti: true,
      haveCharmIds: true,
      wantCharmIds: true,
      consent: true,
    });

    const newErrors = {
      studentId: validateField('studentId', formData.studentId),
      name: validateField('name', formData.name),
      phone: validateField('phone', formData.phone),
      gender: validateField('gender', formData.gender),
      age: validateField('age', formData.age),
      mbti: validateField('mbti', formData.mbti),
      haveCharmIds: validateField('haveCharmIds', formData.haveCharmIds),
      wantCharmIds: validateField('wantCharmIds', formData.wantCharmIds),
      consent: validateField('consent', formData.consent),
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
        phone: formData.phone.trim(),
        gender: formData.gender as boolean,
        age: Number(formData.age),
        mbti: formData.mbti,
        have_charm_ids: formData.haveCharmIds,
        want_charm_ids: formData.wantCharmIds,
        ex_have: exHave || null,
        ex_want: exWant || null,
        consent_agreed: true,
        consent_version: CONSENT_VERSION,
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

  const textInputKeys = ['studentId', 'name', 'phone', 'age'] as const;

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
      <div className="max-w-[480px] mx-auto px-4 pt-6 pb-12">
        <div className="flex items-center justify-center gap-2 mb-5">
          <Image
            src="/ysu-logo.svg"
            alt="영남대학교"
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
          />
          <p className="text-sm font-semibold tracking-wide text-[#8C7A8E]">
            컴소과 X 총학생회
          </p>
        </div>
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

              {/* Phone */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="phone"
                  className="flex flex-wrap items-center gap-y-0.5 text-xs font-semibold text-[#8C7A8E] tracking-wider uppercase"
                >
                  <span>
                    📞 전화번호<span className="text-[#E8526A]">*</span>
                  </span>
                  <span className="text-[10px] text-[#8C7A8E] normal-case sm:ml-2 font-normal leading-relaxed">
                    매칭 연락에 사용해요. 외부에 공개되지 않아요.
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    placeholder="010-1234-5678"
                    maxLength={13}
                    inputMode="numeric"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`${getInputClass('phone')} pr-12`}
                  />
                  {touched.phone && (
                    <span
                      className={`absolute right-4 top-1/2 -translate-y-1/2 font-bold text-lg pointer-events-none transition-all duration-200 ${
                        errors.phone ? 'text-[#E8526A]' : 'text-[#4CAF82]'
                      }`}
                    >
                      {errors.phone ? '✕' : '✓'}
                    </span>
                  )}
                </div>
                <p
                  className={`text-xs leading-relaxed transition-all duration-150 ${getHintDetails('phone').style}`}
                >
                  {getHintDetails('phone').text}
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
              <div className="flex flex-col gap-2" id="mbti">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-[#8C7A8E] tracking-wider uppercase">
                    🧠 MBTI<span className="text-[#E8526A]">*</span>
                  </label>
                  <span
                    className={`text-sm font-bold tracking-[0.2em] ${
                      formData.mbti ? 'text-[#E8526A]' : 'text-[#C9B0BE]'
                    }`}
                  >
                    {formData.mbti || '----'}
                  </span>
                </div>
                <div className="rounded-2xl border border-[#F0D9DF] bg-[#FDE8EC]/70 px-3 py-4">
                  <div className="grid grid-cols-4 gap-2">
                    {MBTI_AXES.map((axis) => {
                      const selected = mbtiAxes[axis.key];
                      const isBottom = selected === axis.right;
                      return (
                        <div
                          key={axis.key}
                          className="flex flex-col items-center gap-2"
                        >
                          <button
                            type="button"
                            onClick={() => handleMbtiAxis(axis.key, axis.left)}
                            className={`text-center transition-colors ${
                              selected === axis.left
                                ? 'text-[#E8526A]'
                                : 'text-[#8C7A8E]'
                            }`}
                          >
                            <span className="block text-lg font-extrabold leading-none">
                              {axis.left}
                            </span>
                            <span className="block text-[10px] font-semibold mt-0.5">
                              {axis.leftHint}
                            </span>
                          </button>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isBottom}
                            aria-label={`${axis.left} 또는 ${axis.right}`}
                            onClick={() =>
                              handleMbtiAxis(
                                axis.key,
                                isBottom ? axis.left : axis.right
                              )
                            }
                            className={`relative h-16 w-9 rounded-full transition-colors duration-200 ${
                              selected ? 'bg-[#E8526A]' : 'bg-[#F0D9DF]'
                            }`}
                          >
                            <span
                              className={`absolute left-1 h-7 w-7 rounded-full bg-white shadow-sm transition-all duration-200 ${
                                isBottom ? 'top-[calc(100%-2rem)]' : 'top-1'
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMbtiAxis(axis.key, axis.right)}
                            className={`text-center transition-colors ${
                              selected === axis.right
                                ? 'text-[#E8526A]'
                                : 'text-[#8C7A8E]'
                            }`}
                          >
                            <span className="block text-lg font-extrabold leading-none">
                              {axis.right}
                            </span>
                            <span className="block text-[10px] font-semibold mt-0.5">
                              {axis.rightHint}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <p
                  className={`text-xs leading-relaxed transition-all duration-150 ${
                    touched.mbti && errors.mbti
                      ? 'text-[#E8526A] min-h-[16px] mt-1'
                      : touched.mbti && !errors.mbti
                        ? 'text-[#4CAF82] font-semibold min-h-[16px] mt-1'
                        : 'text-[#8C7A8E] min-h-[0px] mt-0'
                  }`}
                >
                  {touched.mbti
                    ? errors.mbti || '✓ 확인됐어요'
                    : ''}
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
              {/* Privacy consent */}
              <div className="flex flex-col gap-2" id="consent" tabIndex={-1}>
                <h3 className="text-base font-bold text-[#2B1B2E]">
                  {CONSENT_TITLE}
                  <span className="text-[#E8526A]">*</span>
                </h3>
                <p className="text-[11px] text-[#8C7A8E] leading-relaxed">
                  개인정보처리자: {CONSENT_PROCESSOR} · 동의문 버전 {CONSENT_VERSION}
                </p>
                <button
                  type="button"
                  onClick={() => setConsentOpen((open) => !open)}
                  aria-expanded={consentOpen}
                  className="self-start text-sm font-semibold text-[#E8526A] underline underline-offset-2 decoration-[#E8526A]/50 hover:decoration-[#E8526A]"
                >
                  {consentOpen ? '전문 닫기' : '전문 보기'}
                </button>
                {consentOpen && (
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-[#F0D9DF] bg-[#FDE8EC]/50 px-3 py-3 text-[12px] leading-relaxed text-[#2B1B2E] space-y-2.5">
                    <p>
                      QRious는 「개인정보 보호법」 제15조에 따라 아래 사항을 알리고
                      동의를 받습니다.
                    </p>
                    <p>
                      <span className="font-bold">수집·이용 목적</span>
                      <br />
                      {CONSENT_PURPOSE}
                    </p>
                    <p>
                      <span className="font-bold">수집 항목</span>
                      <br />
                      필수: {CONSENT_ITEMS}
                      <br />
                      선택: {CONSENT_OPTIONAL_ITEMS}
                    </p>
                    <p>
                      <span className="font-bold underline decoration-[#E8526A] underline-offset-2">
                        보유 및 이용 기간
                      </span>
                      <br />
                      {CONSENT_RETENTION}
                    </p>
                    <p>
                      <span className="font-bold">동의 거부 권리 및 불이익</span>
                      <br />
                      {CONSENT_REFUSAL}
                    </p>
                    <p>
                      <span className="font-bold">제3자 제공</span>
                      <br />
                      {CONSENT_THIRD_PARTY}
                    </p>
                    <p>
                      <span className="font-bold">처리 위탁</span>
                      <br />
                      {CONSENT_ENTRUSTMENT}
                    </p>
                  </div>
                )}
                <label className="flex items-start gap-2.5 text-sm leading-relaxed cursor-pointer">
                  <input
                    id="consent-checkbox"
                    type="checkbox"
                    checked={formData.consent}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setFormData((prev) => ({ ...prev, consent: next }));
                      setTouched((prev) => ({ ...prev, consent: true }));
                      setErrors((prev) => ({
                        ...prev,
                        consent: validateField('consent', next),
                      }));
                    }}
                    className="mt-1 h-4 w-4 shrink-0 accent-[#E8526A]"
                  />
                  <span>
                    개인정보 수집·이용 내용을 확인했으며 이에 동의합니다. (필수)
                  </span>
                </label>
                <p
                  className={`text-xs leading-relaxed ${
                    touched.consent && errors.consent
                      ? 'text-[#E8526A]'
                      : 'text-[#8C7A8E]'
                  }`}
                >
                  {touched.consent && errors.consent
                    ? errors.consent
                    : `전문은 저장 시 버전 ${CONSENT_VERSION}으로 기록됩니다.`}
                </p>
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
