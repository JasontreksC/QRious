import { readFileSync } from 'node:fs';
import { Pool, type PoolClient, type PoolConfig } from 'pg';

/**
 * Aurora PostgreSQL 클라이언트 (서버 전용).
 *
 *  - getSql()     라이터 엔드포인트. 삽입·수정·삭제와, 방금 쓴 값을 바로 다시 읽어야 하는 조회.
 *  - getReadSql() 리더 엔드포인트. 순수 조회. 리더 변수가 없으면 라이터로 대신합니다.
 *
 * 두 클라이언트 모두 sql`SELECT ... ${value}` 형태의 태그드 템플릿이고,
 * sql.transaction([sql`...`, sql`...`])로 한 트랜잭션에 묶을 수 있습니다.
 */

type Role = 'writer' | 'reader';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name}이(가) 설정되지 않았습니다. .env.local에 Aurora 연결 정보를 넣어 주세요.`
    );
  }
  return value;
}

function sslConfig(): PoolConfig['ssl'] {
  const mode = process.env.AURORA_DB_SSL?.trim().toLowerCase();
  if (mode === 'disable') return false;
  const ca = process.env.AURORA_DB_SSL_CA?.trim();
  if (ca) {
    // PEM 내용을 그대로 넣거나(배포 환경 변수), 파일 경로를 넣을 수 있다.
    const pem = ca.includes('BEGIN CERTIFICATE') ? ca.replace(/\\n/g, '\n') : readFileSync(ca, 'utf8');
    return { ca: pem, rejectUnauthorized: true };
  }
  // 암호화는 하되 인증서는 검증하지 않는다. 검증하려면 AURORA_DB_SSL_CA를 지정한다.
  return { rejectUnauthorized: false };
}

function poolConfig(host: string): PoolConfig {
  const port = Number(requireEnv('AURORA_DB_PORT'));
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('AURORA_DB_PORT가 올바른 숫자가 아닙니다.');
  }
  const max = Number(process.env.AURORA_POOL_MAX ?? 5);
  return {
    host,
    port,
    user: requireEnv('AURORA_DB_USER'),
    password: requireEnv('AURORA_DB_PASSWORD'),
    database: requireEnv('AURORA_DB_NAME'),
    ssl: sslConfig(),
    max: Number.isInteger(max) && max > 0 ? max : 5,
    idleTimeoutMillis: 10_000,
    // Serverless v2가 대기 상태에서 깨어나는 시간을 고려한다.
    connectionTimeoutMillis: 15_000,
    keepAlive: true,
  };
}

const pools = globalThis as unknown as { __qriousPools?: Partial<Record<Role, Pool>> };

function getPool(role: Role): Pool {
  pools.__qriousPools ??= {};
  const existing = pools.__qriousPools[role];
  if (existing) return existing;

  const readerHost = process.env.AURORA_READER_ENDPOINT?.trim();
  const host =
    role === 'reader' && readerHost ? readerHost : requireEnv('AURORA_WRITER_ENDPOINT');
  const pool = new Pool(poolConfig(host));
  // 유휴 연결이 끊겨도 프로세스가 죽지 않게 한다. 풀이 다음 요청에서 새 연결을 만든다.
  pool.on('error', (err) => console.error(`[db:${role}] idle client error`, err.message));
  pools.__qriousPools[role] = pool;
  return pool;
}

const TRANSIENT_CONNECT_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  '57P03', // cannot_connect_now
]);

function isTransientConnectError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as Error & { code?: string }).code;
  if (code && TRANSIENT_CONNECT_CODES.has(code)) return true;
  return /timeout exceeded when trying to connect|Connection terminated/i.test(err.message);
}

/** 연결을 얻는 단계에서만 재시도한다. 쿼리 실행 중 실패는 재시도하지 않는다. (쓰기 중복 방지) */
async function acquire(pool: Pool): Promise<PoolClient> {
  const attempts = 3;
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await pool.connect();
    } catch (err) {
      if (!isTransientConnectError(err) || attempt === attempts - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
    }
  }
}

interface Statement {
  text: string;
  values: unknown[];
}

/** 실행 전까지 아무것도 보내지 않는 쿼리. await 하거나 sql.transaction에 넘기면 실행된다. */
class Query implements PromiseLike<Row[]> {
  constructor(
    readonly pool: Pool,
    readonly statement: Statement
  ) {}

  private run(): Promise<Row[]> {
    return (async () => {
      const client = await acquire(this.pool);
      try {
        const result = await client.query(this.statement.text, this.statement.values);
        return result.rows as Row[];
      } finally {
        client.release();
      }
    })();
  }

  then<TResult1 = Row[], TResult2 = never>(
    onfulfilled?: ((value: Row[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null
  ): Promise<Row[] | TResult> {
    return this.run().catch(onrejected);
  }

  finally(onfinally?: (() => void) | null): Promise<Row[]> {
    return this.run().finally(onfinally);
  }
}

export interface Sql {
  (strings: TemplateStringsArray, ...values: unknown[]): PromiseLike<Row[]> &
    Pick<Promise<Row[]>, 'catch' | 'finally'>;
  /** 쿼리들을 한 트랜잭션으로 실행한다. 하나라도 실패하면 전부 롤백된다. */
  transaction(queries: PromiseLike<Row[]>[]): Promise<Row[][]>;
}

function createSql(role: Role): Sql {
  const tag = (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return new Query(getPool(role), { text, values });
  };

  const transaction: Sql['transaction'] = async (queries) => {
    const statements = queries.map((query) => {
      if (!(query instanceof Query)) {
        throw new Error('sql.transaction에는 sql`...`로 만든 쿼리만 넘길 수 있습니다.');
      }
      return query.statement;
    });
    const client = await acquire(getPool(role));
    let broken = false;
    try {
      await client.query('BEGIN');
      const results: Row[][] = [];
      for (const statement of statements) {
        const result = await client.query(statement.text, statement.values);
        results.push(result.rows as Row[]);
      }
      await client.query('COMMIT');
      return results;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        broken = true; // 롤백도 못 했으면 이 연결은 버린다.
      }
      throw err;
    } finally {
      client.release(broken ? true : undefined);
    }
  };

  return Object.assign(tag, { transaction });
}

const clients: Partial<Record<Role, Sql>> = {};

/** 라이터 엔드포인트 클라이언트. 쓰기와 read-your-writes가 필요한 조회에 사용한다. */
export function getSql(): Sql {
  return (clients.writer ??= createSql('writer'));
}

/** 리더 엔드포인트 클라이언트. 순수 조회에만 사용한다. (복제 지연이 있을 수 있음) */
export function getReadSql(): Sql {
  return (clients.reader ??= createSql('reader'));
}
