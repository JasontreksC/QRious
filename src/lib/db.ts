import { neon } from '@neondatabase/serverless';

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      'DATABASE_URL이 설정되지 않았습니다. .env.local에 Neon 연결 문자열을 넣어 주세요.'
    );
  }
  return url;
}

/** Neon SQL client (HTTP). Use only on the server. */
export function getSql() {
  return neon(getDatabaseUrl());
}

export type Sql = ReturnType<typeof getSql>;
