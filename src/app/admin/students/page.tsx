'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { getAdminStudents, ApiError, type AdminStudent } from '@/lib/api';

const PAGE_SIZES = [10, 20, 30, 50] as const;

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(students.length / pageSize));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return students.slice(start, start + pageSize);
  }, [students, page, pageSize]);

  const rangeStart =
    students.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, students.length);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
    setExpandedId(null);
  };

  return (
    <section className="h-full min-h-0 bg-white border border-[#F0D9DF] rounded-2xl shadow-sm flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[#F0D9DF] shrink-0">
        <div>
          <h2 className="text-lg font-bold">참가자 목록</h2>
          <p className="text-xs text-[#8C7A8E] mt-0.5">
            {students.length}명
            {students.length > 0 &&
              ` · ${rangeStart}–${rangeEnd}번째 표시`}
          </p>
        </div>
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

      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <p className="p-5 text-sm text-[#8C7A8E]">불러오는 중…</p>
        ) : error ? (
          <p className="p-5 text-sm text-[#E8526A]">{error}</p>
        ) : students.length === 0 ? (
          <p className="p-5 text-sm text-[#8C7A8E]">아직 참가자가 없습니다.</p>
        ) : (
          <table className="w-full min-w-[640px] text-sm text-left">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-xs uppercase tracking-wider text-[#8C7A8E] border-b border-[#F0D9DF]">
                <th className="py-2 px-5 font-semibold">학번</th>
                <th className="py-2 pr-3 font-semibold">이름</th>
                <th className="py-2 pr-3 font-semibold">성별</th>
                <th className="py-2 pr-3 font-semibold">나이</th>
                <th className="py-2 pr-3 font-semibold">MBTI</th>
                <th className="py-2 px-5 font-semibold text-right">추가 정보</th>
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
                      <td className="py-3 pr-3">
                        {student.gender ? '여자' : '남자'}
                      </td>
                      <td className="py-3 pr-3">{student.age ?? '-'}</td>
                      <td className="py-3 pr-3">{student.mbti || '-'}</td>
                      <td className="py-3 px-5 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(open ? null : student.student_id)
                          }
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#F0D9DF] bg-[#FDE8EC] text-[#E8526A] hover:bg-[#fcdde3]"
                        >
                          {open ? '닫기' : '추가 정보'}
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr className="bg-[#FDE8EC]/50">
                        <td colSpan={6} className="px-5 py-4">
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

      {students.length > 0 && (
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
