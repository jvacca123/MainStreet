// SQLite backend (local dev only) wrapping node:sqlite to expose an async-compatible
// interface matching the Postgres wrapper, so the rest of the app doesn't care.

const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'mainstreet.db');

const _db = new DatabaseSync(DB_PATH);
_db.exec('PRAGMA journal_mode = WAL;');
_db.exec('PRAGMA foreign_keys = ON;');

function plain(row) {
  if (!row) return row;
  return { ...row };
}

function isNamedObj(arg) {
  return arg && typeof arg === 'object' && !Array.isArray(arg);
}

function prepare(sql) {
  const stmt = _db.prepare(sql);
  return {
    async run(...args) {
      const a = normalizeArgs(args);
      const res = Array.isArray(a) ? stmt.run(...a) : stmt.run(a);
      return { lastInsertRowid: Number(res.lastInsertRowid), changes: Number(res.changes) };
    },
    async get(...args) {
      const a = normalizeArgs(args);
      const row = Array.isArray(a) ? stmt.get(...a) : stmt.get(a);
      return plain(row);
    },
    async all(...args) {
      const a = normalizeArgs(args);
      const rows = Array.isArray(a) ? stmt.all(...a) : stmt.all(a);
      return rows.map(plain);
    },
  };
}

// SQLite has no native bool — coerce JS booleans to 0/1 for any binding.
function coerce(v) {
  if (v === true) return 1;
  if (v === false) return 0;
  if (v === undefined) return null;
  return v;
}

function normalizeArgs(args) {
  if (args.length === 1 && isNamedObj(args[0])) {
    const out = {};
    for (const [k, v] of Object.entries(args[0])) out[k] = coerce(v);
    return out;
  }
  if (args.length === 1 && Array.isArray(args[0])) return args[0].map(coerce);
  return args.map(coerce);
}

async function query(sql, params = []) {
  const result = prepare(sql);
  const rows = await result.all(...params);
  return { rows };
}

async function exec(sqlText) {
  // Convert Postgres-flavored DDL into SQLite-compatible
  const translated = translatePgToSqlite(sqlText);
  _db.exec(translated);
}

async function close() {
  _db.close();
}

async function healthCheck() {
  try {
    return _db.prepare('SELECT 1 AS ok').get().ok === 1;
  } catch {
    return false;
  }
}

// Minimal translator so Postgres migration SQL also runs against SQLite.
// Only covers what our 001_initial_schema.sql uses.
function translatePgToSqlite(sql) {
  return sql
    // SERIAL PRIMARY KEY → INTEGER PRIMARY KEY AUTOINCREMENT
    .replace(/SERIAL\s+PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    // TIMESTAMPTZ DEFAULT NOW() → TEXT DEFAULT CURRENT_TIMESTAMP
    .replace(/TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\(\)/gi, "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP")
    .replace(/TIMESTAMPTZ\s+DEFAULT\s+NOW\(\)/gi, "TEXT DEFAULT CURRENT_TIMESTAMP")
    .replace(/TIMESTAMPTZ/gi, 'TEXT')
    // BOOLEAN → INTEGER (SQLite has no native bool)
    .replace(/BOOLEAN\s+NOT\s+NULL\s+DEFAULT\s+TRUE/gi, 'INTEGER NOT NULL DEFAULT 1')
    .replace(/BOOLEAN\s+NOT\s+NULL\s+DEFAULT\s+FALSE/gi, 'INTEGER NOT NULL DEFAULT 0')
    .replace(/BOOLEAN/gi, 'INTEGER')
    // VARCHAR(n) → TEXT
    .replace(/VARCHAR\(\d+\)/gi, 'TEXT')
    // INET → TEXT
    .replace(/\bINET\b/gi, 'TEXT')
    // JSONB → TEXT
    .replace(/\bJSONB\b/gi, 'TEXT');
}

module.exports = {
  driver: 'sqlite',
  prepare,
  query,
  exec,
  close,
  healthCheck,
};
