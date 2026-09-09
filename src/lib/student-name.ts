const STUDENT_NAME_RE = /^(.+?)\(\s*학생\s*\)\s*$/;

export function parseStudentDisplayName(raw: string): string | null {
  const match = raw.trim().match(STUDENT_NAME_RE);
  const name = match?.[1]?.trim() ?? '';
  return name.length >= 2 ? name : null;
}
