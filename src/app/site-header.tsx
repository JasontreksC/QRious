'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './y2k-theme.module.css';

const SHARE_TITLE = 'QRious';
const SHARE_TEXT =
  'QR 소개팅 사전 접수 — 축제에서 시작될 우리만의 러브 스토리를 만나보세요!';

type SiteHeaderProps = {
  onLogout?: () => void;
  loggingOut?: boolean;
};

export function SiteHeader({ onLogout, loggingOut = false }: SiteHeaderProps) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const handleShare = async () => {
    const url = window.location.href;
    const payload = { title: SHARE_TITLE, text: SHARE_TEXT, url };

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share(payload);
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (err instanceof Error && err.name === 'AbortError') return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setStatus('copied');
      window.setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      window.setTimeout(() => setStatus('idle'), 2500);
    }
  };

  const shareLabel =
    status === 'copied' ? '복사됨' : status === 'error' ? '다시 시도' : '공유';

  return (
    <header className={styles.siteHeader}>
      <div className={styles.siteHeaderInner}>
        <Link href="/" className={styles.siteBrand}>
          <Image
            src="/ysu-logo.svg"
            alt="영남대학교"
            width={28}
            height={28}
            className={styles.siteBrandLogo}
          />
          <span className={styles.siteBrandText}>컴퓨터소프트웨어과</span>
        </Link>
        <div className={styles.headerActions}>
          {onLogout ? (
            <button
              type="button"
              className={`${styles.headerChip} ${styles.headerChipLogout}`}
              onClick={onLogout}
              disabled={loggingOut}
            >
              {loggingOut ? '처리 중…' : '로그아웃'}
            </button>
          ) : null}
          <button
            type="button"
            className={`${styles.headerChip} ${styles.headerChipShare}`}
            onClick={() => void handleShare()}
            aria-label="이 페이지 공유하기"
          >
            <svg
              className={styles.shareIcon}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M12 4v11"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
              />
              <path
                d="M8.2 7.6 12 3.8l3.8 3.8"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6 11.5v7.2A1.8 1.8 0 0 0 7.8 20.5h8.4a1.8 1.8 0 0 0 1.8-1.8v-7.2"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
              />
            </svg>
            {shareLabel}
          </button>
        </div>
      </div>
    </header>
  );
}
