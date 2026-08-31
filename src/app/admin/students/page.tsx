'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  deleteAdminStudent,
  downloadAdminStudentsXlsx,
  getAdminStudents,
  ApiError,
  type AdminStudent,
} from '@/lib/api';

const PAGE_SIZES = [10, 20, 30, 50] as const;

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const list = await getAdminStudents();
        if (!cancelled) setStudents(list);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : '참가자 목록을 불러오지 못했습니다.'
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.student_id.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
    );
  }, [students, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    setPage(1);
    setExpandedId(null);
  }, [query]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const rangeStart =
    filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, filtered.length);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
    setExpandedId(null);
  };

  const handleDelete = async (student: AdminStudent) => {
    if (
      !window.confirm(
        `${student.name} (${student.student_id}) 참가자를 삭제할까요?`
      )
    ) {
      return;
    }
    setBusyId(student.student_id);
    setError('');
    try {
      await deleteAdminStudent(student.student_id);
      setStudents((prev) =>
        prev.filter((s) => s.student_id !== student.student_id)
      );
      if (expandedId === student.student_id) setExpandedId(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : '삭제에 실패했습니다.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      await downloadAdminStudentsXlsx(query);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : '엑셀 다운로드에 실패했습니다.'
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="h-full min-h-0 bg-white border border-[#F0D9DF] rounded-2xl shadow-sm flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[#F0D9DF] shrink-0">
        <div>
          <h2 className="text-lg font-bold">참가자 목록</h2>
          <p className="text-xs text-[#8C7A8E] mt-0.5">
            {query.trim()
              ? `검색 ${filtered.length}명 / 전체 ${students.length}명`
              : `${students.length}명`}
            {filtered.length > 0 && ` · ${rangeStart}–${rangeEnd}번째 표시`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름 또는 학번 검색"
            className="w-44 sm:w-56 px-3 py-2 rounded-lg border border-[#F0D9DF] bg-[#FDE8EC] text-sm outline-none placeholder-[#C9B0BE] focus:border-[#E8526A] focus:bg-white"
          />
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || students.length === 0}
            className="px-3 py-2 rounded-lg text-xs font-bold border border-[#F0D9DF] bg-white text-[#2B1B2E] hover:bg-[#FDE8EC] disabled:opacity-40"
          >
            {exporting ? '만드는 중…' : 'xlsx 다운로드'}
          </button>
          <label className="flex items-center gap-2 text-xs font-semibold text-[#8C7A8E]">
            페이지당
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-2 py-1.5 rounded-lg border border-[#F0D9DF] bg-[#FDE8EC] text-[#2B1B2E] outline-none focus:border-[#E8526A]"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}명
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <p className="p-5 text-sm text-[#8C7A8E]">불러오는 중…</p>
        ) : error && students.length === 0 ? (
          <p className="p-5 text-sm text-[#E8526A]">{error}</p>
        ) : students.length === 0 ? (
          <p className="p-5 text-sm text-[#8C7A8E]">아직 참가자가 없습니다.</p>
        ) : filtered.length === 0 ? (
          <p className="p-5 text-sm text-[#8C7A8E]">검색 결과가 없습니다.</p>
        ) : (
          <table className="w-full min-w-[720px] text-sm text-left">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-xs uppercase tracking-wider text-[#8C7A8E] border-b border-[#F0D9DF]">
                <th className="py-2 px-5 font-semibold">학번</th>
                <th className="py-2 pr-3 font-semibold">이름</th>
                <th className="py-2 pr-3 font-semibold">전화번호</th>
                <th className="py-2 pr-3 font-semibold">성별</th>
                <th className="py-2 pr-3 font-semibold">나이</th>
                <th className="py-2 pr-3 font-semibold">MBTI</th>
                <th className="py-2 px-5 font-semibold text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((student) => {
                const open = expandedId === student.student_id;
                return (
                  <React.Fragment key={student.student_id}>
                    <tr className="border-b border-[#F0D9DF]/80">
                      <td className="py-3 px-5 font-mono text-[13px]">
                        {student.student_id}
                      </td>
                      <td className="py-3 pr-3">{student.name}</td>
                      <td className="py-3 pr-3 font-mono text-[13px]">
                        {student.phone || '-'}
                      </td>
                      <td className="py-3 pr-3">
                        {student.gender ? '여자' : '남자'}
                      </td>
                      <td className="py-3 pr-3">{student.age ?? '-'}</td>
                      <td className="py-3 pr-3">{student.mbti || '-'}</td>
                      <td className="py-3 px-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(open ? null : student.student_id)
                            }
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#F0D9DF] bg-[#FDE8EC] text-[#E8526A] hover:bg-[#fcdde3]"
                          >
                            {open ? '닫기' : '추가 정보'}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === student.student_id}
                            onClick={() => handleDelete(student)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#F0D9DF] bg-white text-[#8C7A8E] hover:bg-[#FEF0F2] hover:text-[#E8526A] disabled:opacity-40"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                    {open && (
                      <tr className="bg-[#FDE8EC]/50">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <DetailBlock
                              title="have (나의 매력)"
                              tags={student.have}
                            />
                            <DetailBlock
                              title="want (이상형)"
                              tags={student.want}
                            />
                            <p className="text-xs leading-relaxed">
                              <span className="font-semibold text-[#8C7A8E]">
                                ex_have
                              </span>
                              <br />
                              {student.ex_have || '없음'}
                            </p>
                            <p className="text-xs leading-relaxed">
                              <span className="font-semibold text-[#8C7A8E]">
                                ex_want
                              </span>
                              <br />
                              {student.ex_want || '없음'}
                            </p>
                            <p className="text-xs leading-relaxed sm:col-span-2">
                              <span className="font-semibold text-[#8C7A8E]">
                                개인정보 수집·이용 동의
                              </span>
                              <br />
                              {student.consent_agreed === true
                                ? '동의'
                                : '미확인'}
                              {student.consented_at
                                ? ` · ${new Date(student.consented_at).toLocaleString(
                                    'ko-KR',
                                    { timeZone: 'Asia/Seoul' }
                                  )}`
                                : ''}
                              {student.consent_version
                                ? ` · 버전 ${student.consent_version}`
                                : ''}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {error && students.length > 0 && (
        <p className="px-5 py-2 text-xs text-[#E8526A] border-t border-[#F0D9DF] shrink-0">
          {error}
        </p>
      )}

      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-[#F0D9DF] shrink-0 bg-white">
          <p className="text-xs text-[#8C7A8E]">
            {page} / {totalPages} 페이지
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                setExpandedId(null);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#F0D9DF] bg-[#FDE8EC] disabled:opacity-40"
            >
              이전
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => {
                setPage((p) => Math.min(totalPages, p + 1));
                setExpandedId(null);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#F0D9DF] bg-[#FDE8EC] disabled:opacity-40"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function DetailBlock({ title, tags }: { title: string; tags: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#8C7A8E] mb-1.5">{title}</p>
      {tags.length === 0 ? (
        <p className="text-xs">없음</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 rounded-full bg-white border border-[#F0D9DF] text-xs font-semibold"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
