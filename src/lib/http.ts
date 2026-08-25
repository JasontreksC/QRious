import { NextResponse } from 'next/server';

export function jsonError(
  status: number,
  code: string,
  message: string
) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === '23505'
  );
}
