import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { emailIsAdmin } from '@/lib/admin-auth';
import { EVENT_TIMES, formatKstMonthDayTime, getRound2CtaState, isAwaitingAnnouncement } from '@/lib/deadline';
import { getSessionFromCookies } from '@/lib/google-auth';
import { getSql } from '@/lib/db';
import { loadMatchPartnerByEmail } from '@/lib/match-result';
import { studentHasRoundByEmail } from '@/lib/own-survey';
import { MatchResultScreen } from '../match-result-screen';

export const metadata: Metadata = {
  title: '매칭 결과 - QRious',
  description: '매칭된 상대의 이름, 학과, 연락처를 안내합니다.',
};

export default async function MatchResultPage() {
  if (isAwaitingAnnouncement()) {
    redirect('/');
  }

  const session = await getSessionFromCookies();
  if (!session) {
    redirect('/');
  }

  const sql = getSql();
  const partner = await loadMatchPartnerByEmail(session.email, sql);
  if (!partner) {
    redirect('/');
  }

  const isAdmin = await emailIsAdmin(session.email);
  const hasRound2 = await studentHasRoundByEmail(session.email, 2, sql);
  const round2Cta = getRound2CtaState(hasRound2);

  return (
    <MatchResultScreen
      partner={partner}
      isAdmin={isAdmin}
      round2Cta={round2Cta}
      round2OpenLabel={formatKstMonthDayTime(EVENT_TIMES.round2Open)}
      account={{
        name: session.name,
        email: session.email,
        picture: session.picture,
      }}
    />
  );
}
