#!/usr/bin/env node
/**
 * Neon → Aurora PostgreSQL 전체 데이터 복제.
 *
 *   node --env-file=.env.local scripts/migrate-neon-to-aurora.mjs [옵션]
 *
 * 옵션
 *   (없음)         점검만 합니다. 연결·스키마·행 수를 확인하고 아무것도 쓰지 않습니다.
 *   --execute      실제로 복제합니다. 여러 번 실행해도 안전한 UPSERT 방식입니다.
 *                    - Aurora에 없는 행은 추가합니다.
 *                    - 이미 있고 내용이 같은 행은 건드리지 않습니다. (쓰기 자체가 일어나지 않음)
 *                    - 이미 있지만 Neon에서 바뀐 행만 갱신합니다.
 *                    - Aurora에만 있는 행은 지우지 않습니다. (--prune을 쓰면 지웁니다)
 *   --insert-only  --execute와 함께 사용. 새 행만 추가하고 기존 행은 바뀌었더라도 갱신하지 않습니다.
 *   --prune        --execute와 함께 사용. Neon에서 삭제된 행을 Aurora에서도 삭제합니다.
 *   --truncate     --execute와 함께 사용. Aurora의 모든 테이블을 비우고 처음부터 복제합니다.
 *   --rehearse     --execute와 같이 전부 수행하되 마지막에 롤백합니다. Aurora는 바뀌지 않습니다.
 *   --verify-only  복제하지 않고 Neon과 Aurora의 행 수·내용 해시만 비교합니다.
 *
 * 필요한 환경변수 (.env.local)
 *   DATABASE_URL                                 Neon (원본, 읽기 전용으로만 접근)
 *   AURORA_WRITER_ENDPOINT, AURORA_READER_ENDPOINT
 *   AURORA_DB_USER, AURORA_DB_PASSWORD, AURORA_DB_NAME, AURORA_DB_PORT
 *   (선택) AURORA_DB_SSL=disable  SSL을 끕니다.
 *   (선택) AURORA_DB_SSL_CA=/path/global-bundle.pem  서버 인증서를 검증합니다.
 *
 * 동일성 보장 방식
 *   - Neon은 REPEATABLE READ + READ ONLY 트랜잭션 하나에서 전부 읽습니다. (일관된 스냅샷, 쓰기 불가)
 *   - 시간·실수·JSON 값은 JS 값으로 바꾸지 않고 PostgreSQL이 내보낸 문자열 그대로 다시 넣습니다.
 *     (timestamptz 마이크로초, double precision 자릿수가 줄어들지 않습니다.)
 *   - Aurora 쓰기는 트랜잭션 하나입니다. 중간에 실패하면 전부 롤백되어 Aurora는 그대로입니다.
 *   - 복제 뒤 테이블마다 행 수와 내용 해시(md5)를 Neon 스냅샷과 비교합니다.
 *   - 시퀀스·identity 컬럼이 없어서 따로 맞출 값이 없습니다.
 */

import pg from 'pg';
import { readFileSync } from 'node:fs';

const { Client, types } = pg;

// 값을 JS 타입으로 바꾸지 않고 서버가 준 문자열을 그대로 유지한다.
// 1184 timestamptz, 1114 timestamp, 1082 date, 1083 time, 1266 timetz, 1186 interval,
// 114 json, 3802 jsonb, 700 float4, 701 float8, 1700 numeric, 20 int8
for (const oid of [1184, 1114, 1082, 1083, 1266, 1186, 114, 3802, 700, 701, 1700, 20]) {
  types.setTypeParser(oid, (value) => value);
}

/** 부모 테이블이 먼저 오도록 정렬한 복제 순서. */
const TABLES = [
  'admin',
  'age_pref',
  'charm',
  'major',
  'consent_notice',
  'event_schedule',
  'student',
  'registration',
  'consent',
  'ex_have',
  'ex_want',
  'have',
  'want',
  'prefer_age',
  'match_result',
  'match_message',
];

