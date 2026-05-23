// Development seed data has moved to scripts/seed.dev.js
// Run: npm run seed:dev  (from the project root)
// This file is kept as a stub to prevent broken requires.

if (require.main === module) {
  console.log('This seed file has moved. Run "npm run seed:dev" from the project root.');
  process.exit(0);
}

module.exports = { seed: () => {}, seedIfEmpty: () => false };
