'use client';

import React, { useEffect, useState } from 'react';
import { getCharms, ApiError, type Charm } from '@/lib/api';

export default function AdminCharmsPage() {
  const [charms, setCharms] = useState<Charm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newCharm, setNewCharm] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const list = await getCharms();
        if (!cancelled) setCharms(list);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : '매력 태그를 불러오지 못했습니다.'
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

  const handleAddCharm = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <>
      <section className="h-full min-h-0 bg-white border border-[#F0D9DF] rounded-2xl shadow-sm p-5 overflow-auto">
        <h2 className="text-lg font-bold mb-4">Charm 태그</h2>
        <form onSubmit={handleAddCharm} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newCharm}
            onChange={(e) => setNewCharm(e.target.value)}
            maxLength={40}
            placeholder="새 매력 이름"
            disabled
            className="flex-1 px-4 py-3 border border-[#F0D9DF] rounded-xl text-[16px] bg-[#FDE8EC] outline-none placeholder-[#C9B0BE] focus:border-[#E8526A] focus:bg-white disabled:opacity-60"
          />
          <button
            type="submit"
            disabled
            title="행사 진행 중에는 태그를 추가할 수 없습니다."
            className="px-4 py-3 rounded-xl bg-[#E8526A] text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            추가
          </button>
        </form>
        {error && <p className="mb-3 text-xs text-[#E8526A]">{error}</p>}
        {loading ? (
          <p className="text-sm text-[#8C7A8E]">불러오는 중…</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {charms.map((charm) => (
              <span
                key={charm.charm_id}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-[#FDE8EC] border border-[#F0D9DF] text-sm font-semibold"
              >
                {charm.name}
                <button
                  type="button"
                  disabled
                  title="행사 진행 중에는 태그를 삭제할 수 없습니다."
                  className="text-[#E8526A] disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`${charm.name} 삭제`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
