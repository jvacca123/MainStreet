// Database entry point — picks Postgres if DATABASE_URL is set, else SQLite.
// All callers use the same async interface: db.prepare(sql).run/get/all,
// db.query(sql, params), db.exec(sql).

const USE_PG = !!process.env.DATABASE_URL;
const backend = USE_PG ? require('./pg') : require('./sqlite');

module.exports = {
  ...backend,
  driver: backend.driver,
};
