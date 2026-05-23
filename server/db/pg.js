const { Pool } = require('pg');
const logger = require('../services/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.DATABASE_URL?.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  logger.error('Unexpected pg pool error', { error: err.message });
});

async function query(sql, params = []) {
  const res = await pool.query(sql, params);
  return { rows: res.rows, rowCount: res.rowCount, lastId: res.rows[0]?.id ?? null };
}

async function close() {
  await pool.end();
}

async function checkConnection() {
  const client = await pool.connect();
  client.release();
}

module.exports = { query, close, checkConnection };
