import { redirect } from 'next/navigation';
import { EventTimesProvider } from './event-times-context';
import { currentRegistrationRound, isAwaitingAnnouncement } from '@/lib/deadline';
import { loadEventTimes } from '@/lib/event-schedule';
import { studentHasMatchByIdentity } from '@/lib/match-result';
import { getSessionFromCookies } from '@/lib/session';
import { getSql } from '@/lib/db';
import Home from './home-client';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ apply?: string }>;
}) {
  const times = await loadEventTimes();

  if (isAwaitingAnnouncement(Date.now(), times)) {
    return (
      <EventTimesProvider times={times}>
        <Home applyRound2={false} />
      </EventTimesProvider>
    );
  }

  const session = await getSessionFromCookies();
  const { apply } = await searchParams;
  const applyRound2 =
    apply === '2' && currentRegistrationRound(Date.now(), times) === 2;

  if (session && !applyRound2) {
    const sql = getSql();
    if (await studentHasMatchByIdentity(session, sql)) {
      redirect('/result');
    }
  }
  return (
    <EventTimesProvider times={times}>
      <Home applyRound2={applyRound2} />
    </EventTimesProvider>
  );
}
