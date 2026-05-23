// Async wrapper around node:sqlite for local development.
// Converts $1/$2/... positional params to ?, and provides the same async API as pg.js.

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'mainstreet.db');
const _db = new DatabaseSync(DB_PATH);
_db.exec('PRAGMA journal_mode = WAL;');
_db.exec('PRAGMA foreign_keys = ON;');

function toPositional(sql) {
  // Convert $1, $2, ... → ? and NOW() → CURRENT_TIMESTAMP for SQLite
  return sql
    .replace(/\$\d+/g, '?')
    .replace(/\bNOW\(\)/gi, "CURRENT_TIMESTAMP")
    .replace(/\bTRUE\b/g, '1')
    .replace(/\bFALSE\b/g, '0');
}

function plain(row) {
  if (!row) return null;
  return { ...row };
}

function normalizeParams(params) {
  return params.map((v) => {
    if (v === true) return 1;
    if (v === false) return 0;
    if (v instanceof Date) return v.toISOString();
    return v;
  });
}

async function query(sql, params = []) {
  const converted = toPositional(sql);
  params = normalizeParams(params);
  try {
    // Determine if this is a SELECT or a mutating query
    const trimmed = converted.trimStart().toUpperCase();
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
      const stmt = _db.prepare(converted);
      const rows = params.length ? stmt.all(...params) : stmt.all();
      return { rows: rows.map(plain), rowCount: rows.length, lastId: null };
    } else if (trimmed.startsWith('INSERT') || trimmed.startsWith('UPDATE') || trimmed.startsWith('DELETE')) {
      // Handle RETURNING clause for INSERTs
      if (trimmed.includes('RETURNING')) {
        // SQLite 3.35+ supports RETURNING
        try {
          const stmt = _db.prepare(converted);
          const rows = params.length ? stmt.all(...params) : stmt.all();
          return { rows: rows.map(plain), rowCount: rows.length, lastId: rows[0]?.id ?? null };
        } catch {
          // SQLite version doesn't support RETURNING — strip it and get lastInsertRowid
          const withoutReturning = converted.replace(/\s+RETURNING\s+.*/i, '');
          const stmt = _db.prepare(withoutReturning);
          const res = params.length ? stmt.run(...params) : stmt.run();
          const lastId = Number(res.lastInsertRowid) || null;
          return { rows: lastId ? [{ id: lastId }] : [], rowCount: Number(res.changes), lastId };
        }
      }
      const stmt = _db.prepare(converted);
      const res = params.length ? stmt.run(...params) : stmt.run();
      const lastId = Number(res.lastInsertRowid) || null;
      return { rows: lastId ? [{ id: lastId }] : [], rowCount: Number(res.changes), lastId };
    } else {
      _db.exec(converted);
      return { rows: [], rowCount: 0, lastId: null };
    }
  } catch (err) {
    throw err;
  }
}

async function close() {
  _db.close();
}

async function checkConnection() {
  _db.prepare('SELECT 1').get();
}

function execSchema(sql) {
  // Strip PostgreSQL-specific syntax for SQLite compatibility
  let adapted = sql
    .replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/TIMESTAMPTZ/gi, 'TEXT')
    .replace(/BOOLEAN/gi, 'INTEGER')
    .replace(/JSONB/gi, 'TEXT')
    .replace(/INET/gi, 'TEXT')
    .replace(/VARCHAR\(\d+\)/gi, 'TEXT')
    .replace(/DEFAULT NOW\(\)/gi, "DEFAULT CURRENT_TIMESTAMP")
    .replace(/IF NOT EXISTS idx_\w+ ON (\w+)\((\w+)\)/gi, (m, table, col) => `IF NOT EXISTS idx_${table}_${col} ON ${table}(${col})`)
    .replace(/ON DELETE CASCADE/gi, 'ON DELETE CASCADE');
  _db.exec(adapted);
}

module.exports = { query, close, checkConnection, execSchema };
