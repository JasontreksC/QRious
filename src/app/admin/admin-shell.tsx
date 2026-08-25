'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { adminLogin, adminLogout, getAdminSession, ApiError } from '@/lib/api';

const TABS = [
  { href: '/admin/students', label: '참가자 목록' },
  { href: '/admin/charms', label: 'Charm 태그' },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await getAdminSession();
        if (!cancelled) setAuthenticated(session.authenticated);
      } catch {
        if (!cancelled) setAuthenticated(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      await adminLogin(password);
      setAuthenticated(true);
      setPassword('');
      router.replace('/admin/students');
      router.refresh();
    } catch (err) {
      setLoginError(
        err instanceof ApiError ? err.message : '로그인에 실패했습니다.'
      );
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await adminLogout();
    setAuthenticated(false);
    router.replace('/admin/students');
  };

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
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-3 py-2 rounded-xl text-sm font-semibold border border-[#F0D9DF] bg-white text-[#8C7A8E] hover:bg-[#FDE8EC]"
            >
              설문으로
            </Link>
            {authenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-2 rounded-xl text-sm font-semibold border border-[#F0D9DF] bg-white text-[#E8526A] hover:bg-[#FEF0F2]"
              >
                로그아웃
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-4 flex-1 min-h-0 flex flex-col pb-6">
        {checking ? (
          <div className="bg-white border border-[#F0D9DF] rounded-2xl p-8 text-center text-sm text-[#8C7A8E]">
            확인 중…
          </div>
        ) : !authenticated ? (
          <form
            onSubmit={handleLogin}
            className="bg-white border border-[#F0D9DF] rounded-2xl p-6 shadow-sm max-w-md"
          >
            <label
              htmlFor="admin-password"
              className="text-xs font-semibold tracking-wider uppercase text-[#8C7A8E]"
            >
              관리자 비밀번호
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력해 주세요"
              className="mt-2 w-full px-4 py-3 border border-[#F0D9DF] rounded-xl text-[16px] bg-[#FDE8EC] outline-none placeholder-[#C9B0BE] focus:border-[#E8526A] focus:bg-white focus:ring-3 focus:ring-[#E8526A]/10"
            />
            {loginError && (
              <p className="mt-2 text-xs text-[#E8526A]">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={loggingIn || !password}
              className="mt-4 w-full min-h-[48px] py-3 rounded-xl bg-gradient-to-r from-[#E8526A] to-[#F28C6E] text-white font-bold disabled:opacity-50"
            >
              {loggingIn ? '확인 중…' : '입장하기'}
            </button>
          </form>
        ) : (
          <>
            <nav className="flex gap-1 p-1 mb-4 rounded-2xl bg-white border border-[#F0D9DF] shrink-0">
              {TABS.map((tab) => {
                const active = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`flex-1 text-center py-2.5 rounded-xl text-sm font-bold transition-colors ${
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
