// Development-only seed script. NEVER runs in production.
// Usage: npm run seed:dev

if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: seed:dev must not be run in production.');
  process.exit(1);
}

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { query, queryOne } = require('../server/db');
const { defaultSellerRoadmap, readinessChecklist } = require('../server/scoring');
const { runMigrations } = require('../server/db/migrate');

const PASSWORD = 'Demo1234!';
const BCRYPT_ROUNDS = 12;

const sellers = [
  {
    email: 'owner@example.dev',
    full_name: 'Margaret Alvarez',
    profile: {
      business_name: 'Alvarez Family Diner',
      industry: 'restaurant',
      years_in_operation: 32,
      location: 'Akron, OH',
      revenue_range: '500k-1m',
      employee_count: 14,
      retirement_timeline: '3-5',
      reason_for_selling: 'Retiring after 32 years.',
      has_successor: false,
      q_personal_relationships: 4,
      q_documented_procedures: 1,
      q_runs_without_owner: 1,
      q_management_team: 1,
      q_clean_financials: 2,
      preferred_buyer_type: 'immigrant',
      mentorship_willing: true,
    },
  },
  {
    email: 'henry@example.dev',
    full_name: 'Henry Bishop',
    profile: {
      business_name: 'Bishop Auto Repair',
      industry: 'auto repair',
      years_in_operation: 24,
      location: 'Lancaster, PA',
      revenue_range: '1m-3m',
      employee_count: 9,
      retirement_timeline: '1-2',
      reason_for_selling: 'Health reasons. Need a structured handoff.',
      has_successor: false,
      q_personal_relationships: 3,
      q_documented_procedures: 2,
      q_runs_without_owner: 2,
      q_management_team: 2,
      q_clean_financials: 2,
      preferred_buyer_type: 'veteran',
      mentorship_willing: true,
    },
  },
];

const buyers = [
  {
    email: 'buyer@example.dev',
    full_name: 'Marcus Reed',
    profile: {
      background_type: 'veteran',
      location: 'Lancaster, PA',
      experience_summary: '12 years Army logistics. MBA from Penn State 2022.',
      capital_range: '250k-500k',
      sba_eligible: true,
      credit_score_range: '740+',
      business_experience: 'managed',
      preferred_industries: JSON.stringify(['auto repair', 'manufacturing', 'service business']),
      preferred_size: '1m-3m',
      willing_to_relocate: true,
      wants_mentor: true,
      motivation: 'I want to buy a business that builds real things and employs people in my community.',
    },
  },
];

async function seed() {
  await runMigrations(require('../server/db'));

  const existingUser = await queryOne('SELECT id FROM users WHERE email = $1', ['owner@example.dev']);
  if (existingUser) {
    console.log('Dev seed already applied — skipping.');
    return;
  }

  const roadmap = JSON.stringify(defaultSellerRoadmap());

  for (const s of sellers) {
    const hash = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS);
    const { rows } = await query(
      'INSERT INTO users (email, password_hash, role, full_name, email_verified, terms_accepted_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id',
      [s.email, hash, 'seller', s.full_name, true],
    );
    const userId = rows[0].id;
    const p = s.profile;
    await query(
      `INSERT INTO seller_profiles (
        user_id, business_name, industry, years_in_operation, location, revenue_range, employee_count,
        retirement_timeline, reason_for_selling, has_successor,
        q_personal_relationships, q_documented_procedures, q_runs_without_owner,
        q_management_team, q_clean_financials, preferred_buyer_type, mentorship_willing, roadmap_json
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        userId, p.business_name, p.industry, p.years_in_operation, p.location, p.revenue_range, p.employee_count,
        p.retirement_timeline, p.reason_for_selling, p.has_successor,
        p.q_personal_relationships, p.q_documented_procedures, p.q_runs_without_owner,
        p.q_management_team, p.q_clean_financials, p.preferred_buyer_type, p.mentorship_willing, roadmap,
      ],
    );
    console.log(`Seeded seller: ${s.email}`);
  }

  for (const b of buyers) {
    const hash = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS);
    const { rows } = await query(
      'INSERT INTO users (email, password_hash, role, full_name, email_verified, terms_accepted_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id',
      [b.email, hash, 'buyer', b.full_name, true],
    );
    const userId = rows[0].id;
    const p = b.profile;
    const checklist = JSON.stringify(readinessChecklist(p));
    await query(
      `INSERT INTO buyer_profiles (
        user_id, background_type, location, experience_summary,
        capital_range, sba_eligible, credit_score_range, business_experience,
        preferred_industries, preferred_size, willing_to_relocate, wants_mentor,
        motivation, checklist_json
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        userId, p.background_type, p.location, p.experience_summary,
        p.capital_range, p.sba_eligible, p.credit_score_range, p.business_experience,
        p.preferred_industries, p.preferred_size, p.willing_to_relocate, p.wants_mentor,
        p.motivation, checklist,
      ],
    );
    console.log(`Seeded buyer: ${b.email}`);
  }

  console.log(`\nDev seed complete. Password for all accounts: ${PASSWORD}`);
  console.log('Seller: owner@example.dev');
  console.log('Buyer:  buyer@example.dev');
}

seed()
  .then(() => { require('../server/db').close(); })
  .catch((err) => { console.error('Seed failed:', err.message); process.exit(1); });
