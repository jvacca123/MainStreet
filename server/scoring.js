// Transferability + Readiness scoring + valuation logic

const INDUSTRY_MULTIPLES = {
  restaurant: [1.5, 2.5],
  'auto repair': [2.0, 3.0],
  landscaping: [1.8, 2.8],
  bookkeeping: [2.5, 4.0],
  'professional services': [2.5, 4.0],
  retail: [1.0, 2.0],
  hardware: [1.2, 2.2],
  manufacturing: [3.0, 5.0],
  'service business': [2.0, 3.0],
  other: [1.5, 2.5],
};

const REVENUE_MIDPOINT = {
  '<500k': 350_000,
  '500k-1m': 750_000,
  '1m-3m': 2_000_000,
  '3m-10m': 6_500_000,
  '10m+': 15_000_000,
};

const CAPITAL_MIDPOINT = {
  '<100k': 75_000,
  '100k-250k': 175_000,
  '250k-500k': 375_000,
  '500k-1m': 750_000,
  '1m+': 1_500_000,
};

function computeTransferabilityScore(profile) {
  // Each quiz answer contributes; total normalized to 0-100.
  // q_personal_relationships: 1-5 where LOWER is better (less dependent on owner)
  const relScore = (6 - clamp(profile.q_personal_relationships, 1, 5)) * 4; // 4..20
  const procScore = clamp(profile.q_documented_procedures, 0, 2) * 10;       // 0..20
  const runsScore = clamp(profile.q_runs_without_owner, 0, 2) * 10;          // 0..20
  const teamScore = clamp(profile.q_management_team, 0, 2) * 10;             // 0..20
  const finScore  = clamp(profile.q_clean_financials, 0, 2) * 10;            // 0..20

  let score = relScore + procScore + runsScore + teamScore + finScore;

  // Modest bonuses
  if (profile.mentorship_willing) score += 3;
  if (profile.has_successor) score += 2;
  if (profile.years_in_operation >= 10) score += 2;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function gradeFor(score) {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function transferabilityRecommendations(profile) {
  const recs = [];
  if (profile.q_personal_relationships >= 4) {
    recs.push({
      title: 'Document your top client relationships',
      detail: 'Your revenue depends heavily on relationships only you maintain. Introduce a successor to your top 10 customers and document each account.',
      priority: 'high',
    });
  }
  if (profile.q_documented_procedures < 2) {
    recs.push({
      title: 'Build an operations manual',
      detail: 'Capture daily, weekly, and monthly procedures so a new owner can step into the day-to-day without learning by trial and error.',
      priority: 'high',
    });
  }
  if (profile.q_runs_without_owner < 2) {
    recs.push({
      title: 'Run a two-week owner-absent test',
      detail: 'Schedule a stretch where you are unreachable. Identify exactly what breaks — that\'s your transferability gap.',
      priority: 'medium',
    });
  }
  if (profile.q_management_team < 2) {
    recs.push({
      title: 'Promote or hire a #2',
      detail: 'A buyer pays more when the business has a manager who isn\'t the owner. Identify your next-in-command in the next 90 days.',
      priority: 'high',
    });
  }
  if (profile.q_clean_financials < 2) {
    recs.push({
      title: 'Get 3 years of clean financials',
      detail: 'Buyers will ask for P&L, balance sheet, and tax returns. Engage a CPA to scrub personal expenses out of the books.',
      priority: 'high',
    });
  }
  if (!profile.mentorship_willing) {
    recs.push({
      title: 'Offer post-sale mentorship',
      detail: 'A 6–12 month transition meaningfully raises buyer confidence and your sale price.',
      priority: 'low',
    });
  }
  return recs.slice(0, 5);
}

function computeReadinessScore(profile) {
  let score = 0;
  // Capital
  const capitalPts = { '<100k': 5, '100k-250k': 12, '250k-500k': 18, '500k-1m': 22, '1m+': 25 };
  score += capitalPts[profile.capital_range] || 0;

  // SBA eligible
  if (profile.sba_eligible) score += 15;

  // Credit
  const creditPts = { '<600': 0, '600-679': 6, '680-739': 14, '740+': 20 };
  score += creditPts[profile.credit_score_range] || 0;

  // Experience
  const expPts = { none: 0, employed: 8, managed: 16, owned: 22 };
  score += expPts[profile.business_experience] || 0;

  // Has a clear motivation statement
  if (profile.motivation && profile.motivation.length >= 80) score += 8;

  // Industry preferences set
  try {
    const inds = JSON.parse(profile.preferred_industries || '[]');
    if (inds.length > 0) score += 5;
  } catch { /* ignore */ }

  // Relocation flexibility
  if (profile.willing_to_relocate) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function readinessChecklist(profile) {
  return [
    { id: 'profile', label: 'Complete buyer profile', done: !!profile.motivation },
    { id: 'sba', label: 'Get pre-qualified for SBA loan', done: !!profile.sba_eligible, link: 'https://www.sba.gov/funding-programs/loans/7a-loans' },
    { id: 'pfs', label: 'Build your personal financial statement', done: false },
    { id: 'training', label: 'Complete acquisition training module', done: false },
    { id: 'mentor', label: 'Connect with a mentor', done: false },
    { id: 'match', label: 'Request match with a business', done: false },
  ];
}

function defaultSellerRoadmap() {
  return [
    { id: 'docs', label: 'Complete business documentation', status: 'not_started' },
    { id: 'financials', label: 'Clean up 3 years of financials', status: 'not_started' },
    { id: 'key_employees', label: 'Identify key employees', status: 'not_started' },
    { id: 'ops_manual', label: 'Create operations manual', status: 'not_started' },
    { id: 'transition_plan', label: 'Build a 90-day transition plan', status: 'not_started' },
    { id: 'valuation', label: 'Get a business valuation', status: 'not_started' },
    { id: 'match', label: 'Connect with a buyer match', status: 'not_started' },
    { id: 'close', label: 'Close and transition', status: 'not_started' },
  ];
}

function estimatedValuation(profile) {
  const revMid = REVENUE_MIDPOINT[profile.revenue_range] || 500_000;
  const key = (profile.industry || 'other').toLowerCase();
  const [lo, hi] = INDUSTRY_MULTIPLES[key] || INDUSTRY_MULTIPLES.other;
  // SDE-style proxy: treat ~15-25% of revenue as discretionary earnings, then apply multiple.
  const sdeLo = revMid * 0.15;
  const sdeHi = revMid * 0.25;
  return {
    min: Math.round(sdeLo * lo),
    max: Math.round(sdeHi * hi),
    multipleLow: lo,
    multipleHigh: hi,
    revenueMidpoint: revMid,
  };
}

function capitalMidpoint(range) {
  return CAPITAL_MIDPOINT[range] || 0;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, Number(v) || 0));
}

module.exports = {
  computeTransferabilityScore,
  computeReadinessScore,
  transferabilityRecommendations,
  readinessChecklist,
  defaultSellerRoadmap,
  estimatedValuation,
  capitalMidpoint,
  gradeFor,
  INDUSTRY_MULTIPLES,
  REVENUE_MIDPOINT,
  CAPITAL_MIDPOINT,
};
