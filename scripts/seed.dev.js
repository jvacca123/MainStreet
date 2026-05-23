// Dev-only seed. Refuses to run when NODE_ENV === 'production'.
// Creates a handful of demo sellers/buyers so the matching engine has data to work with.
// Run with: npm run seed:dev   (or directly: NODE_ENV=development node scripts/seed.dev.js)

if (process.env.NODE_ENV === 'production') {
  console.error('[seed] Refusing to run in production. Set NODE_ENV != production.');
  process.exit(2);
}

const path = require('path');
const SERVER = path.join(__dirname, '..', 'server');

// Resolve dependencies from the server workspace (where they're installed)
require(path.join(SERVER, 'node_modules', 'dotenv')).config();
const bcrypt = require(path.join(SERVER, 'node_modules', 'bcryptjs'));

const db = require(path.join(SERVER, 'db'));
const migrate = require(path.join(SERVER, 'db', 'migrate'));
const { defaultSellerRoadmap, readinessChecklist } = require(path.join(SERVER, 'scoring'));

const PASSWORD = 'Demo1234!';
const hash = (pw) => bcrypt.hashSync(pw, 12);

const SELLERS = [
  {
    email: 'owner@mainstreet.demo',
    full_name: 'Margaret Alvarez',
    profile: {
      business_name: "Alvarez Family Diner",
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
    roadmapStatuses: { docs: 'in_progress', financials: 'complete', key_employees: 'in_progress' },
  },
  {
    email: 'henry.bishop@mainstreet.demo',
    full_name: 'Henry Bishop',
    profile: {
      business_name: 'Bishop Auto Repair',
      industry: 'auto repair',
      years_in_operation: 24,
      location: 'Lancaster, PA',
      revenue_range: '1m-3m',
      employee_count: 9,
      retirement_timeline: '1-2',
      reason_for_selling: 'Health reasons.',
      has_successor: false,
      q_personal_relationships: 3,
      q_documented_procedures: 2,
      q_runs_without_owner: 2,
      q_management_team: 2,
      q_clean_financials: 2,
      preferred_buyer_type: 'veteran',
      mentorship_willing: true,
    },
    roadmapStatuses: { docs: 'complete', financials: 'complete', key_employees: 'complete', ops_manual: 'in_progress' },
  },
  {
    email: 'dolores.kim@mainstreet.demo',
    full_name: 'Dolores Kim',
    profile: {
      business_name: 'Evergreen Landscape Co.',
      industry: 'landscaping',
      years_in_operation: 18,
      location: 'Asheville, NC',
      revenue_range: '500k-1m',
      employee_count: 12,
      retirement_timeline: '3-5',
      reason_for_selling: 'Family time.',
      has_successor: true,
      q_personal_relationships: 3,
      q_documented_procedures: 2,
      q_runs_without_owner: 1,
      q_management_team: 2,
      q_clean_financials: 1,
      preferred_buyer_type: 'employee',
      mentorship_willing: true,
    },
    roadmapStatuses: { docs: 'complete', financials: 'in_progress', key_employees: 'complete' },
  },
];

const BUYERS = [
  {
    email: 'buyer@mainstreet.demo',
    full_name: 'Marcus Reed',
    profile: {
      background_type: 'veteran',
      location: 'Lancaster, PA',
      experience_summary: '12 years Army logistics. MBA from Penn State.',
      capital_range: '250k-500k',
      sba_eligible: true,
      credit_score_range: '740+',
      business_experience: 'managed',
      preferred_industries: ['auto repair', 'manufacturing', 'service business'],
      preferred_size: '1m-3m',
      willing_to_relocate: true,
      wants_mentor: true,
      motivation: 'I want to buy a business that builds real things and employs people in my community.',
    },
  },
  {
    email: 'priya.singh@mainstreet.demo',
    full_name: 'Priya Singh',
    profile: {
      background_type: 'immigrant',
      location: 'Akron, OH',
      experience_summary: 'Ran two restaurants in Mumbai. GM at a regional chain in OH.',
      capital_range: '100k-250k',
      sba_eligible: true,
      credit_score_range: '680-739',
      business_experience: 'owned',
      preferred_industries: ['restaurant', 'retail'],
      preferred_size: '500k-1m',
      willing_to_relocate: false,
      wants_mentor: true,
      motivation: 'Owning a restaurant in America has been my dream since I arrived.',
    },
  },
  {
    email: 'devon.carter@mainstreet.demo',
    full_name: 'Devon Carter',
    profile: {
      background_type: 'employee',
      location: 'Asheville, NC',
      experience_summary: '11 years at Evergreen Landscape. Operations lead. NC contractor license.',
      capital_range: '100k-250k',
      sba_eligible: true,
      credit_score_range: '680-739',
      business_experience: 'managed',
      preferred_industries: ['landscaping', 'service business'],
      preferred_size: '500k-1m',
      willing_to_relocate: false,
      wants_mentor: true,
      motivation: 'I know every customer by name and every truck by sound.',
    },
  },
];

function applyRoadmap(statuses) {
  return defaultSellerRoadmap().map((t) => statuses[t.id] ? { ...t, status: statuses[t.id] } : t);
}

function applyChecklist(profile) {
  return readinessChecklist(profile);
}

async function run() {
  await migrate.run({ logger: { info: console.log } });

  const existing = await db.prepare('SELECT COUNT(*) AS n FROM users').get();
  if ((existing.n ?? 0) > 0) {
    console.log('[seed] Database already has users — skipping seed.');
    return;
  }

  const now = new Date().toISOString();

  for (const s of SELLERS) {
    const ins = await db.prepare(
      'INSERT INTO users (email, password_hash, role, full_name, email_verified, terms_accepted_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(s.email, hash(PASSWORD), 'seller', s.full_name, true, now);
    const userId = ins.lastInsertRowid
      || (await db.prepare('SELECT id FROM users WHERE email = ?').get(s.email)).id;

    const roadmap = JSON.stringify(applyRoadmap(s.roadmapStatuses || {}));
    await db.prepare(
      `INSERT INTO seller_profiles (
        user_id, business_name, industry, years_in_operation, location, revenue_range, employee_count,
        retirement_timeline, reason_for_selling, has_successor,
        q_personal_relationships, q_documented_procedures, q_runs_without_owner, q_management_team, q_clean_financials,
        preferred_buyer_type, mentorship_willing, roadmap_json
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      userId,
      s.profile.business_name, s.profile.industry, s.profile.years_in_operation, s.profile.location,
      s.profile.revenue_range, s.profile.employee_count, s.profile.retirement_timeline, s.profile.reason_for_selling,
      s.profile.has_successor,
      s.profile.q_personal_relationships, s.profile.q_documented_procedures, s.profile.q_runs_without_owner,
      s.profile.q_management_team, s.profile.q_clean_financials,
      s.profile.preferred_buyer_type, s.profile.mentorship_willing,
      roadmap,
    );
  }

  for (const b of BUYERS) {
    const ins = await db.prepare(
      'INSERT INTO users (email, password_hash, role, full_name, email_verified, terms_accepted_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(b.email, hash(PASSWORD), 'buyer', b.full_name, true, now);
    const userId = ins.lastInsertRowid
      || (await db.prepare('SELECT id FROM users WHERE email = ?').get(b.email)).id;

    const checklist = JSON.stringify(applyChecklist(b.profile));
    await db.prepare(
      `INSERT INTO buyer_profiles (
        user_id, background_type, location, experience_summary,
        capital_range, sba_eligible, credit_score_range, business_experience,
        preferred_industries, preferred_size, willing_to_relocate, wants_mentor,
        motivation, checklist_json
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      userId,
      b.profile.background_type, b.profile.location, b.profile.experience_summary,
      b.profile.capital_range, b.profile.sba_eligible, b.profile.credit_score_range, b.profile.business_experience,
      JSON.stringify(b.profile.preferred_industries), b.profile.preferred_size,
      b.profile.willing_to_relocate, b.profile.wants_mentor,
      b.profile.motivation,
      checklist,
    );
  }

  console.log(`[seed] Inserted ${SELLERS.length} sellers + ${BUYERS.length} buyers.`);
  console.log(`[seed] Demo password: ${PASSWORD}`);
}

if (require.main === module) {
  run().then(() => { db.close?.(); process.exit(0); })
       .catch((err) => { console.error('[seed] FAILED:', err); process.exit(1); });
}

module.exports = { run };
