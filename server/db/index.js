// Thin wrapper around node:sqlite that mimics the parts of better-sqlite3 our app uses
// (prepare, run, get, all, exec, pragma, transaction). Rows are plain objects.

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'mainstreet.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const _db = new DatabaseSync(DB_PATH);
_db.exec('PRAGMA journal_mode = WAL;');
_db.exec('PRAGMA foreign_keys = ON;');

function plain(row) {
  if (!row) return row;
  return { ...row };
}

function wrapStatement(stmt) {
  return {
    run: (...args) => {
      const a = normalizeArgs(args);
      const res = Array.isArray(a) ? stmt.run(...a) : stmt.run(a);
      return { lastInsertRowid: Number(res.lastInsertRowid), changes: Number(res.changes) };
    },
    get: (...args) => {
      const a = normalizeArgs(args);
      const row = Array.isArray(a) ? stmt.get(...a) : stmt.get(a);
      return plain(row);
    },
    all: (...args) => {
      const a = normalizeArgs(args);
      const rows = Array.isArray(a) ? stmt.all(...a) : stmt.all(a);
      return rows.map(plain);
    },
  };
}

// node:sqlite supports positional `?` (varargs) and named (`@name`) via a single object arg.
// We accept either better-sqlite3 calling style and pass through.
function normalizeArgs(args) {
  if (args.length === 1 && args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) {
    return args[0]; // named-params object
  }
  return args;
}

const db = {
  prepare(sql) { return wrapStatement(_db.prepare(sql)); },
  exec(sql) { return _db.exec(sql); },
  pragma(stmt) { return _db.exec(`PRAGMA ${stmt};`); },
  transaction(fn) {
    return (...args) => {
      _db.exec('BEGIN');
      try {
        const result = fn(...args);
        _db.exec('COMMIT');
        return result;
      } catch (err) {
        try { _db.exec('ROLLBACK'); } catch { /* */ }
        throw err;
      }
    };
  },
  close() { _db.close(); },
};

const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

function isEmpty() {
  const row = db.prepare('SELECT COUNT(*) AS n FROM users').get();
  return row.n === 0;
}

module.exports = { db, isEmpty };
