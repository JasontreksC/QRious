import { setDefaultResultOrder } from 'node:dns';
import { neon, neonConfig } from '@neondatabase/serverless';

try {
  setDefaultResultOrder('ipv4first');
} catch {
  // Edge/runtime without dns order control.
}

function isTransientFetchError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const cause = (err as Error & { cause?: { code?: string; name?: string } })
    .cause;
  if (cause?.code === 'UND_ERR_CONNECT_TIMEOUT') return true;
  if (cause?.name === 'ConnectTimeoutError') return true;
  return err.message.includes('fetch failed');
}

async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const attempts = 3;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fetch(input, init);
    } catch (err) {
      lastError = err;
      const last = attempt === attempts - 1;
      if (!isTransientFetchError(err) || last) throw err;
      await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
    }
  }
  throw lastError;
}

neonConfig.fetchFunction = fetchWithRetry;

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      'DATABASE_URL이 설정되지 않았습니다. .env.local에 Neon 연결 문자열을 넣어 주세요.'
    );
  }
  return url;
}

function createSql() {
  return neon(getDatabaseUrl());
}

let cached: ReturnType<typeof createSql> | null = null;

/** Neon SQL client (HTTP). Use only on the server. */
export function getSql() {
  if (!cached) cached = createSql();
  return cached;
}

export type Sql = ReturnType<typeof getSql>;
