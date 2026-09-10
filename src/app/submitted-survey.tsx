'use client';

import React, { useEffect, useState } from 'react';
import {
  ApiError,
  getMySurvey,
  patchSurvey,
  type Charm,
  type Major,
  type OwnSurvey,
  type SurveyPatch,
} from '@/lib/api';
import { AGE_PREF_ANY, AGE_PREF_SPECIFIC } from '@/lib/age-pref';

const MBTI_AXES = [
  { key: 'ei', left: 'E', right: 'I', leftHint: '외향', rightHint: '내향' },
  { key: 'ns', left: 'N', right: 'S', leftHint: '직관', rightHint: '감각' },
  { key: 'tf', left: 'T', right: 'F', leftHint: '사고', rightHint: '감정' },
  { key: 'jp', left: 'J', right: 'P', leftHint: '판단', rightHint: '인식' },
] as const;

type FieldKey =
  | 'major'
  | 'phone'
  | 'gender'
  | 'age'
  | 'agePref'
  | 'mbti'
  | 'have'
  | 'exHave'
  | 'want'
  | 'exWant';

type Draft = {
  major_id: string;
  phone: string;
  gender: boolean;
  age: string;
  agePrefAny: boolean;
  agePrefIds: string[];
  mbti: string;
  haveCharmIds: string[];
  wantCharmIds: string[];
  exHave: string;
  exWant: string;
};

