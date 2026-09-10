import { redirect } from 'next/navigation';
import { currentRegistrationRound, isAwaitingAnnouncement } from '@/lib/deadline';
import { getSessionFromCookies } from '@/lib/google-auth';
import { studentHasMatchByEmail } from '@/lib/match-result';
import Home from './home-client';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ apply?: string }>;
}) {
  if (isAwaitingAnnouncement()) {
    return <Home applyRound2={false} />;
  }

  const session = await getSessionFromCookies();
  const { apply } = await searchParams;
  const applyRound2 = apply === '2' && currentRegistrationRound() === 2;

  if (
    session &&
    !applyRound2 &&
    (await studentHasMatchByEmail(session.email))
  ) {
    redirect('/result');
  }
  return <Home applyRound2={applyRound2} />;
}
