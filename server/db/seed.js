const bcrypt = require('bcryptjs');
const { db, isEmpty } = require('./index');
const { defaultSellerRoadmap, readinessChecklist } = require('../scoring');

const PASSWORD = 'demo1234';

function hash(pw) { return bcrypt.hashSync(pw, 10); }

const sellers = [
  {
    email: 'owner@mainstreet.com',
    full_name: 'Margaret Alvarez',
    profile: {
      business_name: "Alvarez Family Diner",
      industry: 'restaurant',
      years_in_operation: 32,
      location: 'Akron, OH',
      revenue_range: '500k-1m',
      employee_count: 14,
      retirement_timeline: '3-5',
      reason_for_selling: 'Retiring after 32 years. Want the diner to stay in the neighborhood.',
      has_successor: 0,
      q_personal_relationships: 4,
      q_documented_procedures: 1,
      q_runs_without_owner: 1,
      q_management_team: 1,
      q_clean_financials: 2,
      preferred_buyer_type: 'immigrant',
      mentorship_willing: 1,
    },
    roadmapStatuses: { docs: 'in_progress', financials: 'complete', key_employees: 'in_progress' },
  },
  {
    email: 'henry.bishop@mainstreet.com',
    full_name: 'Henry Bishop',
    profile: {
      business_name: "Bishop Auto Repair",
      industry: 'auto repair',
      years_in_operation: 24,
      location: 'Lancaster, PA',
      revenue_range: '1m-3m',
      employee_count: 9,
      retirement_timeline: '1-2',
      reason_for_selling: 'Health reasons. Need a structured handoff.',
      has_successor: 0,
      q_personal_relationships: 3,
      q_documented_procedures: 2,
      q_runs_without_owner: 2,
      q_management_team: 2,
      q_clean_financials: 2,
      preferred_buyer_type: 'veteran',
      mentorship_willing: 1,
    },
    roadmapStatuses: { docs: 'complete', financials: 'complete', key_employees: 'complete', ops_manual: 'in_progress' },
  },
  {
    email: 'dolores.kim@mainstreet.com',
    full_name: 'Dolores Kim',
    profile: {
      business_name: "Evergreen Landscape Co.",
      industry: 'landscaping',
      years_in_operation: 18,
      location: 'Asheville, NC',
      revenue_range: '500k-1m',
      employee_count: 12,
      retirement_timeline: '3-5',
      reason_for_selling: 'Want to spend more time with grandkids.',
      has_successor: 1,
      q_personal_relationships: 3,
      q_documented_procedures: 2,
      q_runs_without_owner: 1,
      q_management_team: 2,
      q_clean_financials: 1,
      preferred_buyer_type: 'employee',
      mentorship_willing: 1,
    },
    roadmapStatuses: { docs: 'complete', financials: 'in_progress', key_employees: 'complete' },
  },
  {
    email: 'sam.washington@mainstreet.com',
    full_name: 'Sam Washington',
    profile: {
      business_name: "Washington Bookkeeping Services",
      industry: 'bookkeeping',
      years_in_operation: 21,
      location: 'Atlanta, GA',
      revenue_range: '500k-1m',
      employee_count: 6,
      retirement_timeline: '3-5',
      reason_for_selling: 'Moving closer to family on the West Coast.',
      has_successor: 0,
      q_personal_relationships: 4,
      q_documented_procedures: 2,
      q_runs_without_owner: 1,
      q_management_team: 1,
      q_clean_financials: 2,
      preferred_buyer_type: 'first_gen',
      mentorship_willing: 1,
    },
    roadmapStatuses: { docs: 'in_progress', financials: 'complete' },
  },
  {
    email: 'rosa.delgado@mainstreet.com',
    full_name: 'Rosa Delgado',
    profile: {
      business_name: "Delgado Hardware",
      industry: 'hardware',
      years_in_operation: 41,
      location: 'San Antonio, TX',
      revenue_range: '1m-3m',
      employee_count: 11,
      retirement_timeline: '5-10',
      reason_for_selling: "We've been a fixture in this neighborhood since 1983. Want the right next owner.",
      has_successor: 0,
      q_personal_relationships: 5,
      q_documented_procedures: 0,
      q_runs_without_owner: 0,
      q_management_team: 1,
      q_clean_financials: 1,
      preferred_buyer_type: 'community',
      mentorship_willing: 1,
    },
    roadmapStatuses: {},
  },
];

