const BIRTH_RE = /^\d{6}$/;

export function birthDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 6);
}

export function parseBirthDate(yymmdd: string, now = new Date()): Date | null {
  if (!BIRTH_RE.test(yymmdd)) return null;
  const yy = Number(yymmdd.slice(0, 2));
  const mm = Number(yymmdd.slice(2, 4));
  const dd = Number(yymmdd.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const year = yy <= now.getFullYear() % 100 ? 2000 + yy : 1900 + yy;
  const date = new Date(year, mm - 1, dd);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== mm - 1 ||
    date.getDate() !== dd
  ) {
    return null;
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date > today) return null;
  return date;
}

export function normalizeBirth(raw: string): string | null {
  const digits = birthDigits(raw);
  return parseBirthDate(digits) ? digits : null;
}

export function isValidBirth(raw: string): boolean {
  return normalizeBirth(raw) != null;
}

export function birthToAge(yymmdd: string, now = new Date()): number | null {
  const date = parseBirthDate(yymmdd, now);
  if (!date) return null;
  let age = now.getFullYear() - date.getFullYear();
  const monthDelta = now.getMonth() - date.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < date.getDate())) {
    age -= 1;
  }
  return age;
}

export function formatBirth(yymmdd: string): string {
  const digits = birthDigits(yymmdd);
  if (digits.length !== 6) return yymmdd;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 6)}`;
}
