'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getAuthSession, type AuthSession } from '@/lib/api';

const TABS = [
  { href: '/admin/students', label: '참가자 목록' },
  { href: '/admin/stats', label: '일별 통계' },
  { href: '/admin/schedule', label: '일정' },
  { href: '/admin/charms', label: 'Charm 태그' },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await getAuthSession();
        if (!cancelled) setSession(next);
      } catch {
        if (!cancelled) setSession({ authenticated: false });
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const authenticated = Boolean(session?.authenticated && session.isAdmin);

  return (
    <div className="h-screen bg-[#FBF6F0] text-[#2B1B2E] font-sans flex flex-col">
      <div className="max-w-5xl mx-auto w-full px-4 pt-8 pb-4 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-wider uppercase text-[#8C7A8E]">
              QRious
            </p>
            <h1 className="text-2xl font-bold text-[#E8526A] mt-1">관리자</h1>
          </div>
          <Link
            href="/"
            className="px-3 py-2 rounded-xl text-sm font-semibold border border-[#F0D9DF] bg-white text-[#8C7A8E] hover:bg-[#FDE8EC]"
          >
            설문으로
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-4 flex-1 min-h-0 flex flex-col pb-6">
        {checking ? (
          <div className="bg-white border border-[#F0D9DF] rounded-2xl p-8 text-center text-sm text-[#8C7A8E]">
            확인 중…
          </div>
        ) : !authenticated ? (
          <div className="bg-white border border-[#F0D9DF] rounded-2xl p-6 shadow-sm max-w-md text-center">
            <p className="text-sm text-[#8C7A8E] leading-relaxed">
              {session?.authenticated
                ? '이 계정은 관리자 권한이 없어요.'
                : '홈에서 이름과 전화번호로 로그인한 뒤, 관리자 전화번호로 등록된 계정만 이 페이지를 볼 수 있어요.'}
            </p>
            {!session?.authenticated && (
              <Link
                href="/"
                className="mt-5 w-full inline-flex items-center justify-center min-h-[48px] px-5 py-3 rounded-xl bg-gradient-to-r from-[#E8526A] to-[#F28C6E] text-white font-bold"
              >
                홈에서 로그인
              </Link>
            )}
          </div>
        ) : (
          <>
            <nav className="flex gap-1 p-1 mb-4 rounded-2xl bg-white border border-[#F0D9DF] shrink-0">
              {TABS.map((tab) => {
                const active = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`flex-1 text-center py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-[#E8526A] text-white shadow-sm'
                        : 'text-[#8C7A8E] hover:bg-[#FDE8EC]'
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
            <div className="flex-1 min-h-0">{children}</div>
          </>
        )}
      </div>
    </div>
  );
}