const args = new Set(process.argv.slice(2));
const KNOWN_ARGS = new Set([
  '--execute',
  '--truncate',
  '--verify-only',
  '--insert-only',
  '--prune',
  '--rehearse',
]);
for (const arg of args) {
  if (!KNOWN_ARGS.has(arg)) fail(`알 수 없는 옵션입니다: ${arg}`);
}
const EXECUTE = args.has('--execute');
const TRUNCATE = args.has('--truncate');
const VERIFY_ONLY = args.has('--verify-only');
const INSERT_ONLY = args.has('--insert-only');
const PRUNE = args.has('--prune');
const REHEARSE = args.has('--rehearse');
for (const flag of ['--truncate', '--insert-only', '--prune', '--rehearse']) {
  if (args.has(flag) && !EXECUTE) fail(`${flag}는 --execute와 함께 써야 합니다.`);
}
if (VERIFY_ONLY && (EXECUTE || TRUNCATE || INSERT_ONLY || PRUNE || REHEARSE)) {
  fail('--verify-only는 다른 옵션과 함께 쓸 수 없습니다.');
}
if (TRUNCATE && (INSERT_ONLY || PRUNE)) {
  fail('--truncate는 --insert-only, --prune과 함께 쓸 수 없습니다. (이미 전부 비우고 다시 넣습니다)');
}

function fail(message) {
  console.error(`\n오류: ${message}`);
  process.exit(1);
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) fail(`${name}이(가) 설정되지 않았습니다. .env.local을 확인해 주세요.`);
  return value;
}

const quote = (name) => `"${name.replace(/"/g, '""')}"`;
const qualified = (table) => `public.${quote(table)}`;
const log = (message = '') => console.log(message);

function auroraSsl() {
  if (process.env.AURORA_DB_SSL?.trim().toLowerCase() === 'disable') return false;
  const caPath = process.env.AURORA_DB_SSL_CA?.trim();
  if (caPath) return { ca: readFileSync(caPath, 'utf8'), rejectUnauthorized: true };
  // 암호화는 하되 인증서는 검증하지 않는다. 검증하려면 AURORA_DB_SSL_CA를 지정한다.
  return { rejectUnauthorized: false };
}

function auroraConfig(host) {
  const port = Number(requireEnv('AURORA_DB_PORT'));
  if (!Number.isInteger(port) || port <= 0) fail('AURORA_DB_PORT가 올바른 숫자가 아닙니다.');
  return {
    host,
    port,
    user: requireEnv('AURORA_DB_USER'),
    password: requireEnv('AURORA_DB_PASSWORD'),
    database: requireEnv('AURORA_DB_NAME'),
    ssl: auroraSsl(),
    // Serverless v2가 깨어나는 시간을 고려해 넉넉하게 기다린다.
    connectionTimeoutMillis: 60_000,
    statement_timeout: 0,
  };
}

async function connect(label, config) {
  const client = new Client(config);
  client.on('error', (err) => console.error(`[${label}] 연결 오류: ${err.message}`));
  try {
    await client.connect();
  } catch (err) {
    fail(`${label}에 연결하지 못했습니다: ${err.message}`);
  }
  return client;
}

async function sessionSettings(client) {
  // 시간 값이 세션 시간대에 따라 다르게 보이지 않도록 UTC로 고정한다.
  await client.query(`SET LOCAL TIME ZONE 'UTC'`);
  await client.query(`SET LOCAL extra_float_digits = 1`);
}

async function describeColumns(client, table) {
  const { rows } = await client.query(
    `SELECT a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type
       FROM pg_attribute a
      WHERE a.attrelid = to_regclass($1) AND a.attnum > 0 AND NOT a.attisdropped
      ORDER BY a.attnum`,
    [qualified(table)]
  );
  return rows;
}

async function primaryKey(client, table) {
  const { rows } = await client.query(
    `SELECT a.attname AS name
       FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
      WHERE i.indrelid = to_regclass($1) AND i.indisprimary
      ORDER BY array_position(i.indkey::int2[], a.attnum)`,
    [qualified(table)]
  );
  return rows.map((row) => row.name);
}

async function rowCount(client, table) {
  const { rows } = await client.query(`SELECT count(*)::int AS n FROM ${qualified(table)}`);
  return rows[0].n;
}

