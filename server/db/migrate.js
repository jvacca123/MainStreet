// Run all migrations in server/db/migrations/ in lexicographic order.
// Idempotent — tracks applied versions in the schema_migrations table.

const fs = require('fs');
const path = require('path');
const db = require('./index');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationTable() {
  // 001 creates this table, but we create it up-front so we can read it.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function appliedVersions() {
  const rows = await db.prepare('SELECT version FROM schema_migrations').all();
  return new Set(rows.map((r) => r.version));
}

async function markApplied(version) {
  await db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version);
}

async function listMigrations() {
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

async function run({ logger = console } = {}) {
  await ensureMigrationTable();
  const done = await appliedVersions();
  const all = await listMigrations();
  const pending = all.filter((m) => !done.has(m));

  if (pending.length === 0) {
    logger.info?.('[migrate] No pending migrations.') ?? logger.log('[migrate] No pending migrations.');
    return { applied: [] };
  }

  for (const file of pending) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    (logger.info ?? logger.log)(`[migrate] Applying ${file}…`);
    await db.exec(sql);
    await markApplied(file);
  }

  (logger.info ?? logger.log)(`[migrate] Applied ${pending.length} migration(s).`);
  return { applied: pending };
}

if (require.main === module) {
  run().then(() => process.exit(0)).catch((err) => {
    console.error('[migrate] FAILED:', err);
    process.exit(1);
  });
}

module.exports = { run };
