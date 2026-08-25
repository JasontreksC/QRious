'use client';

import React, { useEffect, useState } from 'react';
import {
  createCharm,
  deleteCharm,
  getCharms,
  ApiError,
  type Charm,
} from '@/lib/api';

export default function AdminCharmsPage() {
  const [charms, setCharms] = useState<Charm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newCharm, setNewCharm] = useState('');
  const [busy, setBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
  };

  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => setShowToast(false), 2800);
    return () => clearTimeout(timer);
  }, [showToast]);

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

  const handleAddCharm = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCharm.trim();
    if (!name) return;
    setBusy(true);
    setError('');
    try {
      const created = await createCharm(name);
      setCharms((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      );
      setNewCharm('');
      triggerToast('매력 태그를 추가했어요.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '추가에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCharm = async (charm: Charm) => {
    if (!window.confirm(`"${charm.name}" 태그를 삭제할까요?`)) return;
    setBusy(true);
    setError('');
    try {
      await deleteCharm(charm.charm_id);
      setCharms((prev) => prev.filter((c) => c.charm_id !== charm.charm_id));
      triggerToast('매력 태그를 삭제했어요.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '삭제에 실패했습니다.');
    } finally {
      setBusy(false);
    }
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
            className="flex-1 px-4 py-3 border border-[#F0D9DF] rounded-xl text-[16px] bg-[#FDE8EC] outline-none placeholder-[#C9B0BE] focus:border-[#E8526A] focus:bg-white"
          />
          <button
            type="submit"
            disabled={busy || !newCharm.trim()}
            className="px-4 py-3 rounded-xl bg-[#E8526A] text-white font-bold text-sm disabled:opacity-50"
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
                  disabled={busy}
                  onClick={() => handleDeleteCharm(charm)}
                  className="text-[#E8526A] hover:text-[#d1445b] disabled:opacity-50"
                  aria-label={`${charm.name} 삭제`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#2B1B2E] text-white px-5 py-2.5 rounded-full text-sm font-medium z-[100] transition-all duration-300 pointer-events-none ${
          showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}
      >
        {toastMessage}
      </div>
    </>
  );
}
