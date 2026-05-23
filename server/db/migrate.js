const fs = require('fs');
const path = require('path');
const logger = require('../services/logger');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function runMigrations(db) {
  const isPg = !!process.env.DATABASE_URL;

  if (isPg) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  } else {
    await db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  const { rows } = await db.query('SELECT version FROM schema_migrations ORDER BY version');
  const applied = new Set(rows.map((r) => r.version));

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const match = file.match(/^(\d+)_/);
    if (!match) continue;
    const version = parseInt(match[1], 10);
    if (applied.has(version)) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

    if (isPg) {
      // Run PostgreSQL migration directly
      await db.query(sql);
    } else {
      // Adapt and run SQLite migration
      const { execSchema } = require('./sqlite-async');
      execSchema(sql);
    }

    await db.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
    logger.info(`Applied migration ${file}`);
  }
}

module.exports = { runMigrations };
