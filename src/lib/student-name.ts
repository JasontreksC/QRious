const STUDENT_NAME_RE = /^(.+?)\(\s*학생\s*\)\s*$/;

export const STUDENT_NAME_MIN = 2;
export const STUDENT_NAME_MAX = 20;

export function parseSubmittedName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < STUDENT_NAME_MIN || name.length > STUDENT_NAME_MAX) {
    return null;
  }
  return name;
}

export function parseStudentDisplayName(raw: string): string | null {
  const match = raw.trim().match(STUDENT_NAME_RE);
  const name = match?.[1]?.trim() ?? '';
  return name.length >= 2 ? name : null;
}
