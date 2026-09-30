import type { Sql } from '@/lib/db';
import { formatKrPhone, nameKey, phoneDigits } from '@/lib/phone';

export const STUDENT_NUMBER_LENGTH = 10;

export function parseStudentNumber(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!/^\d{10}$/.test(value)) return null;
  return value;
}

export function studentNumberDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, STUDENT_NUMBER_LENGTH);
}

export class StudentNumberConflict extends Error {
  constructor() {
    super('student_number_conflict');
    this.name = 'StudentNumberConflict';
  }
}

/** Point this person at the 10-digit student number, which is student.student_id. */
export async function adoptStudentNumber(
  sql: Sql,
  input: {
    studentNumber: string;
    name: string;
    phone: string;
    birth: string;
  }
): Promise<void> {
  const studentNumber = parseStudentNumber(input.studentNumber);
  if (!studentNumber) throw new Error('invalid_student_number');
  const phone = formatKrPhone(input.phone);
  const phoneNorm = phoneDigits(input.phone);

  const byId = await sql`
    SELECT student_id
    FROM student
    WHERE student_id = ${studentNumber}
    LIMIT 1
  `;
  if (byId.length > 0) {
    await sql`
      UPDATE student
      SET name = ${input.name},
          phone = ${phone},
          birth = ${input.birth}
      WHERE student_id = ${studentNumber}
    `;
    return;
  }

  const legacy = await sql`
    SELECT student_id
    FROM student
    WHERE lower(btrim(name)) = ${nameKey(input.name)}
      AND regexp_replace(phone, '[^0-9]', '', 'g') = ${phoneNorm}
    LIMIT 1
  `;
  if (legacy.length === 0) return;

  const oldId = String(legacy[0].student_id);
  if (oldId !== studentNumber && /^\d{10}$/.test(oldId)) {
    throw new StudentNumberConflict();
  }

  await sql`
    UPDATE student
    SET student_id = ${studentNumber},
        name = ${input.name},
        phone = ${phone},
        birth = ${input.birth}
    WHERE student_id = ${oldId}
  `;
}
