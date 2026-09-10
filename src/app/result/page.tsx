import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { emailIsAdmin } from '@/lib/admin-auth';
import { getSessionFromCookies } from '@/lib/google-auth';
import { loadMatchPartnerByEmail } from '@/lib/match-result';
import { MatchResultScreen } from '../match-result-screen';

export const metadata: Metadata = {
  title: '매칭 결과 - QRious',
  description: '매칭된 상대의 이름, 학과, 연락처를 안내합니다.',
};

export default async function MatchResultPage() {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect('/');
  }

  const partner = await loadMatchPartnerByEmail(session.email);
  if (!partner) {
    redirect('/');
  }

  const isAdmin = await emailIsAdmin(session.email);

  return (
    <MatchResultScreen
      partner={partner}
      isAdmin={isAdmin}
      account={{
        name: session.name,
        email: session.email,
        picture: session.picture,
      }}
    />
  );
}
