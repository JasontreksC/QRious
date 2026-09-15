import { NextRequest, NextResponse } from 'next/server';
import { identityIsAdmin } from '@/lib/admin-auth';
import { currentRegistrationRound } from '@/lib/deadline';
import { loadEventTimes } from '@/lib/event-schedule';
import { getSql } from '@/lib/db';
import { studentHasMatchByIdentity } from '@/lib/match-result';
import { listStudentRounds, loadRoundSubmittedAts } from '@/lib/own-survey';
import { formatKrPhone } from '@/lib/phone';
import { getSessionFromRequest } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  let submitted = false;
  let matched = false;
  let rounds: number[] = [];
  let round1SubmittedAt: string | null = null;
  let round2SubmittedAt: string | null = null;
  try {
    const sql = getSql();
    const times = await loadEventTimes(sql);
    rounds = await listStudentRounds(sql, session);
    const submittedAts = await loadRoundSubmittedAts(sql, session);
    round1SubmittedAt = submittedAts[1];
    round2SubmittedAt = submittedAts[2];
    const currentRound = currentRegistrationRound(Date.now(), times);
    submitted =
      currentRound != null ? rounds.includes(currentRound) : rounds.length > 0;
    matched = await studentHasMatchByIdentity(session, sql);
  } catch (err) {
    console.error('GET /api/auth/session', err);
  }

  return NextResponse.json({
    authenticated: true,
    name: session.name,
    phone: formatKrPhone(session.phone),
    birth: session.birth,
    submitted,
    rounds,
    round1SubmittedAt,
    round2SubmittedAt,
    matched,
    isAdmin: await identityIsAdmin(session),
  });
}