/** 두 DB의 컬럼 구성이 같은지 확인하고, 테이블별 복제 계획(컬럼·정렬키)을 만든다. */
async function buildPlan(src, dst) {
  const plan = [];
  const problems = [];

  for (const table of TABLES) {
    const dstColumns = await describeColumns(dst, table);
    if (dstColumns.length === 0) {
      problems.push(`Aurora에 ${table} 테이블이 없습니다. migrations/aurora/01_schema.sql을 먼저 실행해 주세요.`);
      continue;
    }
    const srcColumns = await describeColumns(src, table);
    if (srcColumns.length === 0) {
      problems.push(`Neon에 ${table} 테이블이 없습니다.`);
      continue;
    }

    const srcByName = new Map(srcColumns.map((c) => [c.name, c.type]));
    const dstByName = new Map(dstColumns.map((c) => [c.name, c.type]));
    for (const [name, type] of dstByName) {
      if (!srcByName.has(name)) problems.push(`${table}.${name}: Aurora에만 있는 컬럼입니다.`);
      else if (srcByName.get(name) !== type) {
        problems.push(`${table}.${name}: 타입이 다릅니다. Neon=${srcByName.get(name)}, Aurora=${type}`);
      }
    }
    for (const name of srcByName.keys()) {
      if (!dstByName.has(name)) problems.push(`${table}.${name}: Neon에만 있는 컬럼입니다. Aurora에 추가해 주세요.`);
    }

    const pk = await primaryKey(dst, table);
    if (pk.length === 0) problems.push(`${table}: Aurora에 기본키가 없습니다.`);
    plan.push({ table, columns: dstColumns.map((c) => c.name), pk });
  }

  if (problems.length > 0) {
    console.error('\n스키마 점검에 실패했습니다.');
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  return plan;
}

function selectSql({ table, columns, pk }) {
  return `SELECT ${columns.map(quote).join(', ')} FROM ${qualified(table)} ORDER BY ${pk.map(quote).join(', ')}`;
}

async function fetchRows(src, entry) {
  const { rows } = await src.query({ text: selectSql(entry), rowMode: 'array' });
  return rows;
}

function* batches(rows, width) {
  const size = Math.max(1, Math.min(500, Math.floor(60_000 / width)));
  for (let start = 0; start < rows.length; start += size) yield rows.slice(start, start + size);
}

function valuesClause(chunk, width) {
  const values = [];
  const placeholders = chunk.map((row, rowIndex) => {
    const base = rowIndex * width;
    for (const value of row) values.push(value);
    return `(${Array.from({ length: width }, (_, i) => `$${base + i + 1}`).join(', ')})`;
  });
  return { placeholders: placeholders.join(', '), values };
}

/**
 * UPSERT. 기본키가 같은 행이 있으면 내용이 실제로 다를 때만 갱신하고,
 * 같으면 아무것도 쓰지 않는다. (--insert-only이면 기존 행은 항상 그대로 둔다)
 */
async function upsertTable(dst, entry, rows) {
  const { table, columns, pk } = entry;
  const stats = { inserted: 0, updated: 0, unchanged: 0 };
  if (rows.length === 0) return stats;

  const columnList = columns.map(quote).join(', ');
  const nonPk = columns.filter((c) => !pk.includes(c));
  const conflict =
    INSERT_ONLY || nonPk.length === 0
      ? 'DO NOTHING'
      : `DO UPDATE SET ${nonPk.map((c) => `${quote(c)} = EXCLUDED.${quote(c)}`).join(', ')}
         WHERE (${nonPk.map((c) => `${qualified(table)}.${quote(c)}`).join(', ')})
               IS DISTINCT FROM (${nonPk.map((c) => `EXCLUDED.${quote(c)}`).join(', ')})`;

  for (const chunk of batches(rows, columns.length)) {
    const { placeholders, values } = valuesClause(chunk, columns.length);
    // xmax = 0 이면 새로 추가된 행, 아니면 갱신된 행. 변경 없는 행은 RETURNING에 나오지 않는다.
    const result = await dst.query(
      `INSERT INTO ${qualified(table)} (${columnList}) VALUES ${placeholders}
       ON CONFLICT (${pk.map(quote).join(', ')}) ${conflict}
       RETURNING (xmax = 0) AS inserted`,
      values
    );
    const inserted = result.rows.filter((r) => r.inserted).length;
    stats.inserted += inserted;
    stats.updated += result.rows.length - inserted;
  }
  stats.unchanged = rows.length - stats.inserted - stats.updated;
  return stats;
}

/** Neon에 없는 행을 Aurora에서 삭제한다. (FK의 ON DELETE CASCADE로 따라 지워지는 자식 행은 세지 않는다) */
async function pruneTable(dst, entry, rows) {
  const { table, columns, pk } = entry;
  const pkIndex = pk.map((c) => columns.indexOf(c));
  const keys = rows.map((row) => pkIndex.map((i) => row[i]));
  const tmp = quote(`_keep_${table}`);

  await dst.query(
    `CREATE TEMP TABLE ${tmp} ON COMMIT DROP AS
       SELECT ${pk.map(quote).join(', ')} FROM ${qualified(table)} WITH NO DATA`
  );
  for (const chunk of batches(keys, pk.length)) {
    const { placeholders, values } = valuesClause(chunk, pk.length);
    await dst.query(`INSERT INTO ${tmp} (${pk.map(quote).join(', ')}) VALUES ${placeholders}`, values);
  }
  const result = await dst.query(
    `DELETE FROM ${qualified(table)} t
      WHERE NOT EXISTS (SELECT 1 FROM ${tmp} k WHERE ${pk.map((c) => `k.${quote(c)} = t.${quote(c)}`).join(' AND ')})`
  );
  return result.rowCount ?? 0;
}

/** 행 수와 내용 해시. ROW(...)::text는 NULL과 빈 문자열을 구분한다. */
async function fingerprint(client, { table, columns, pk }) {
  const row = `ROW(${columns.map(quote).join(', ')})::text`;
  const order = pk.map(quote).join(', ');
  const { rows } = await client.query(
    `SELECT count(*)::int AS n,
            md5(COALESCE(string_agg(${row}, E'\\n' ORDER BY ${order}), '')) AS hash
       FROM ${qualified(table)}`
  );
  return rows[0];
}

async function compareAll(src, dst, plan) {
  const diffs = [];
  log('\n테이블별 비교 (행 수 / 내용 해시)');
  for (const entry of plan) {
    const [a, b] = [await fingerprint(src, entry), await fingerprint(dst, entry)];
    const same = a.n === b.n && a.hash === b.hash;
    if (!same) diffs.push({ table: entry.table, neon: a.n, aurora: b.n });
    log(
      `  ${same ? 'OK  ' : 'DIFF'} ${entry.table.padEnd(15)} Neon ${String(a.n).padStart(6)}  Aurora ${String(b.n).padStart(6)}  ${same ? a.hash : `${a.hash} ≠ ${b.hash}`}`
    );
  }
  return { same: diffs.length === 0, diffs };
}

async function checkReader(plan) {
  const reader = await connect('Aurora 리더', auroraConfig(requireEnv('AURORA_READER_ENDPOINT')));
  try {
    const { rows } = await reader.query('SELECT pg_is_in_recovery() AS replica');
    if (!rows[0].replica) {
      log('  ! 리더 엔드포인트가 읽기 전용 복제본이 아닙니다. 엔드포인트 값을 확인해 주세요.');
    }
    // 복제 지연이 있을 수 있어 몇 번 다시 확인한다.
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const diffs = [];
      for (const entry of plan) {
        const [expected, actual] = [entry.expected, await rowCount(reader, entry.table)];
        if (expected !== actual) diffs.push(`${entry.table} (${expected} ≠ ${actual})`);
      }
      if (diffs.length === 0) {
        log('  리더 엔드포인트에서도 모든 테이블 행 수가 일치합니다.');
        return true;
      }
      if (attempt === 6) {
        log(`  ! 리더 행 수 불일치: ${diffs.join(', ')}`);
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } finally {
    await reader.end();
  }
  return false;
}

function describeWriteMode() {
  if (TRUNCATE) return '(전부 비우고 처음부터)';
  const parts = [INSERT_ONLY ? '새 행만 추가' : '새 행 추가 + 바뀐 행만 갱신'];
  parts.push(PRUNE ? 'Neon에서 삭제된 행 제거' : '기존 행 삭제 안 함');
  return `(${parts.join(', ')})`;
}

async function main() {
  const startedAt = Date.now();
  const mode = VERIFY_ONLY
    ? '비교 전용'
    : EXECUTE
      ? `복제${REHEARSE ? ' 리허설 (롤백)' : ''}`
      : '점검 (쓰기 없음)';
  log(`Neon → Aurora  [${mode}]`);

  const src = await connect('Neon', {
    connectionString: requireEnv('DATABASE_URL'),
    connectionTimeoutMillis: 30_000,
  });
  const dst = await connect('Aurora 라이터', auroraConfig(requireEnv('AURORA_WRITER_ENDPOINT')));

  let committed = false;
  try {
    // 원본은 읽기 전용 스냅샷 트랜잭션 하나로 끝까지 유지한다.
    await src.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await sessionSettings(src);

    const { rows: dstInfo } = await dst.query(
      'SELECT current_database() AS db, version() AS version, pg_is_in_recovery() AS replica'
    );
    if (dstInfo[0].replica) {
      fail('AURORA_WRITER_ENDPOINT가 읽기 전용 복제본입니다. 라이터 엔드포인트를 확인해 주세요.');
    }
    log(`  Neon   연결 OK`);
    log(`  Aurora 라이터 연결 OK  (${dstInfo[0].db}, ${dstInfo[0].version.split(' on ')[0]})`);

    const reader = await connect('Aurora 리더', auroraConfig(requireEnv('AURORA_READER_ENDPOINT')));
    try {
      const { rows } = await reader.query('SELECT current_database() AS db, pg_is_in_recovery() AS replica');
      log(
        `  Aurora 리더 연결 OK  (${rows[0].db}${rows[0].replica ? '' : ' · 주의: 읽기 전용 복제본이 아닙니다'})`
      );
    } finally {
      await reader.end().catch(() => {});
    }

    const plan = await buildPlan(src, dst);
    log('  스키마 점검 OK  (16개 테이블의 컬럼 이름·타입이 같습니다)');

    // 두 DB의 현재 행 수
    const counts = [];
    for (const entry of plan) {
      entry.expected = await rowCount(src, entry.table);
      counts.push({ table: entry.table, neon: entry.expected, aurora: await rowCount(dst, entry.table) });
    }
    log('\n현재 행 수');
    for (const c of counts) {
      log(`  ${c.table.padEnd(15)} Neon ${String(c.neon).padStart(6)}  Aurora ${String(c.aurora).padStart(6)}`);
    }

    if (VERIFY_ONLY) {
      await dst.query('BEGIN READ ONLY');
      await sessionSettings(dst);
      const { same } = await compareAll(src, dst, plan);
      await dst.query('ROLLBACK');
      log(same ? '\n모든 테이블이 동일합니다.' : '\n차이가 있습니다.');
      process.exitCode = same ? 0 : 2;
      return;
    }

    if (!EXECUTE) {
      log('\n점검만 했습니다. 아무것도 쓰지 않았습니다.');
      log('  실제로 복제하려면 --execute 옵션을 붙여 다시 실행하세요. (여러 번 실행해도 안전한 UPSERT입니다)');
      log('  먼저 결과만 보고 싶다면 --execute --rehearse (마지막에 롤백)');
      return;
    }

    // 원본 행은 한 번만 읽어서 정리·삽입·검증이 모두 같은 데이터를 쓰게 한다.
    const sourceRows = new Map();
    for (const entry of plan) sourceRows.set(entry.table, await fetchRows(src, entry));

    log(`\n복제 중… ${describeWriteMode()}`);
    await dst.query('BEGIN');
    await sessionSettings(dst);

    if (TRUNCATE) {
      await dst.query(`TRUNCATE ${TABLES.map(qualified).join(', ')} CASCADE`);
      log('  Aurora 기존 데이터를 삭제했습니다. (커밋 전까지는 롤백 가능)');
    } else if (PRUNE) {
      // 자식 → 부모 순서로 정리한다. 부모가 지워져 연쇄 삭제된 행 중 Neon에 있는 것은 아래 UPSERT에서 다시 들어간다.
      log('  Neon에서 삭제된 행 정리');
      for (const entry of [...plan].reverse()) {
        const removed = await pruneTable(dst, entry, sourceRows.get(entry.table));
        if (removed > 0) log(`    ${entry.table.padEnd(15)} ${String(removed).padStart(6)}행 삭제`);
      }
    }

    log('  UPSERT');
    const totals = { inserted: 0, updated: 0, unchanged: 0 };
    for (const entry of plan) {
      const s = await upsertTable(dst, entry, sourceRows.get(entry.table));
      for (const key of Object.keys(totals)) totals[key] += s[key];
      log(
        `    ${entry.table.padEnd(15)} 추가 ${String(s.inserted).padStart(5)}  갱신 ${String(s.updated).padStart(5)}  변경없음 ${String(s.unchanged).padStart(5)}`
      );
    }
    log(`    ${'합계'.padEnd(13)} 추가 ${String(totals.inserted).padStart(5)}  갱신 ${String(totals.updated).padStart(5)}  변경없음 ${String(totals.unchanged).padStart(5)}`);

    // 커밋 전에 같은 트랜잭션 안에서 검증한다.
    const { same, diffs } = await compareAll(src, dst, plan);
    if (!same) {
      // Aurora에만 남은 행(--prune 없음) 또는 --insert-only로 갱신하지 않은 행이면 예상된 차이다.
      // 그 외(행 수가 같거나 Aurora가 더 적음)는 복제 오류이므로 롤백한다.
      const explained = diffs.every((d) => INSERT_ONLY || (!PRUNE && d.aurora > d.neon));
      if (!explained) {
        await dst.query('ROLLBACK');
        fail('복제 결과가 원본과 달라 롤백했습니다. Aurora에는 아무것도 반영되지 않았습니다.');
      }
      log(`\n주의: ${diffs.map((d) => d.table).join(', ')} 테이블이 Neon과 완전히 같지는 않습니다.`);
      if (INSERT_ONLY) log('  --insert-only라서 이미 있던 행은 갱신하지 않았습니다.');
      else log('  Aurora에만 남아 있는 행입니다. Neon에서 삭제된 행까지 맞추려면 --prune을 사용하세요.');
      process.exitCode = 2;
    }

    if (REHEARSE) {
      // 같은 UPSERT를 한 번 더 실행해 재실행 시 아무것도 바뀌지 않는지 확인한다.
      const again = { inserted: 0, updated: 0, unchanged: 0 };
      for (const entry of plan) {
        const s = await upsertTable(dst, entry, sourceRows.get(entry.table));
        for (const key of Object.keys(again)) again[key] += s[key];
      }
      log(`\n재실행 확인: 추가 ${again.inserted}  갱신 ${again.updated}  변경없음 ${again.unchanged}`);
      if (again.inserted !== 0 || again.updated !== 0) process.exitCode = 1;
      await dst.query('ROLLBACK');
      log('\n리허설이라 롤백했습니다. Aurora는 바뀌지 않았습니다.');
      return;
    }
    await dst.query('COMMIT');
    committed = true;
    log(same ? '\n커밋 완료. 모든 테이블이 Neon 스냅샷과 동일합니다.' : '\n커밋 완료.');

    // 리더 확인은 행 수가 정확히 같아야 하는 경우에만 의미가 있다.
    if (same) {
      log('\n리더 엔드포인트 확인');
      const readerOk = await checkReader(plan);
      if (!readerOk) process.exitCode = 2;
    }
  } catch (err) {
    if (!committed) {
      await dst.query('ROLLBACK').catch(() => {});
    }
    console.error(`\n실패: ${err.message}`);
    if (err.code === '23505') {
      console.error(
        '  Aurora에 남아 있는 옛 행과 고유 제약이 충돌했습니다. Neon에서 바뀐/삭제된 행일 수 있으니 --prune을 함께 써 보세요.'
      );
    }
    if (!committed) console.error('Aurora 변경은 롤백되었습니다.');
    process.exitCode = 1;
  } finally {
    await src.query('ROLLBACK').catch(() => {});
    await src.end().catch(() => {});
    await dst.end().catch(() => {});
    log(`\n소요 시간 ${((Date.now() - startedAt) / 1000).toFixed(1)}초`);
  }
}

await main();
