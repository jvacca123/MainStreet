// Database abstraction — uses PostgreSQL in production, SQLite in development.
// All functions are async and return { rows, rowCount, lastId }.

let driver;

if (process.env.DATABASE_URL) {
  driver = require('./pg');
} else {
  driver = require('./sqlite-async');
}

async function query(sql, params = []) {
  return driver.query(sql, params);
}

async function queryOne(sql, params = []) {
  const { rows } = await driver.query(sql, params);
  return rows[0] || null;
}

async function close() {
  return driver.close();
}

async function checkConnection() {
  return driver.checkConnection();
}

module.exports = { query, queryOne, close, checkConnection };
