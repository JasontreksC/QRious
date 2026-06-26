'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export default function Home() {
  const [formData, setFormData] = useState<{
    name: string;
    studentId: string;
    nickname: string;
    ideal: string;
    gender: boolean | null;
  }>({
    name: '',
    studentId: '',
    nickname: '',
    ideal: '',
    gender: null,
  });

  const [touched, setTouched] = useState({
    name: false,
    studentId: false,
    nickname: false,
    ideal: false,
    gender: false,
  });

  const [errors, setErrors] = useState({
    name: '',
    studentId: '',
    nickname: '',
    ideal: '',
    gender: '',
  });

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

  // Helper to trigger toast
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

  // Fetch applicant stats from Supabase
  const fetchStats = async () => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('dating_info')
        .select('gender');

      if (error) throw error;

      if (data) {
        const total = data.length;
        const male = data.filter((item: any) => item.gender === false).length;
        const female = data.filter((item: any) => item.gender === true).length;
        setStats({ total, male, female });
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchStats();
  }, []);

  // Validation functions
  const validateField = (name: string, value: any) => {
    if (name === 'gender') {
      if (value === null || value === undefined) return '성별을 선택해 주세요.';
      return '';
    }

    const v = typeof value === 'string' ? value.trim() : '';
    switch (name) {
      case 'name':
        if (!v) return '이름을 입력해 주세요.';
        if (v.length < 2) return '이름은 2글자 이상이어야 합니다.';
        if (/[0-9]/.test(v)) return '이름에 숫자는 포함할 수 없습니다.';
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(v))
          return '특수문자는 사용할 수 없습니다.';
        return '';
      case 'studentId':
        if (!v) return '학번을 입력해 주세요.';
        if (!/^\d{10}$/.test(v)) return '학번은 정확히 10자리 숫자여야 합니다.';
        return '';
      case 'nickname':
        if (!v) return '별명을 입력해 주세요.';
        if (v.length < 2) return '별명은 2글자 이상이어야 합니다.';
        return '';
      case 'ideal':
        if (!v) return '이상형을 입력해 주세요.';
        if (v.length < 10) return '10글자 이상 자유롭게 적어 주세요.';
        return '';
      default:
        return '';
    }
  };

  // Handle Input Changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    let finalValue = value;

    // Enforce 10-digit limit on studentId
    if (name === 'studentId') {
      finalValue = value.replace(/\D/g, '').slice(0, 10);
    }

    setFormData((prev) => ({ ...prev, [name]: finalValue }));

    // Run real-time validation
    const error = validateField(name, finalValue);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  // Handle Gender Selection
  const handleGenderSelect = (value: boolean) => {
    setFormData((prev) => ({ ...prev, gender: value }));
    setTouched((prev) => ({ ...prev, gender: true }));
    setErrors((prev) => ({ ...prev, gender: '' }));
  };

  // Handle Blur
  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    const error = validateField(name, formData[name as keyof typeof formData]);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  // Submit Handler
  const handleSubmit = async () => {
    // Touch all fields
    setTouched({
      name: true,
      studentId: true,
      nickname: true,
      ideal: true,
      gender: true,
    });

    // Run validation across all fields
    const newErrors = {
      name: validateField('name', formData.name),
      studentId: validateField('studentId', formData.studentId),
      nickname: validateField('nickname', formData.nickname),
      ideal: validateField('ideal', formData.ideal),
      gender: validateField('gender', formData.gender),
    };

    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some((err) => err !== '');
    if (hasErrors) {
      triggerToast('⚠️ 입력 내용을 다시 확인해 주세요.');
      
      // Scroll to the first invalid field
      const firstInvalidField = Object.keys(newErrors).find(
        (key) => newErrors[key as keyof typeof newErrors] !== ''
      );
      if (firstInvalidField) {
        const el = document.getElementById(firstInvalidField);
        el?.focus();
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true);

    try {
      if (!supabase) {
        throw new Error('Supabase 설정이 구성되지 않았습니다. .env.local 파일에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY가 유효하게 입력되어 있는지 확인해 주세요.');
      }

      // 중복 검사: 학번으로 기존 신청 내역 확인
      const { data: existingStudent, error: checkError } = await supabase
        .from('student')
        .select('student_id')
        .eq('student_id', formData.studentId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingStudent) {
        triggerToast('⚠️ 이미 접수된 학번입니다. 사전조사는 한 번만 참여하실 수 있습니다.');
        setSubmitting(false);
        return;
      }

      // 1. Insert/Update student record
      const { error: studentError } = await supabase
        .from('student')
        .upsert({ student_id: formData.studentId, name: formData.name });

      if (studentError) throw studentError;

      // 2. Insert/Update dating_info record (renamed from nickname_ideal, includes gender)
      const { error: datingInfoError } = await supabase
        .from('dating_info')
        .upsert({
          student_id: formData.studentId,
          nickname: formData.nickname,
          ideal: formData.ideal,
          gender: formData.gender, // false for male, true for female
        });

      if (datingInfoError) throw datingInfoError;

      // Success
      setSubmitted(true);
      // Fetch updated stats immediately
      fetchStats();
    } catch (err: any) {
      console.error('Supabase error:', err);
      triggerToast(`❌ 오류가 발생했습니다: ${err.message || '서버 응답 오류'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Input styling class generator
  const getInputClass = (fieldName: keyof Omit<typeof formData, 'gender'>) => {
    const base =
      'w-full px-4 py-3 border-1.5 border-[#F0D9DF] rounded-xl font-sans text-[16px] text-[#2B1B2E] bg-[#FDE8EC] transition-all duration-200 outline-none placeholder-[#C9B0BE] focus:border-[#E8526A] focus:bg-white focus:ring-3 focus:ring-[#E8526A]/10 appearance-none';
    if (!touched[fieldName]) return base;
    return errors[fieldName]
      ? `${base} border-[#E8526A] bg-[#FEF0F2]`
      : `${base} border-[#4CAF82] bg-[#F2FBF6]`;
  };

  // Helper to determine dynamic hint text and styling
  const getHintDetails = (fieldName: keyof Omit<typeof formData, 'gender'>) => {
    if (!touched[fieldName]) {
      return { text: '', style: 'text-[#8C7A8E] min-h-[0px] mt-0' };
    }
    if (errors[fieldName]) {
      return { text: errors[fieldName], style: 'text-[#E8526A] min-h-[16px] mt-1' };
    }
    return { text: '✓ 확인됐어요', style: 'text-[#4CAF82] font-semibold min-h-[16px] mt-1' };
  };

  const chartData = [
    { name: '남자', value: stats.male, color: '#3B82F6' },
    { name: '여자', value: stats.female, color: '#E8526A' },
  ];

  return (
    <div className="min-h-screen bg-[#FBF6F0] text-[#2B1B2E] font-sans pb-[calc(80px+env(safe-area-inset-bottom))]">
      <div className="max-w-[480px] mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-[48px] inline-block animate-pulse duration-1000">💘</span>
          <h1 className="text-2xl font-bold tracking-tight text-[#E8526A] mt-2">
            QR 소개팅 사전 접수
          </h1>
          <p className="text-sm text-[#8C7A8E] mt-1.5 leading-relaxed">
            즐거운 축제를 새 인연과 함께하고 싶으신가요? <br/> 저희가 도와드릴게요!
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
              총< span className="text-[#2B1B2E]">{stats.total}</span>명이 접수했어요.
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
                    <span>남자 {stats.male}명 ({Math.round((stats.male / stats.total) * 100)}%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E8526A]" />
                    <span>여자 {stats.female}명 ({Math.round((stats.female / stats.total) * 100)}%)</span>
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
            아래 정보를 입력해 주세요.<br/>매칭에만 사용하고, 이벤트가 끝나는 즉시 폐기해요.
          </p>
        </div>

        {submitted ? (
          /* Success Screen */
          <div className="text-center py-10 bg-white border border-[#F0D9DF] rounded-2xl p-6 shadow-sm">
            <div className="text-[60px]">🎉</div>
            <h2 className="text-[22px] font-bold text-[#E8526A] mt-4">제출 완료!</h2>
            <p className="text-[15px] text-[#8C7A8E] mt-2 leading-relaxed">
              사전조사가 성공적으로 접수됐어요.<br />곧 좋은 인연을 연결해 드릴게요 💕
            </p>
          </div>
        ) : (
          /* Form Card */
          <div className="bg-white border border-[#F0D9DF] rounded-2xl p-6 shadow-sm">
            <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-5">
              {/* Name */}
              <div className="flex flex-col gap-1">
                <label htmlFor="name" className="flex flex-wrap items-center gap-y-0.5 text-xs font-semibold text-[#8C7A8E] tracking-wider uppercase">
                  <span>🪪 이름<span className="text-[#E8526A]">*</span></span>
                  <span className="text-[10px] text-[#8C7A8E] normal-case sm:ml-2 font-normal leading-relaxed">우리 학교 학생인지 확인하기 위해 사용해요. 외부에 공개되지 않아요.</span>
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
                <p className={`text-xs leading-relaxed transition-all duration-150 ${getHintDetails('name').style}`}>
                  {getHintDetails('name').text}
                </p>
              </div>


              {/* Student ID */}
              <div className="flex flex-col gap-1">
                <label htmlFor="studentId" className="flex flex-wrap items-center gap-y-0.5 text-xs font-semibold text-[#8C7A8E] tracking-wider uppercase">
                  <span>🎓 학번<span className="text-[#E8526A]">*</span></span>
                  <span className="text-[10px] text-[#8C7A8E] normal-case sm:ml-2 font-normal leading-relaxed">우리 학교 학생인지 확인하기 위해 사용해요. 외부에 공개되지 않아요.</span>
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
                <p className={`text-xs leading-relaxed transition-all duration-150 ${getHintDetails('studentId').style}`}>
                  {getHintDetails('studentId').text}
                </p>
              </div>

              <hr className="border-t-1.5 border-dashed border-[#F0D9DF] my-5" />

              {/* Gender (성별 선택 버튼) */}
              <div className="flex flex-col gap-1" id="gender">
                <label className="flex flex-wrap items-center gap-y-0.5 text-xs font-semibold text-[#8C7A8E] tracking-wider uppercase">
                  <span>⚧ 성별<span className="text-[#E8526A]">*</span></span>
                  <span className="text-[10px] text-[#8C7A8E] normal-case sm:ml-2 font-normal leading-relaxed">매칭 그룹을 나누는 데 활용해요.</span>
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
                    🙋‍♂️ 남자 {formData.gender === false && <span className="text-white text-base">✓</span>}
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
                    🙋‍♀️ 여자 {formData.gender === true && <span className="text-white text-base">✓</span>}
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
                  {errors.gender || (formData.gender !== null ? '✓ 확인됐어요' : '')}
                </p>
              </div>

              {/* Nickname */}
              <div className="flex flex-col gap-1">
                <label htmlFor="nickname" className="flex flex-wrap items-center gap-y-0.5 text-xs font-semibold text-[#8C7A8E] tracking-wider uppercase">
                  <span>✨ 별명<span className="text-[#E8526A]">*</span></span>
                  <span className="text-[10px] text-[#8C7A8E] normal-case sm:ml-2 font-normal leading-relaxed">매칭이 성사되면 별명으로 공지해드려요. 모두가 볼 수 있으니 적절한 표현을 사용해주세요.</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="nickname"
                    name="nickname"
                    placeholder="불리고 싶은 이름"
                    maxLength={15}
                    autoComplete="off"
                    value={formData.nickname}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`${getInputClass('nickname')} pr-12`}
                  />
                  {touched.nickname && (
                    <span
                      className={`absolute right-4 top-1/2 -translate-y-1/2 font-bold text-lg pointer-events-none transition-all duration-200 ${
                        errors.nickname ? 'text-[#E8526A]' : 'text-[#4CAF82]'
                      }`}
                    >
                      {errors.nickname ? '✕' : '✓'}
                    </span>
                  )}
                </div>
                <p className={`text-xs leading-relaxed transition-all duration-150 ${getHintDetails('nickname').style}`}>
                  {getHintDetails('nickname').text}
                </p>
              </div>

              <hr className="border-t-1.5 border-dashed border-[#F0D9DF] my-5" />

              {/* Ideal */}
              <div className="flex flex-col gap-1">
                <label htmlFor="ideal" className="flex flex-wrap items-center gap-y-0.5 text-xs font-semibold text-[#8C7A8E] tracking-wider uppercase">
                  <span>💭 이상형<span className="text-[#E8526A]">*</span></span>
                  <span className="text-[10px] text-[#8C7A8E] normal-case sm:ml-2 font-normal leading-relaxed">성격, 취미, 외모 등 자유롭게 10자 이상 적어주세요.</span>
                </label>
                <div className="relative">
                  <textarea
                    id="ideal"
                    name="ideal"
                    placeholder="어떤 사람과 만나고 싶으세요?"
                    rows={5}
                    maxLength={300}
                    value={formData.ideal}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`${getInputClass('ideal')} pr-12 resize-none`}
                  />
                  {touched.ideal && (
                    <span
                      className={`absolute right-4 top-4 font-bold text-lg pointer-events-none transition-all duration-200 ${
                        errors.ideal ? 'text-[#E8526A]' : 'text-[#4CAF82]'
                      }`}
                    >
                      {errors.ideal ? '✕' : '✓'}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className={`text-xs leading-relaxed transition-all duration-150 ${getHintDetails('ideal').style}`}>
                    {getHintDetails('ideal').text}
                  </p>
                  <div className={`text-[11px] ${formData.ideal.length >= 280 ? 'text-[#E8526A]' : 'text-[#8C7A8E]'}`}>
                    {formData.ideal.length} / 300
                  </div>
                </div>
              </div>
            </form>

            <hr className="border-t-1.5 border-dashed border-[#F0D9DF] my-5" />

            {/* Kakao Info */}
            <div className="space-y-3.5">
              <h3 className="font-bold text-base">카카오톡 오픈채팅방에 입장하고 알림을 받으세요!</h3>
              <p className="text-sm text-[#8C7A8E] leading-relaxed">
                매칭이 완료되면 오픈채팅방으로 공지를 올려드려요.<br />
                입력하신 별명을 사용하므로 직접 만나기 전까지는 상대가 누구인지 알 수 없어요!
              </p>
              <a
                href="#"
                className="w-full inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#FEE500] hover:bg-[#E6CE00] active:bg-[#D5BE00] text-[#191919] text-[16px] font-semibold rounded-xl text-center transition-colors duration-200"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
          showToast
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-3'
        }`}
      >
        {toastMessage}
      </div>
    </div>
  );
}
