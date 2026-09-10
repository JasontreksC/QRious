'use client';

import { useState } from 'react';
import Link from 'next/link';
import { logoutGoogle, type MatchPartner } from '@/lib/api';
import { parseStudentDisplayName } from '@/lib/student-name';
import { PixelHeart, QriousWordmark } from './qrious-wordmark';
import { SiteHeader } from './site-header';
import styles from './y2k-theme.module.css';

type MatchResultScreenProps = {
  partner: MatchPartner;
  isAdmin: boolean;
  account: {
    name: string;
    email: string;
    picture: string | null;
  };
};

export function MatchResultScreen({
  partner,
  isAdmin,
  account,
}: MatchResultScreenProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutGoogle();
    } finally {
      window.location.href = '/';
    }
  };

  const genderLabel = partner.gender ? '여자' : '남자';
  const meta = [
    genderLabel,
    partner.age != null ? `${partner.age}세` : null,
    partner.mbti || null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className={`${styles.y2kPage} min-h-screen text-[#2B1B2E] font-sans pb-16`}
    >
      <div className={styles.decorScene} aria-hidden="true">
        <span className={`${styles.orb} ${styles.orbOne}`} />
        <span className={`${styles.orb} ${styles.orbTwo}`} />
      </div>
      <SiteHeader onLogout={handleLogout} loggingOut={loggingOut} />
      {isAdmin ? (
        <Link
          href="/admin"
          className={`${styles.sessionChipRight} px-3 py-2 rounded-xl text-xs font-bold tracking-wide bg-white/90 border border-[#F0D9DF] text-[#8C7A8E] shadow-sm hover:bg-[#FDE8EC] hover:text-[#E8526A]`}
        >
          관리자
        </Link>
      ) : null}
      <div
        className={`${styles.pageContent} max-w-[480px] mx-auto px-4 pt-6 pb-12`}
      >
        <div className={styles.resultCardStage}>
          <PixelHeart className={styles.resultFloatHeartA} />
          <PixelHeart className={styles.resultFloatHeartB} />
          <PixelHeart className={styles.resultFloatHeartC} />
          <PixelHeart className={styles.resultFloatHeartD} />
          <PixelHeart className={styles.resultFloatHeartE} />
          <PixelHeart className={styles.resultFloatHeartF} />
          <PixelHeart className={styles.resultFloatHeartG} />
          <PixelHeart className={styles.resultFloatHeartH} />
          <div className={`${styles.hero} ${styles.resultHero} text-center`}>
            <h1 className={styles.heroTitle} aria-label="QRious 매칭 결과">
              <QriousWordmark />
            </h1>
          </div>
          <div className={styles.resultCard}>
          <div className="mb-5 flex items-center gap-3 rounded-xl bg-[#FDE8EC] border border-[#F0D9DF] px-3 py-2.5 text-left">
            {account.picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={account.picture}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 rounded-full object-cover bg-white"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-[#E8526A]">
                {parseStudentDisplayName(account.name)?.slice(0, 1) ||
                  account.name.slice(0, 1)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#2B1B2E]">
                {account.name}
              </p>
              <p className="truncate text-xs text-[#8C7A8E]">{account.email}</p>
            </div>
          </div>
          <p className={styles.resultEyebrow}>YOU&apos;VE GOT LOVE</p>
          <div className="text-[52px] leading-none mt-2" aria-hidden="true">
            💌
          </div>
          <h2 className={styles.resultTitle}>매칭 완료</h2>
          <p className={styles.resultLead}>
            축제에서 만날 상대를 찾았어요.
            <br />
            먼저 연락해보세요!
          </p>
          <p className={styles.resultName}>{partner.name}</p>
          {partner.major ? (
            <p className={styles.resultMajor}>{partner.major}</p>
          ) : null}
          {meta ? <p className={styles.resultMeta}>{meta}</p> : null}
          {partner.phone ? (
            <a href={`tel:${partner.phone}`} className={styles.resultPhone}>
              {partner.phone}
            </a>
          ) : null}
          {partner.have.length > 0 ? (
            <div className={styles.resultTags}>
              {partner.have.map((tag) => (
                <span key={tag} className={styles.resultTag}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          <p className={styles.resultNote}>
            매칭된 상대방과 컴소과 주점에 와서 이 페이지를 보여주면 할인해드려요!
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}
