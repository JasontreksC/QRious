import { NextRequest, NextResponse } from 'next/server';
import { emailIsAdmin } from '@/lib/admin-auth';
import { currentRegistrationRound } from '@/lib/deadline';
import { loadEventTimes } from '@/lib/event-schedule';
import { getSql } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/google-auth';
import { studentHasMatchByEmail } from '@/lib/match-result';
import { listStudentRounds, loadRoundSubmittedAts } from '@/lib/own-survey';

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
    rounds = await listStudentRounds(sql, session.sub);
    const submittedAts = await loadRoundSubmittedAts(sql, session.sub);
    round1SubmittedAt = submittedAts[1];
    round2SubmittedAt = submittedAts[2];
    const currentRound = currentRegistrationRound(Date.now(), times);
    submitted =
      currentRound != null ? rounds.includes(currentRound) : rounds.length > 0;
    matched = await studentHasMatchByEmail(session.email, sql);
  } catch (err) {
    console.error('GET /api/auth/session', err);
  }

  return NextResponse.json({
    authenticated: true,
    email: session.email,
    name: session.name,
    picture: session.picture,
    submitted,
    rounds,
    round1SubmittedAt,
    round2SubmittedAt,
    matched,
    isAdmin: await emailIsAdmin(session.email),
  });
}