const buyers = [
  {
    email: 'buyer@mainstreet.com',
    full_name: 'Marcus Reed',
    profile: {
      background_type: 'veteran',
      location: 'Lancaster, PA',
      experience_summary: '12 years Army logistics, last 4 managing a 40-person motor pool. MBA from Penn State 2022.',
      capital_range: '250k-500k',
      sba_eligible: 1,
      credit_score_range: '740+',
      business_experience: 'managed',
      preferred_industries: JSON.stringify(['auto repair', 'manufacturing', 'service business']),
      preferred_size: '1m-3m',
      willing_to_relocate: 1,
      wants_mentor: 1,
      motivation: "I want to buy a business that builds real things and employs people in my community. I learned operations leading soldiers — now I want to apply it to building generational wealth.",
    },
    checklistStatuses: { profile: true, sba: true, pfs: true },
  },
  {
    email: 'priya.singh@mainstreet.com',
    full_name: 'Priya Singh',
    profile: {
      background_type: 'immigrant',
      location: 'Akron, OH',
      experience_summary: 'Came to the US in 2014. Ran two restaurants in Mumbai before emigrating. Currently general manager at a regional chain.',
      capital_range: '100k-250k',
      sba_eligible: 1,
      credit_score_range: '680-739',
      business_experience: 'owned',
      preferred_industries: JSON.stringify(['restaurant', 'retail']),
      preferred_size: '500k-1m',
      willing_to_relocate: 0,
      wants_mentor: 1,
      motivation: "Owning a restaurant in America has been my dream since I arrived. I want to take a beloved local place and continue its tradition.",
    },
    checklistStatuses: { profile: true, sba: true },
  },
  {
    email: 'devon.carter@mainstreet.com',
    full_name: 'Devon Carter',
    profile: {
      background_type: 'employee',
      location: 'Asheville, NC',
      experience_summary: '11 years at Evergreen Landscape, last 5 as operations lead. Crew certified, holds NC contractor license.',
      capital_range: '100k-250k',
      sba_eligible: 1,
      credit_score_range: '680-739',
      business_experience: 'managed',
      preferred_industries: JSON.stringify(['landscaping', 'service business']),
      preferred_size: '500k-1m',
      willing_to_relocate: 0,
      wants_mentor: 1,
      motivation: "Dolores trained me. I know every customer by name and every truck by sound. Buying this company is the natural next step.",
    },
    checklistStatuses: { profile: true, mentor: true },
  },
  {
    email: 'aisha.thomas@mainstreet.com',
    full_name: 'Aisha Thomas',
    profile: {
      background_type: 'first_gen',
      location: 'Atlanta, GA',
      experience_summary: 'CPA, 8 years at Big Four. First in my family to graduate college, want to build something I own.',
      capital_range: '250k-500k',
      sba_eligible: 1,
      credit_score_range: '740+',
      business_experience: 'employed',
      preferred_industries: JSON.stringify(['bookkeeping', 'professional services']),
      preferred_size: '500k-1m',
      willing_to_relocate: 0,
      wants_mentor: 1,
      motivation: "I have the technical chops. I want a mentor who has actually run the business so I can learn the relationship and people side.",
    },
    checklistStatuses: { profile: true, sba: true, pfs: true, training: true },
  },
  {
    email: 'james.oconnell@mainstreet.com',
    full_name: 'James O\'Connell',
    profile: {
      background_type: 'other',
      location: 'Pittsburgh, PA',
      experience_summary: '15 years in corporate finance. Looking to leave Wall Street and own something tangible in a community I care about.',
      capital_range: '500k-1m',
      sba_eligible: 1,
      credit_score_range: '740+',
      business_experience: 'employed',
      preferred_industries: JSON.stringify(['manufacturing', 'hardware', 'professional services']),
      preferred_size: '1m-3m',
      willing_to_relocate: 1,
      wants_mentor: 1,
      motivation: "I want to leave finance and operate, not financialize. A long mentorship period from the seller is part of the deal for me.",
    },
    checklistStatuses: { profile: true, sba: true, pfs: true },
  },
];

function applyRoadmap(statuses) {
  return defaultSellerRoadmap().map((task) =>
    statuses[task.id] ? { ...task, status: statuses[task.id] } : task,
  );
}

function applyChecklist(profile, statuses) {
  return readinessChecklist(profile).map((item) =>
    statuses[item.id] != null ? { ...item, done: !!statuses[item.id] } : item,
  );
}

function seed() {
  const userInsert = db.prepare(
    'INSERT INTO users (email, password_hash, role, full_name) VALUES (?, ?, ?, ?)'
  );
  const sellerInsert = db.prepare(`
    INSERT INTO seller_profiles (
      user_id, business_name, industry, years_in_operation, location, revenue_range, employee_count,
      retirement_timeline, reason_for_selling, has_successor,
      q_personal_relationships, q_documented_procedures, q_runs_without_owner, q_management_team, q_clean_financials,
      preferred_buyer_type, mentorship_willing, roadmap_json
    ) VALUES (
      @user_id, @business_name, @industry, @years_in_operation, @location, @revenue_range, @employee_count,
      @retirement_timeline, @reason_for_selling, @has_successor,
      @q_personal_relationships, @q_documented_procedures, @q_runs_without_owner, @q_management_team, @q_clean_financials,
      @preferred_buyer_type, @mentorship_willing, @roadmap_json
    )
  `);
  const buyerInsert = db.prepare(`
    INSERT INTO buyer_profiles (
      user_id, background_type, location, experience_summary,
      capital_range, sba_eligible, credit_score_range, business_experience,
      preferred_industries, preferred_size, willing_to_relocate, wants_mentor,
      motivation, checklist_json
    ) VALUES (
      @user_id, @background_type, @location, @experience_summary,
      @capital_range, @sba_eligible, @credit_score_range, @business_experience,
      @preferred_industries, @preferred_size, @willing_to_relocate, @wants_mentor,
      @motivation, @checklist_json
    )
  `);

  const tx = db.transaction(() => {
    for (const s of sellers) {
      const info = userInsert.run(s.email, hash(PASSWORD), 'seller', s.full_name);
      const roadmap = applyRoadmap(s.roadmapStatuses || {});
      sellerInsert.run({
        user_id: info.lastInsertRowid,
        ...s.profile,
        roadmap_json: JSON.stringify(roadmap),
      });
    }
    for (const b of buyers) {
      const info = userInsert.run(b.email, hash(PASSWORD), 'buyer', b.full_name);
      const checklist = applyChecklist(b.profile, b.checklistStatuses || {});
      buyerInsert.run({
        user_id: info.lastInsertRowid,
        ...b.profile,
        checklist_json: JSON.stringify(checklist),
      });
    }
  });

  tx();
}

function seedIfEmpty() {
  if (isEmpty()) {
    seed();
    return true;
  }
  return false;
}

if (require.main === module) {
  if (isEmpty()) {
    seed();
    console.log('Database seeded.');
  } else {
    console.log('Database already populated — skipping seed.');
  }
}

module.exports = { seed, seedIfEmpty };
