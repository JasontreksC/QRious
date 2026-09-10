'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  cancelSurvey,
  getCharms,
  getGoogleSession,
  getMajors,
  getStats,
  logoutGoogle,
  submitSurvey,
  ApiError,
  type Charm,
  type GoogleAuthSession,
  type Major,
  type SurveyStats,
} from '@/lib/api';
import {
  CONSENT_ENTRUSTMENT,
  CONSENT_ITEMS,
  CONSENT_OPTIONAL_ITEMS,
  CONSENT_PURPOSE,
  CONSENT_REFUSAL,
  CONSENT_RETENTION,
  CONSENT_THIRD_PARTY_NOTE,
  CONSENT_TITLE,
  CONSENT_VERSION,
  THIRD_PARTY_CONSENT_TITLE,
  THIRD_PARTY_CONSENT_VERSION,
  THIRD_PARTY_ITEMS,
  THIRD_PARTY_OPTIONAL_ITEMS,
  THIRD_PARTY_PURPOSE,
  THIRD_PARTY_RECIPIENT,
  THIRD_PARTY_REFUSAL,
  THIRD_PARTY_RETENTION,
} from '@/lib/consent-notice';
import {
  AGE_PREF_ANY,
  AGE_PREF_SPECIFIC,
  type AgePrefSpecificId,
} from '@/lib/age-pref';
import { parseStudentDisplayName } from '@/lib/student-name';
import { StatsBoard } from './stats-board';
import { DeadlineCountdown, SurveyClosedPage, useSurveyOpen } from './deadline-countdown';
import { QriousWordmark } from './qrious-wordmark';
import { SiteHeader } from './site-header';
import { SubmittedSurvey } from './submitted-survey';
import { isSurveyOpen } from '@/lib/deadline';
import qriousLogo from './icon.png';
import styles from './y2k-theme.module.css';

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

function oauthErrorMessage(code: string | null): string | null {
  if (code === 'domain') {
    return '연성대학교 구글 계정(@yeonsung.ac.kr)만 사용할 수 있습니다.';
  }
  if (code === 'google') {
    return '구글 로그인에 실패했습니다. 다시 시도해 주세요.';
  }
  if (code === 'config') {
    return '구글 로그인이 아직 설정되지 않았습니다.';
  }
  return null;
}

type AgePrefForm = {
  any: boolean;
  ids: AgePrefSpecificId[];
};

type FormData = {
  name: string;
  major: string;
  phone: string;
  gender: boolean | null;
  age: string;
  agePref: AgePrefForm;
  mbti: string;
  haveCharmIds: string[];
  wantCharmIds: string[];
  exHave: string;
  exWant: string;
  consent: boolean;
};

type FieldKey =
  | 'name'
  | 'major'
  | 'phone'
  | 'gender'
  | 'age'
  | 'agePref'
  | 'mbti'
  | 'haveCharmIds'
  | 'wantCharmIds'
  | 'consent';