function formatKrPhone(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

function toDraft(survey: OwnSurvey): Draft {
  return {
    major_id: survey.major_id,
    phone: survey.phone,
    gender: survey.gender,
    age: String(survey.age),
    agePrefAny: survey.age_pref_ids.includes(AGE_PREF_ANY),
    agePrefIds: survey.age_pref_ids.filter((id) => id !== AGE_PREF_ANY),
    mbti: survey.mbti,
    haveCharmIds: survey.have_charm_ids,
    wantCharmIds: survey.want_charm_ids,
    exHave: survey.ex_have ?? '',
    exWant: survey.ex_want ?? '',
  };
}

function charmChipClass(selected: boolean) {
  return `px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all duration-200 ${
    selected
      ? 'bg-[#E8526A] text-white border-[#E8526A] shadow-sm'
      : 'bg-[#FDE8EC] text-[#2B1B2E] border-[#F0D9DF]'
  }`;
}

function joinLabels(values: string[]) {
  return values.length > 0 ? values.join(', ') : '없음';
}

export function SubmittedSurvey({
  majors,
  charms,
  charmsLoading,
  editable = true,
  onToast,
  onSaved,
}: {
  majors: Major[];
  charms: Charm[];
  charmsLoading: boolean;
  editable?: boolean;
  onToast: (message: string) => void;
  onSaved?: () => void;
}) {
  const [survey, setSurvey] = useState<OwnSurvey | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState<FieldKey | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState('');

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getMySurvey();
      setSurvey(data);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : '접수 정보를 불러오지 못했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const startEdit = (field: FieldKey) => {
    if (!survey) return;
    setEditing(field);
    setDraft(toDraft(survey));
    setFieldError('');
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft(null);
    setFieldError('');
  };

  const saveField = async () => {
    if (!survey || !draft || !editing) return;

    let payload: SurveyPatch | null = null;
    if (editing === 'major') {
      if (!draft.major_id) {
        setFieldError('학과를 선택해 주세요.');
        return;
      }
      payload = { major_id: draft.major_id };
    } else if (editing === 'phone') {
      payload = { phone: draft.phone };
    } else if (editing === 'gender') {
      payload = { gender: draft.gender };
    } else if (editing === 'age') {
      const age = Number(draft.age);
      if (!Number.isInteger(age)) {
        setFieldError('나이를 올바르게 입력해 주세요.');
        return;
      }
      payload = { age };
    } else if (editing === 'agePref') {
      const ids = draft.agePrefAny ? [AGE_PREF_ANY] : draft.agePrefIds;
      if (ids.length === 0) {
        setFieldError('선호하는 연령 조건을 선택해 주세요.');
        return;
      }
      payload = { age_pref_ids: ids };
    } else if (editing === 'mbti') {
      if (draft.mbti.length !== 4) {
        setFieldError('MBTI를 올바르게 선택해 주세요.');
        return;
      }
      payload = { mbti: draft.mbti };
    } else if (editing === 'have') {
      if (draft.haveCharmIds.length === 0) {
        setFieldError('나의 매력을 하나 이상 선택해 주세요.');
        return;
      }
      payload = { have_charm_ids: draft.haveCharmIds };
    } else if (editing === 'want') {
      if (draft.wantCharmIds.length === 0) {
        setFieldError('이상형 매력을 하나 이상 선택해 주세요.');
        return;
      }
      payload = { want_charm_ids: draft.wantCharmIds };
    } else if (editing === 'exHave') {
      payload = { ex_have: draft.exHave.trim() || null };
    } else if (editing === 'exWant') {
      payload = { ex_want: draft.exWant.trim() || null };
    }

    if (!payload) return;
    setSaving(true);
    setFieldError('');
    try {
      const next = await patchSurvey(payload);
      setSurvey(next);
      setEditing(null);
      setDraft(null);
      onToast('저장했어요.');
      onSaved?.();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : '저장하지 못했습니다.';
      setFieldError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-6 h-40 rounded-xl bg-[#FDE8EC] animate-pulse" />
    );
  }

  if (loadError || !survey) {
    return (
      <div className="mt-6 rounded-xl border border-[#F0D9DF] bg-[#FDE8EC] px-4 py-4 text-sm text-[#8C7A8E]">
        <p>{loadError || '접수 정보를 불러오지 못했습니다.'}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-2 text-[#E8526A] font-semibold underline"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const row = (
    field: FieldKey,
    label: string,
    display: React.ReactNode,
    editor: React.ReactNode
  ) => (
    <div className="py-3 border-b border-[#F0D9DF]/80 last:border-0 text-left">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold tracking-wide text-[#8C7A8E] uppercase shrink-0 pt-0.5">
          {label}
        </p>
        {editing === field ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => void saveField()}
              disabled={saving}
              className="text-[13px] font-semibold text-[#E8526A] disabled:opacity-50"
            >
              {saving ? '저장 중…' : '저장'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="text-[13px] text-[#8C7A8E] disabled:opacity-50"
            >
              취소
            </button>
          </div>
        ) : editable ? (
          <button
            type="button"
            onClick={() => startEdit(field)}
            className="text-[13px] font-semibold text-[#E8526A] shrink-0"
          >
            편집
          </button>
        ) : null}
      </div>
      <div className="mt-1.5 text-sm text-[#2B1B2E] leading-relaxed">
        {editing === field ? editor : display}
      </div>
      {editing === field && fieldError ? (
        <p className="mt-1.5 text-xs text-[#E8526A]">{fieldError}</p>
      ) : null}
    </div>
  );

  return (
    <div className="mt-6 pt-5 border-t border-dashed border-[#F0D9DF] text-left">
      <h3 className="text-sm font-bold text-[#2B1B2E] mb-1">
        {survey.round ? `${survey.round}차 ` : ''}내 접수 정보
      </h3>
      <p className="text-[11px] text-[#8C7A8E] mb-2">
        {editable ? '마감 전까지 수정할 수 있어요.' : '접수가 마감되어 수정할 수 없어요.'}
      </p>

      <div className="py-3 border-b border-[#F0D9DF]/80 text-left">
        <p className="text-[11px] font-semibold tracking-wide text-[#8C7A8E] uppercase">
          이름
        </p>
        <p className="mt-1.5 text-sm font-semibold text-[#2B1B2E]">{survey.name}</p>
      </div>

      {row(
        'major',
        '학과',
        survey.major,
        <select
          value={draft?.major_id ?? ''}
          onChange={(e) =>
            setDraft((prev) =>
              prev ? { ...prev, major_id: e.target.value } : prev
            )
          }
          className="w-full px-3 py-2 border border-[#F0D9DF] rounded-xl bg-[#FDE8EC] text-[15px] outline-none focus:border-[#E8526A] focus:bg-white"
        >
          {majors.map((item) => (
            <option key={item.major_id} value={item.major_id}>
              {item.name}
            </option>
          ))}
        </select>
      )}

      {row(
        'phone',
        '전화번호',
        survey.phone,
        <input
          type="tel"
          inputMode="numeric"
          maxLength={13}
          value={draft?.phone ?? ''}
          onChange={(e) =>
            setDraft((prev) =>
              prev ? { ...prev, phone: formatKrPhone(e.target.value) } : prev
            )
          }
          className="w-full px-3 py-2 border border-[#F0D9DF] rounded-xl bg-[#FDE8EC] text-[15px] outline-none focus:border-[#E8526A] focus:bg-white"
        />
      )}

      {row(
        'gender',
        '성별',
        survey.gender ? '여자' : '남자',
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              setDraft((prev) => (prev ? { ...prev, gender: false } : prev))
            }
            className={`flex-1 py-2 rounded-xl border text-sm font-semibold ${
              draft?.gender === false
                ? 'bg-[#E8526A] text-white border-[#E8526A]'
                : 'bg-[#FDE8EC] text-[#2B1B2E] border-[#F0D9DF]'
            }`}
          >
            남자
          </button>
          <button
            type="button"
            onClick={() =>
              setDraft((prev) => (prev ? { ...prev, gender: true } : prev))
            }
            className={`flex-1 py-2 rounded-xl border text-sm font-semibold ${
              draft?.gender === true
                ? 'bg-[#E8526A] text-white border-[#E8526A]'
                : 'bg-[#FDE8EC] text-[#2B1B2E] border-[#F0D9DF]'
            }`}
          >
            여자
          </button>
        </div>
      )}

      {row(
        'age',
        '나이',
        `${survey.age}세`,
        <input
          type="tel"
          inputMode="numeric"
          maxLength={2}
          value={draft?.age ?? ''}
          onChange={(e) =>
            setDraft((prev) =>
              prev
                ? { ...prev, age: e.target.value.replace(/\D/g, '').slice(0, 2) }
                : prev
            )
          }
          className="w-full px-3 py-2 border border-[#F0D9DF] rounded-xl bg-[#FDE8EC] text-[15px] outline-none focus:border-[#E8526A] focus:bg-white"
        />
      )}

      {row(
        'agePref',
        '선호 연령',
        joinLabels(survey.age_prefs),
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft?.agePrefAny ?? false}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        agePrefAny: e.target.checked,
                        agePrefIds: e.target.checked ? [] : prev.agePrefIds,
                      }
                    : prev
                )
              }
              className="h-4 w-4 accent-[#E8526A]"
            />
            상관없음
          </label>
          <div className="flex gap-2">
            {AGE_PREF_SPECIFIC.map((option) => {
              const selected = draft?.agePrefIds.includes(option.age_pref_id);
              const disabled = draft?.agePrefAny;
              return (
                <button
                  key={option.age_pref_id}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    setDraft((prev) => {
                      if (!prev) return prev;
                      const has = prev.agePrefIds.includes(option.age_pref_id);
                      return {
                        ...prev,
                        agePrefIds: has
                          ? prev.agePrefIds.filter((id) => id !== option.age_pref_id)
                          : [...prev.agePrefIds, option.age_pref_id],
                      };
                    })
                  }
                  className={`flex-1 py-2 rounded-xl border text-sm font-semibold ${
                    disabled
                      ? 'bg-[#F7F0F2] text-[#C9B0BE] border-[#F0D9DF]'
                      : selected
                        ? 'bg-[#E8526A] text-white border-[#E8526A]'
                        : 'bg-[#FDE8EC] text-[#2B1B2E] border-[#F0D9DF]'
                  }`}
                >
                  {option.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {row(
        'mbti',
        'MBTI',
        survey.mbti,
        <div className="grid grid-cols-4 gap-2">
          {MBTI_AXES.map((axis, index) => {
            const current = draft?.mbti[index];
            return (
              <div key={axis.key} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => {
                      if (!prev) return prev;
                      const letters = prev.mbti.padEnd(4, '-').split('');
                      letters[index] = axis.left;
                      return { ...prev, mbti: letters.join('') };
                    })
                  }
                  className={`rounded-lg py-1 text-sm font-bold ${
                    current === axis.left
                      ? 'bg-[#E8526A] text-white'
                      : 'bg-[#FDE8EC] text-[#8C7A8E]'
                  }`}
                >
                  {axis.left}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => {
                      if (!prev) return prev;
                      const letters = prev.mbti.padEnd(4, '-').split('');
                      letters[index] = axis.right;
                      return { ...prev, mbti: letters.join('') };
                    })
                  }
                  className={`rounded-lg py-1 text-sm font-bold ${
                    current === axis.right
                      ? 'bg-[#E8526A] text-white'
                      : 'bg-[#FDE8EC] text-[#8C7A8E]'
                  }`}
                >
                  {axis.right}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {row(
        'have',
        '나의 매력',
        joinLabels(survey.have),
        charmsLoading ? (
          <p className="text-xs text-[#8C7A8E]">매력 태그 불러오는 중…</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {charms.map((charm) => {
              const selected = draft?.haveCharmIds.includes(charm.charm_id);
              return (
                <button
                  key={charm.charm_id}
                  type="button"
                  onClick={() =>
                    setDraft((prev) => {
                      if (!prev) return prev;
                      const has = prev.haveCharmIds.includes(charm.charm_id);
                      return {
                        ...prev,
                        haveCharmIds: has
                          ? prev.haveCharmIds.filter((id) => id !== charm.charm_id)
                          : [...prev.haveCharmIds, charm.charm_id],
                      };
                    })
                  }
                  className={charmChipClass(Boolean(selected))}
                >
                  {charm.name}
                </button>
              );
            })}
          </div>
        )
      )}

      {row(
        'exHave',
        '추가 매력',
        survey.ex_have || '없음',
        <textarea
          rows={3}
          maxLength={300}
          value={draft?.exHave ?? ''}
          onChange={(e) =>
            setDraft((prev) =>
              prev ? { ...prev, exHave: e.target.value } : prev
            )
          }
          className="w-full px-3 py-2 border border-[#F0D9DF] rounded-xl bg-[#FDE8EC] text-[15px] outline-none focus:border-[#E8526A] focus:bg-white resize-none"
        />
      )}

      {row(
        'want',
        '이상형',
        joinLabels(survey.want),
        charmsLoading ? (
          <p className="text-xs text-[#8C7A8E]">매력 태그 불러오는 중…</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {charms.map((charm) => {
              const selected = draft?.wantCharmIds.includes(charm.charm_id);
              return (
                <button
                  key={charm.charm_id}
                  type="button"
                  onClick={() =>
                    setDraft((prev) => {
                      if (!prev) return prev;
                      const has = prev.wantCharmIds.includes(charm.charm_id);
                      return {
                        ...prev,
                        wantCharmIds: has
                          ? prev.wantCharmIds.filter((id) => id !== charm.charm_id)
                          : [...prev.wantCharmIds, charm.charm_id],
                      };
                    })
                  }
                  className={charmChipClass(Boolean(selected))}
                >
                  {charm.name}
                </button>
              );
            })}
          </div>
        )
      )}

      {row(
        'exWant',
        '추가 이상형',
        survey.ex_want || '없음',
        <textarea
          rows={3}
          maxLength={300}
          value={draft?.exWant ?? ''}
          onChange={(e) =>
            setDraft((prev) =>
              prev ? { ...prev, exWant: e.target.value } : prev
            )
          }
          className="w-full px-3 py-2 border border-[#F0D9DF] rounded-xl bg-[#FDE8EC] text-[15px] outline-none focus:border-[#E8526A] focus:bg-white resize-none"
        />
      )}
    </div>
  );
}
