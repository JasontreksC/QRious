import type { Sql } from '@/lib/db';
import type { AdminStudent } from '@/lib/api';
import { isThirdPartyConsentVersion } from '@/lib/consent-notice';

export async function fetchJoinedStudents(sql: Sql): Promise<AdminStudent[]> {
  const [students, haves, wants, exHaves, exWants, consents, agePrefs] = await Promise.all([
    sql`
      SELECT
        s.student_id,
        r.registration_id,
        r.round,
        s.name,
        s.phone,
        s.gender,
        s.birth,
        r.mbti,
        m.name AS major
      FROM registration r
      JOIN student s ON s.student_id = r.student_id
      LEFT JOIN major m ON m.major_id = s.major_id
      ORDER BY r.registration_id ASC
    `,
    sql`
      SELECT h.registration_id, c.name
      FROM have h
      JOIN charm c ON c.charm_id = h.charm_id
      ORDER BY c.name ASC
    `,
    sql`
      SELECT w.registration_id, c.name
      FROM want w
      JOIN charm c ON c.charm_id = w.charm_id
      ORDER BY c.name ASC
    `,
    sql`SELECT registration_id, charm FROM ex_have`,
    sql`SELECT registration_id, charm FROM ex_want`,
    sql`
      SELECT registration_id, agreed, consented_at, notice_version
      FROM consent
      ORDER BY consented_at DESC
    `,
    sql`
      SELECT p.registration_id, a.name, a.sort_order
      FROM prefer_age p
      JOIN age_pref a ON a.age_pref_id = p.age_pref_id
      ORDER BY a.sort_order ASC
    `,
  ]);

  const haveMap = new Map<string, string[]>();
  for (const row of haves) {
    const id = String(row.registration_id);
    const list = haveMap.get(id) ?? [];
    list.push(String(row.name ?? ''));
    haveMap.set(id, list);
  }

  const wantMap = new Map<string, string[]>();
  for (const row of wants) {
    const id = String(row.registration_id);
    const list = wantMap.get(id) ?? [];
    list.push(String(row.name ?? ''));
    wantMap.set(id, list);
  }

  const exHaveMap = new Map<string, string>();
  for (const row of exHaves) {
    exHaveMap.set(String(row.registration_id), String(row.charm ?? ''));
  }

  const exWantMap = new Map<string, string>();
  for (const row of exWants) {
    exWantMap.set(String(row.registration_id), String(row.charm ?? ''));
  }

  const agePrefMap = new Map<string, string[]>();
  for (const row of agePrefs) {
    const id = String(row.registration_id);
    const list = agePrefMap.get(id) ?? [];
    list.push(String(row.name ?? ''));
    agePrefMap.set(id, list);
  }

  type ConsentRow = { agreed: boolean; consented_at: string; version: string };
  const consentMap = new Map<string, ConsentRow>();
  const thirdPartyMap = new Map<string, ConsentRow>();
  for (const row of consents) {
    const id = String(row.registration_id);
    const entry: ConsentRow = {
      agreed: Boolean(row.agreed),
      consented_at: row.consented_at
        ? new Date(String(row.consented_at)).toISOString()
        : '',
      version: String(row.notice_version ?? ''),
    };
    if (isThirdPartyConsentVersion(entry.version)) {
      if (!thirdPartyMap.has(id)) thirdPartyMap.set(id, entry);
    } else if (!consentMap.has(id)) {
      consentMap.set(id, entry);
    }
  }

  return students.map((row) => {
    const id = String(row.registration_id);
    return {
      student_id: String(row.student_id),
      registration_id: id,
      round: Number(row.round) === 2 ? 2 : 1,
      name: row.name ?? '',
      phone: row.phone ?? '',
      gender: Boolean(row.gender),
      birth: row.birth ? String(row.birth) : null,
      mbti: row.mbti ?? '',
      major: row.major ? String(row.major) : null,
      age_prefs: agePrefMap.get(id) ?? [],
      have: haveMap.get(id) ?? [],
      want: wantMap.get(id) ?? [],
      ex_have: exHaveMap.get(id) || null,
      ex_want: exWantMap.get(id) || null,
      consent_agreed: consentMap.get(id)?.agreed ?? null,
      consented_at: consentMap.get(id)?.consented_at || null,
      consent_version: consentMap.get(id)?.version || null,
      third_party_consent_agreed: thirdPartyMap.get(id)?.agreed ?? null,
      third_party_consented_at: thirdPartyMap.get(id)?.consented_at || null,
      third_party_consent_version: thirdPartyMap.get(id)?.version || null,
    };
  });
}

export function filterStudents(
  students: AdminStudent[],
  query: string
): AdminStudent[] {
  const q = query.trim().toLowerCase();
  if (!q) return students;
  return students.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.phone.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
      (s.birth ?? '').includes(q.replace(/\D/g, '')) ||
      (s.major ?? '').toLowerCase().includes(q)
  );
}