const initialFormData: FormData = {
  name: '',
  major: '',
  phone: '',
  gender: null,
  age: '',
  agePref: { any: false, ids: [] },
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
    name: false,
    major: false,
    phone: false,
    gender: false,
    age: false,
    agePref: false,
    mbti: false,
    haveCharmIds: false,
    wantCharmIds: false,
    consent: false,
  });

  const [errors, setErrors] = useState<Record<FieldKey, string>>({
    name: '',
    major: '',
    phone: '',
    gender: '',
    age: '',
    agePref: '',
    mbti: '',
    haveCharmIds: '',
    wantCharmIds: '',
    consent: '',
  });

  const [charms, setCharms] = useState<Charm[]>([]);
  const [charmsLoading, setCharmsLoading] = useState(true);
  const [charmsError, setCharmsError] = useState('');
  const [majors, setMajors] = useState<Major[]>([]);
  const [consentOpen, setConsentOpen] = useState(false);
  const [thirdPartyConsentOpen, setThirdPartyConsentOpen] = useState(false);

  const [stats, setStats] = useState<SurveyStats>({
    total: 0,
    male: 0,
    female: 0,
    major_count: 0,
    majors: [],
  });

  const [isMounted, setIsMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [googleSession, setGoogleSession] = useState<GoogleAuthSession | null>(
    null
  );
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const surveyOpen = useSurveyOpen();

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
        major_count: data.major_count ?? 0,
        majors: Array.isArray(data.majors) ? data.majors : [],
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

  const fetchMajors = async () => {
    try {
      const list = await getMajors();
      setMajors(list);
    } catch (err) {
      console.error('Error fetching majors:', err);
      setMajors([]);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchStats();
    fetchCharms();
    fetchMajors();

    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get('error');
    if (errorCode === 'not_student') {
      window.alert('학생만 참가할 수 있습니다.');
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      const oauthError = oauthErrorMessage(errorCode);
      if (oauthError) {
        triggerToast(`⚠️ ${oauthError}`);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }

    let cancelled = false;
    (async () => {
      try {
        const session = await getGoogleSession();
        if (cancelled) return;
        if (session.authenticated) {
          const displayName = parseStudentDisplayName(session.name);
          if (!displayName) {
            window.alert('학생만 참가할 수 있습니다.');
            await logoutGoogle();
            if (cancelled) return;
            setGoogleSession({ authenticated: false });
            return;
          }
          setGoogleSession(session);
          if (session.submitted) setSubmitted(true);
          setFormData((prev) => ({
            ...prev,
            name: displayName,
          }));
        } else {
          setGoogleSession(session);
        }
      } catch (err) {
        console.error('Error fetching Google session:', err);
        if (!cancelled) setGoogleSession({ authenticated: false });
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const validateField = (name: FieldKey, value: FormData[FieldKey]): string => {
    switch (name) {
      case 'gender':
        if (value === null || value === undefined) return '성별을 선택해 주세요.';
        return '';
      case 'name': {
        const v = typeof value === 'string' ? value.trim() : '';
        if (!v) return '구글 계정에서 이름을 불러오지 못했습니다.';
        if (v.length < 2) return '이름은 2글자 이상이어야 합니다.';
        return '';
      }
      case 'major': {
        const v = typeof value === 'string' ? value.trim() : '';
        if (!v) return '학과를 선택해 주세요.';
        if (!majors.some((item) => item.major_id === v))
          return '학과를 목록에서 선택해 주세요.';
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
      case 'agePref': {
        const v = value as AgePrefForm;
        if (v.any) return '';
        if (v.ids.length > 0) return '';
        return '선호하는 연령 조건을 선택해 주세요.';
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
        if (value !== true)
          return '개인정보 수집·이용 및 제3자 제공에 동의해 주세요.';
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

  const handleAgeAny = (checked: boolean) => {
    const next: AgePrefForm = checked
      ? { any: true, ids: [] }
      : { any: false, ids: formData.agePref.ids };
    setFormData((prev) => ({ ...prev, agePref: next }));
    setTouched((prev) => ({ ...prev, agePref: true }));
    setErrors((prev) => ({
      ...prev,
      agePref: validateField('agePref', next),
    }));
  };

  const toggleAgePref = (id: AgePrefSpecificId) => {
    if (formData.agePref.any) return;
    const current = formData.agePref.ids;
    const ids = current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id];
    const next: AgePrefForm = { any: false, ids };
    setFormData((prev) => ({ ...prev, agePref: next }));
    setTouched((prev) => ({ ...prev, agePref: true }));
    setErrors((prev) => ({
      ...prev,
      agePref: validateField('agePref', next),
    }));
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
      'name',
      'major',
      'phone',
      'gender',
      'age',
      'agePref',
      'mbti',
      'haveCharmIds',
      'wantCharmIds',
      'consent',
    ];

    setTouched({
      name: true,
      major: true,
      phone: true,
      gender: true,
      age: true,
      agePref: true,
      mbti: true,
      haveCharmIds: true,
      wantCharmIds: true,
      consent: true,
    });

    const newErrors = {
      name: validateField('name', formData.name),
      major: validateField('major', formData.major),
      phone: validateField('phone', formData.phone),
      gender: validateField('gender', formData.gender),
      age: validateField('age', formData.age),
      agePref: validateField('agePref', formData.agePref),
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

    if (!isSurveyOpen()) {
      triggerToast('⚠️ 접수가 마감되었습니다.');
      return;
    }

    setSubmitting(true);

    try {
      const exHave = formData.exHave.trim();
      const exWant = formData.exWant.trim();

      await submitSurvey({
        phone: formData.phone.trim(),
        gender: formData.gender as boolean,
        age: Number(formData.age),
        major_id: formData.major,
        age_pref_ids: formData.agePref.any
          ? [AGE_PREF_ANY]
          : formData.agePref.ids,
        mbti: formData.mbti,
        have_charm_ids: formData.haveCharmIds,
        want_charm_ids: formData.wantCharmIds,
        ex_have: exHave || null,
        ex_want: exWant || null,
        consent_agreed: true,
        consent_version: CONSENT_VERSION,
        third_party_consent_agreed: true,
        third_party_consent_version: THIRD_PARTY_CONSENT_VERSION,
      });

      setSubmitted(true);
      fetchStats();
    } catch (err: unknown) {
      console.error('Submit error:', err);
      if (err instanceof ApiError && err.status === 409) {
        triggerToast(
          '⚠️ 이미 이 구글 계정으로 접수했습니다. 사전조사는 한 번만 참여하실 수 있습니다.'
        );
        setSubmitted(true);
      } else if (err instanceof ApiError && err.status === 403) {
        window.alert('학생만 참가할 수 있습니다.');
        await logoutGoogle();
        setGoogleSession({ authenticated: false });
        setSubmitted(false);
      } else if (err instanceof ApiError && err.status === 401) {
        setGoogleSession({ authenticated: false });
        triggerToast('⚠️ 학교 구글 계정으로 로그인해 주세요.');
      } else {
        const message =
          err instanceof Error ? err.message : '서버 응답 오류';
        triggerToast(`❌ 오류가 발생했습니다: ${message}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutGoogle();
      setGoogleSession({ authenticated: false });
      setSubmitted(false);
    } catch (err) {
      console.error('Logout error:', err);
      triggerToast('❌ 로그아웃에 실패했습니다.');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleCancelSurvey = () => {
    setCancelConfirmOpen(true);
  };

  const confirmCancelSurvey = async () => {
    setCancelConfirmOpen(false);
    setCancelling(true);
    try {
      await cancelSurvey();
      setSubmitted(false);
      fetchStats();
    } catch (err) {
      console.error('Cancel error:', err);
      const message =
        err instanceof Error ? err.message : '접수를 취소하지 못했습니다.';
      triggerToast(`❌ ${message}`);
    } finally {
      setCancelling(false);
    }
  };

  const textInputKeys = ['name', 'phone', 'age'] as const;

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

  return (
    <div
      className={`${styles.y2kPage} min-h-screen text-[#2B1B2E] font-sans pb-[calc(80px+env(safe-area-inset-bottom))]`}
    >
      <div className={styles.decorScene} aria-hidden="true">
        <span className={`${styles.orb} ${styles.orbOne}`} />
        <span className={`${styles.orb} ${styles.orbTwo}`} />
        <span className={`${styles.sticker} ${styles.onlineSticker}`}>
          ● ONLINE
        </span>
        <span className={`${styles.sticker} ${styles.messageSticker}`}>
          NEW MESSAGE!
        </span>
        <span className={styles.chromeStar}>✦</span>
      </div>
      <SiteHeader
        onLogout={
          googleSession?.authenticated ? handleLogout : undefined
        }
        loggingOut={loggingOut}
      />
      {googleSession?.authenticated && googleSession.isAdmin && (
        <Link
          href="/admin"
          className={`${styles.sessionChipRight} px-3 py-2 rounded-xl text-xs font-bold tracking-wide bg-white/90 border border-[#F0D9DF] text-[#8C7A8E] shadow-sm hover:bg-[#FDE8EC] hover:text-[#E8526A]`}
        >
          관리자
        </Link>
      )}
      <div className={`${styles.pageContent} max-w-[480px] mx-auto px-4 pt-6 pb-12`}>
        <div className={`${styles.hero} text-center mb-8`}>
          <p className={styles.eyebrow}>
            <span className={styles.statusDot} aria-hidden="true" />
            YEONSUNG FESTIVAL · 2026
          </p>
          <div className={styles.logoStage}>
            <span
              className={`${styles.logoSparkle} ${styles.logoSparkleOne}`}
              aria-hidden="true"
            >
              ✦
            </span>
            <div className={styles.logoFrame}>
              <div className={styles.logoInset}>
                <Image
                  src={qriousLogo}
                  alt="QRious"
                  priority
                  className={styles.logoImage}
                />
              </div>
            </div>
            <span
              className={`${styles.logoSparkle} ${styles.logoSparkleTwo}`}
              aria-hidden="true"
            >
              ★
            </span>
            <span className={styles.logoStatus} aria-hidden="true">
              YOU&apos;VE GOT LOVE!
            </span>
          </div>
          <h1
            className={styles.heroTitle}
            aria-label="QRious Y2K 소개팅 사전 접수"
          >
            <QriousWordmark />
            <span className={styles.titleLine}>
              <span className={styles.titleStar} aria-hidden="true">
                ★
              </span>
              QR 소개팅 사전 접수
              <span className={styles.titleStar} aria-hidden="true">
                ★
              </span>
            </span>
          </h1>
          <p className={styles.heroCopy}>
            새로운 인연에 접속 중...{' '}
            <span className={styles.heroHeart} aria-hidden="true">
              ♡
            </span>
            <br />
            즐거운 양지대동제를 새 인연과 시작해보세요!
          </p>
        </div>

        {/* Statistics Board */}
        <StatsBoard stats={stats} loading={!isMounted} />
        <Link href="/matching" className={styles.matchingInfoLink}>
          <span className={styles.matchingInfoIcon} aria-hidden="true">
            i
          </span>
          매칭 시스템에 대해서...
        </Link>
        <DeadlineCountdown />

        {!submitted && surveyOpen && (
          <div className="text-center mb-8">
            <p className="text-sm text-[#8C7A8E] mt-1.5 leading-relaxed">
              {googleSession?.authenticated ? (
                <>
                  아래 정보를 입력해 주세요.
                  <br />
                  매칭에만 사용하고, 이벤트가 끝나는 즉시 폐기해요.
                </>
              ) : (
                <>
                  연성대학교 구글 계정(@yeonsung.ac.kr)으로
                  <br />
                  로그인한 뒤 사전 접수를 진행해 주세요.
                </>
              )}
            </p>
          </div>
        )}

        {authLoading && surveyOpen ? (
          <div className="bg-white border border-[#F0D9DF] rounded-2xl p-6 shadow-sm h-[180px] animate-pulse flex flex-col items-center justify-center text-xs text-[#8C7A8E] gap-2">
            <span>로그인 상태를 확인하는 중…</span>
          </div>
        ) : !surveyOpen ? (
          <SurveyClosedPage />
        ) : !googleSession?.authenticated ? (
            <a
              href="/api/auth/google"
              className="w-full inline-flex items-center justify-center gap-2 min-h-[52px] px-5 py-3.5 bg-white border border-[#F0D9DF] hover:bg-[#FDE8EC] text-[#2B1B2E] text-[16px] font-semibold rounded-xl transition-colors duration-200"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              구글 계정으로 로그인
            </a>
        ) : submitted ? (
          <div>
            <div className="text-center py-10 bg-white border border-[#F0D9DF] rounded-2xl p-6 shadow-sm">
              {googleSession.authenticated && (
                <div className="mb-6 flex items-center gap-3 rounded-xl bg-[#FDE8EC] border border-[#F0D9DF] px-3 py-2.5 text-left">
                  {googleSession.picture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={googleSession.picture}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 rounded-full object-cover bg-white"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-[#E8526A]">
                      {parseStudentDisplayName(googleSession.name)?.slice(0, 1) ||
                        googleSession.name.slice(0, 1)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#2B1B2E]">
                      {googleSession.name}
                    </p>
                    <p className="truncate text-xs text-[#8C7A8E]">
                      {googleSession.email}
                    </p>
                  </div>
                </div>
              )}
              <div className="text-[60px]">🎉</div>
              <h2 className="text-[22px] font-bold text-[#E8526A] mt-4">접수 완료</h2>
              <p className="text-[15px] text-[#8C7A8E] mt-2 leading-relaxed">
                이미 사전조사가 접수된 상태예요.
                <br />곧 좋은 인연을 연결해 드릴게요.
              </p>
              <div className="mt-4 rounded-xl border border-[#F0D9DF] bg-[#FDE8EC] px-4 py-3.5">
                <p className="text-[15px] font-bold text-[#E8526A] leading-relaxed">
                  10월 15일 축제 당일, 오전 중 문자로 매칭되었음을 알려드릴 거예요!
                  <br />
                  문자로 받은 링크로 오시거나, 아니면 이 페이지를 저장했다가 축제 당일 다시 로그인하면 매칭된 상대의 이름, 연락처, 정보를 확인할 수 있어요.
                  <br />
                  매칭된 커플끼리 컴소과 주점으로 오시면 메뉴 할인! 매칭 결과 페이지를 두분이서 보여주시면 됩니다.
                  <br />
                  남녀 비율이 안맞으면 매칭이 안될수도 있어요..ㅜㅜ 그렇게 된다면 아쉽지만 다른 기회를 알아보는걸로 해요.
                </p>
              </div>
              <SubmittedSurvey
                majors={majors}
                charms={charms}
                charmsLoading={charmsLoading}
                editable={surveyOpen}
                onToast={triggerToast}
                onSaved={fetchStats}
              />
            </div>
            <button
              type="button"
              onClick={handleCancelSurvey}
              disabled={cancelling}
              className="mt-4 mx-auto block bg-transparent p-2 text-[13px] font-semibold text-[#E8526A] underline underline-offset-2 decoration-[#E8526A]/50 hover:decoration-[#E8526A] disabled:opacity-50"
            >
              {cancelling ? '취소 중…' : '접수 취소'}
            </button>
          </div>
        ) : (
          <div className="bg-white border border-[#F0D9DF] rounded-2xl p-6 shadow-sm">
            {googleSession.authenticated && (
              <div className="mb-5 flex items-center gap-3 rounded-xl bg-[#FDE8EC] border border-[#F0D9DF] px-3 py-2.5">
                {googleSession.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={googleSession.picture}
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-full object-cover bg-white"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-[#E8526A]">
                    {parseStudentDisplayName(googleSession.name)?.slice(0, 1) ||
                      googleSession.name.slice(0, 1)}
                  </span>
                )}
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold text-[#2B1B2E]">
                    {googleSession.name}
                  </p>
                  <p className="truncate text-xs text-[#8C7A8E]">
                    {googleSession.email}
                  </p>
                </div>
              </div>
            )}
            <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-5">
              {/* Name */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="name"
                  className="text-xs font-semibold text-[#8C7A8E] tracking-wider uppercase"
                >
                  🪪 이름<span className="text-[#E8526A]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    readOnly
                    value={formData.name}
                    className={`${getInputClass('name')} pr-12 bg-[#F7F0F2] text-[#8C7A8E] cursor-not-allowed`}
                  />
                </div>
              </div>

              {/* Major */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="major"
                  className="text-xs font-semibold text-[#8C7A8E] tracking-wider uppercase"
                >
                  🏛 학과<span className="text-[#E8526A]">*</span>
                </label>
                <select
                  id="major"
                  name="major"
                  value={formData.major}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full px-4 py-3 border-1.5 rounded-xl font-sans text-[16px] bg-[#FDE8EC] transition-all duration-200 outline-none focus:border-[#E8526A] focus:bg-white focus:ring-3 focus:ring-[#E8526A]/10 appearance-none ${
                    !formData.major ? 'text-[#C9B0BE]' : 'text-[#2B1B2E]'
                  } ${
                    !touched.major
                      ? 'border-[#F0D9DF]'
                      : errors.major
                        ? 'border-[#E8526A] bg-[#FEF0F2]'
                        : 'border-[#4CAF82] bg-[#F2FBF6]'
                  }`}
                >
                  <option value="">학과를 선택해 주세요</option>
                  {majors.map((item) => (
                    <option key={item.major_id} value={item.major_id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <p
                  className={`text-xs leading-relaxed transition-all duration-150 ${
                    touched.major
                      ? errors.major
                        ? 'text-[#E8526A] min-h-[16px] mt-1'
                        : 'text-[#4CAF82] font-semibold min-h-[16px] mt-1'
                      : 'text-[#8C7A8E] min-h-[0px] mt-0'
                  }`}
                >
                  {touched.major
                    ? errors.major || '✓ 확인됐어요'
                    : ''}
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
                    매칭된 상대에게 전화번호가 전달돼요.
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
                <label className="text-xs font-semibold text-[#8C7A8E] tracking-wider uppercase">
                  ⚧ 성별<span className="text-[#E8526A]">*</span>
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

              {/* Preferred age */}
              <div className="flex flex-col gap-2" id="agePref">
                <label className="flex flex-wrap items-center gap-y-0.5 text-xs font-semibold text-[#8C7A8E] tracking-wider uppercase">
                  <span>
                    선호하는 연령<span className="text-[#E8526A]">*</span>
                  </span>
                  <span className="text-[10px] text-[#8C7A8E] normal-case sm:ml-2 font-normal leading-relaxed">
                    중복 선택이 가능해요.
                  </span>
                </label>
                <label className="flex items-center gap-2.5 text-sm leading-relaxed cursor-pointer">
                  <input
                    id="agePref-any"
                    type="checkbox"
                    checked={formData.agePref.any}
                    onChange={(e) => handleAgeAny(e.target.checked)}
                    className="h-4 w-4 shrink-0 accent-[#E8526A]"
                  />
                  <span>상관없음</span>
                </label>
                <div className="flex gap-2">
                  {AGE_PREF_SPECIFIC.map((option) => {
                    const selected = formData.agePref.ids.includes(
                      option.age_pref_id
                    );
                    const disabled = formData.agePref.any;
                    return (
                      <button
                        key={option.age_pref_id}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleAgePref(option.age_pref_id)}
                        className={`flex-1 py-3 px-3 rounded-xl border text-[15px] font-semibold transition-all duration-200 ${
                          disabled
                            ? 'bg-[#F7F0F2] text-[#C9B0BE] border-[#F0D9DF] cursor-not-allowed'
                            : selected
                              ? 'bg-[#E8526A] text-white border-[#E8526A] shadow-sm'
                              : 'bg-[#FDE8EC] text-[#2B1B2E] border-[#F0D9DF] hover:bg-[#fcdde3]'
                        }`}
                      >
                        {option.name}
                        {selected && !disabled ? ' ✓' : ''}
                      </button>
                    );
                  })}
                </div>
                <p
                  className={`text-xs leading-relaxed transition-all duration-150 ${
                    touched.agePref && errors.agePref
                      ? 'text-[#E8526A] min-h-[16px] mt-1'
                      : touched.agePref && !errors.agePref
                        ? 'text-[#4CAF82] font-semibold min-h-[16px] mt-1'
                        : 'text-[#8C7A8E] min-h-[0px] mt-0'
                  }`}
                >
                  {touched.agePref
                    ? errors.agePref || '✓ 확인됐어요'
                    : ''}
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
              {/* Privacy consents */}
              <div className="flex flex-col gap-2" id="consent" tabIndex={-1}>
                <h3 className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-base font-bold text-[#2B1B2E]">
                  <span>
                    개인정보 수집·이용 및 제3자 제공 동의
                    <span className="text-[#E8526A]">*</span>
                  </span>
                </h3>
                <p className="text-[11px] text-[#8C7A8E] leading-relaxed">
                  매칭 안내 문자 발송과, 매칭된 상대에게 연락처 전달에 사용해요.
                </p>

                <div className="rounded-xl border border-[#F0D9DF] bg-[#FDE8EC]/40 px-3 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[12px] font-semibold text-[#2B1B2E] leading-snug">
                      {CONSENT_TITLE}
                      <span className="block text-[11px] font-normal text-[#8C7A8E] mt-0.5">
                        버전 {CONSENT_VERSION}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setConsentOpen((open) => !open)}
                      aria-expanded={consentOpen}
                      className="shrink-0 text-sm font-semibold text-[#E8526A] underline underline-offset-2 decoration-[#E8526A]/50 hover:decoration-[#E8526A]"
                    >
                      {consentOpen ? '전문 닫기' : '전문 보기'}
                    </button>
                  </div>
                  {consentOpen && (
                    <div className="max-h-56 overflow-y-auto rounded-lg border border-[#F0D9DF] bg-white px-3 py-3 text-[12px] leading-relaxed text-[#2B1B2E] space-y-2.5">
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
                        {CONSENT_THIRD_PARTY_NOTE}
                      </p>
                      <p>
                        <span className="font-bold">처리 위탁</span>
                        <br />
                        {CONSENT_ENTRUSTMENT}
                      </p>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3 pt-2 border-t border-[#F0D9DF]/80">
                    <p className="text-[12px] font-semibold text-[#2B1B2E] leading-snug">
                      {THIRD_PARTY_CONSENT_TITLE}
                      <span className="block text-[11px] font-normal text-[#8C7A8E] mt-0.5">
                        버전 {THIRD_PARTY_CONSENT_VERSION}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setThirdPartyConsentOpen((open) => !open)}
                      aria-expanded={thirdPartyConsentOpen}
                      className="shrink-0 text-sm font-semibold text-[#E8526A] underline underline-offset-2 decoration-[#E8526A]/50 hover:decoration-[#E8526A]"
                    >
                      {thirdPartyConsentOpen ? '전문 닫기' : '전문 보기'}
                    </button>
                  </div>
                  {thirdPartyConsentOpen && (
                    <div className="max-h-56 overflow-y-auto rounded-lg border border-[#F0D9DF] bg-white px-3 py-3 text-[12px] leading-relaxed text-[#2B1B2E] space-y-2.5">
                      <p>
                        QRious는 「개인정보 보호법」 제17조에 따라 아래 사항을 알리고
                        동의를 받습니다.
                      </p>
                      <p>
                        <span className="font-bold">제공받는 자</span>
                        <br />
                        {THIRD_PARTY_RECIPIENT}
                      </p>
                      <p>
                        <span className="font-bold">제공받는 자의 이용 목적</span>
                        <br />
                        {THIRD_PARTY_PURPOSE}
                      </p>
                      <p>
                        <span className="font-bold">제공하는 개인정보 항목</span>
                        <br />
                        필수: {THIRD_PARTY_ITEMS}
                        <br />
                        선택: {THIRD_PARTY_OPTIONAL_ITEMS}
                      </p>
                      <p>
                        <span className="font-bold underline decoration-[#E8526A] underline-offset-2">
                          제공받는 자의 보유 및 이용 기간
                        </span>
                        <br />
                        {THIRD_PARTY_RETENTION}
                      </p>
                      <p>
                        <span className="font-bold">동의 거부 권리 및 불이익</span>
                        <br />
                        {THIRD_PARTY_REFUSAL}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = !formData.consent;
                    setFormData((prev) => ({ ...prev, consent: next }));
                    setTouched((prev) => ({ ...prev, consent: true }));
                    setErrors((prev) => ({
                      ...prev,
                      consent: validateField('consent', next),
                    }));
                  }}
                  className={`w-full min-h-[48px] py-3 px-4 rounded-xl border text-[15px] font-semibold transition-all duration-200 ${
                    formData.consent
                      ? 'bg-[#E8526A] text-white border-[#E8526A] shadow-sm'
                      : 'bg-[#FDE8EC] text-[#2B1B2E] border-[#F0D9DF] hover:bg-[#fcdde3]'
                  }`}
                >
                  {formData.consent
                    ? '✓ 모두 동의했습니다'
                    : '모두 동의합니다 (필수)'}
                </button>
                <p
                  className={`text-xs leading-relaxed ${
                    touched.consent && errors.consent
                      ? 'text-[#E8526A]'
                      : 'text-[#8C7A8E]'
                  }`}
                >
                  {touched.consent && errors.consent
                    ? errors.consent
                    : `저장 시 수집·이용(${CONSENT_VERSION})과 제3자 제공(${THIRD_PARTY_CONSENT_VERSION}) 동의가 함께 기록됩니다.`}
                </p>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Floating Submit Bar */}
      {!submitted && googleSession?.authenticated && surveyOpen && (
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

      {cancelConfirmOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#2B1B2E]/40 px-6">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-survey-title"
            className="w-full max-w-[320px] rounded-2xl bg-white p-5 text-center shadow-lg"
          >
            <p id="cancel-survey-title" className="text-base font-bold text-[#2B1B2E]">
              접수를 취소할까요?
            </p>
            <p className="mt-2 text-sm text-[#8C7A8E] leading-relaxed">
              입력한 내용은 삭제됩니다.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setCancelConfirmOpen(false)}
                className="flex-1 min-h-[44px] rounded-xl border border-[#F0D9DF] bg-white text-sm font-semibold text-[#8C7A8E]"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => void confirmCancelSurvey()}
                className="flex-1 min-h-[44px] rounded-xl bg-[#E8526A] text-sm font-semibold text-white"
              >
                접수 취소
              </button>
            </div>
          </div>
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
