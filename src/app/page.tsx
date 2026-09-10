import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/google-auth';
import { studentHasMatchByEmail } from '@/lib/match-result';
import Home from './home-client';

export default async function HomePage() {
  const session = await getSessionFromCookies();
  if (session && (await studentHasMatchByEmail(session.email))) {
    redirect('/result');
  }
  return <Home />;
}
