import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { identityIsAdmin } from '@/lib/admin-auth';
import { formatKstMonthDayTime, getRound2CtaState, isAwaitingAnnouncement } from '@/lib/deadline';
import { loadEventTimes } from '@/lib/event-schedule';
import { getSessionFromCookies } from '@/lib/session';
import { getSql } from '@/lib/db';
import { loadMatchPartnerByIdentity } from '@/lib/match-result';
import { studentHasRoundByIdentity } from '@/lib/own-survey';
import { formatKrPhone } from '@/lib/phone';
import { MatchResultScreen } from '../match-result-screen';

export const metadata: Metadata = {
  title: '매칭 결과 - QRious',
  description: '매칭된 상대의 이름, 학과, 연락처를 안내합니다.',
};

export default async function MatchResultPage() {
  const sql = getSql();
  const times = await loadEventTimes(sql);

  if (isAwaitingAnnouncement(Date.now(), times)) {
    redirect('/');
  }

  const session = await getSessionFromCookies();
  if (!session) {
    redirect('/');
  }

  const partner = await loadMatchPartnerByIdentity(session, sql);
  if (!partner) {
    redirect('/');
  }

  const isAdmin = await identityIsAdmin(session);
  const hasRound2 = await studentHasRoundByIdentity(session, 2, sql);
  const round2Cta = getRound2CtaState(hasRound2, Date.now(), times);

  return (
    <MatchResultScreen
      partner={partner}
      isAdmin={isAdmin}
      round2Cta={round2Cta}
      round2OpenLabel={formatKstMonthDayTime(times.round2Open)}
      account={{
        name: session.name,
        phone: formatKrPhone(session.phone),
      }}
    />
  );
}
