// Postgres backend exposing the same interface as the SQLite wrapper:
//   db.query(text, params)         → { rows }
//   db.prepare(sql).run/get/all    → mimics SQLite calling style
// SQL passed in here uses `?` placeholders for portability; we translate to $N.

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: needsSsl() ? { rejectUnauthorized: false } : false,
  min: 2,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  // Don't crash the server on idle client errors
  console.error('[pg pool error]', err.message);
});

function needsSsl() {
  if (process.env.PGSSL === '0') return false;
  const url = process.env.DATABASE_URL || '';
  if (!url) return false;
  if (url.includes('localhost') || url.includes('127.0.0.1')) return false;
  return true;
}

// Convert `?` placeholders into `$1`, `$2`, …
function toPgSql(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// Some better-sqlite3-style calls use named params (@name). Translate to $name.
function toPgNamed(sql) {
  return sql.replace(/@(\w+)/g, '${$1}');
}

function isNamedObj(arg) {
  return arg && typeof arg === 'object' && !Array.isArray(arg);
}

async function query(text, params = []) {
  return pool.query(text, params);
}

function prepare(sql) {
  const usesNamed = /@\w+/.test(sql);
  const pgSql = usesNamed ? null : toPgSql(sql);

  async function exec(args) {
    if (usesNamed && isNamedObj(args[0])) {
      // Named params — convert manually to numbered
      const obj = args[0];
      const keys = Object.keys(obj);
      let positionalSql = sql;
      const values = [];
      keys.forEach((k, idx) => {
        const re = new RegExp('@' + k + '\\b', 'g');
        positionalSql = positionalSql.replace(re, `$${idx + 1}`);
        values.push(obj[k]);
      });
      return pool.query(positionalSql, values);
    }
    const values = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    return pool.query(pgSql, values);
  }

  return {
    async run(...args) {
      const result = await exec(args);
      // Try to extract a lastInsertRowid (Postgres won't have one unless RETURNING is used)
      const lastInsertRowid = result.rows[0]?.id ?? null;
      return { changes: result.rowCount, lastInsertRowid };
    },
    async get(...args) {
      const result = await exec(args);
      return result.rows[0] ?? undefined;
    },
    async all(...args) {
      const result = await exec(args);
      return result.rows;
    },
  };
}

async function exec(sqlText) {
  return pool.query(sqlText);
}

async function close() {
  await pool.end();
}

async function healthCheck() {
  try {
    const res = await pool.query('SELECT 1 AS ok');
    return res.rows[0].ok === 1;
  } catch (err) {
    return false;
  }
}

module.exports = {
  driver: 'postgres',
  pool,
  query,
  prepare,
  exec,
  close,
  healthCheck,
};
