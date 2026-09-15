export function phoneDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function isValidKrPhone(value: string): boolean {
  return /^01[016789]\d{7,8}$/.test(phoneDigits(value));
}

export function formatKrPhone(value: string): string {
  const digits = phoneDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function normalizeStudentName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function nameKey(raw: string): string {
  return normalizeStudentName(raw).toLowerCase();
}
