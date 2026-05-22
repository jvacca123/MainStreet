const { db } = require('./db');
const {
  computeTransferabilityScore,
  computeReadinessScore,
  estimatedValuation,
  capitalMidpoint,
} = require('./scoring');

function getSeller(userId) {
  return db
    .prepare('SELECT u.id, u.email, u.full_name, s.* FROM users u JOIN seller_profiles s ON s.user_id = u.id WHERE u.id = ?')
    .get(userId);
}

function getBuyer(userId) {
  return db
    .prepare('SELECT u.id, u.email, u.full_name, b.* FROM users u JOIN buyer_profiles b ON b.user_id = u.id WHERE u.id = ?')
    .get(userId);
}

function listSellers() {
  return db
    .prepare('SELECT u.id, u.email, u.full_name, s.* FROM users u JOIN seller_profiles s ON s.user_id = u.id')
    .all();
}

function listBuyers() {
  return db
    .prepare('SELECT u.id, u.email, u.full_name, b.* FROM users u JOIN buyer_profiles b ON b.user_id = u.id')
    .all();
}

function scorePair(buyer, seller) {
  let score = 0;
  const reasons = [];

  // Industry preference overlap
  let buyerIndustries = [];
  try { buyerIndustries = JSON.parse(buyer.preferred_industries || '[]'); } catch { /* */ }
  const sellerIndustry = (seller.industry || '').toLowerCase();
  const overlap = buyerIndustries.some(
    (i) => i.toLowerCase() === sellerIndustry || sellerIndustry.includes(i.toLowerCase()) || i.toLowerCase().includes(sellerIndustry),
  );
  if (overlap) {
    score += 30;
    reasons.push('Industry match');
  }

  // Location
  const buyerLoc = (buyer.location || '').toLowerCase();
  const sellerLoc = (seller.location || '').toLowerCase();
  const locationMatch =
    !!buyerLoc && !!sellerLoc &&
    (buyerLoc === sellerLoc ||
      buyerLoc.split(',')[1]?.trim() === sellerLoc.split(',')[1]?.trim()); // same state
  if (locationMatch) {
    score += 20;
    reasons.push('Same region');
  } else if (buyer.willing_to_relocate) {
    score += 10;
    reasons.push('Buyer willing to relocate');
  }

  // Preferred buyer type
  if (seller.preferred_buyer_type === buyer.background_type || seller.preferred_buyer_type === 'open') {
    score += 25;
    if (seller.preferred_buyer_type !== 'open') reasons.push('Preferred buyer type');
    else reasons.push('Seller open to all buyer types');
  }

  // Capital vs valuation
  const val = estimatedValuation(seller);
  const cap = capitalMidpoint(buyer.capital_range);
  // Down payment assumption: ~15-20%, so capital needs to be roughly that fraction of valuation low end
  const requiredDown = val.min * 0.15;
  if (cap >= requiredDown) {
    score += 15;
    reasons.push('Capital aligned');
  } else if (buyer.sba_eligible && cap >= requiredDown * 0.6) {
    score += 10;
    reasons.push('SBA-bridgeable capital');
  }

  // Mentorship alignment
  if (seller.mentorship_willing && buyer.wants_mentor) {
    score += 10;
    reasons.push('Mentorship aligned');
  }

  return { score, reasons };
}

function enrichSellerCard(seller) {
  return {
    id: seller.id,
    fullName: seller.full_name,
    businessName: seller.business_name,
    industry: seller.industry,
    location: seller.location,
    revenueRange: seller.revenue_range,
    employeeCount: seller.employee_count,
    yearsInOperation: seller.years_in_operation,
    retirementTimeline: seller.retirement_timeline,
    preferredBuyerType: seller.preferred_buyer_type,
    mentorshipWilling: !!seller.mentorship_willing,
    transferabilityScore: computeTransferabilityScore(seller),
    valuation: estimatedValuation(seller),
  };
}

function enrichBuyerCard(buyer) {
  let preferredIndustries = [];
  try { preferredIndustries = JSON.parse(buyer.preferred_industries || '[]'); } catch { /* */ }
  return {
    id: buyer.id,
    fullName: buyer.full_name,
    backgroundType: buyer.background_type,
    location: buyer.location,
    experienceSummary: buyer.experience_summary,
    capitalRange: buyer.capital_range,
    sbaEligible: !!buyer.sba_eligible,
    preferredIndustries,
    motivation: buyer.motivation,
    wantsMentor: !!buyer.wants_mentor,
    readinessScore: computeReadinessScore(buyer),
  };
}

function topMatchesForSeller(sellerUserId, limit = 5) {
  const seller = getSeller(sellerUserId);
  if (!seller) return [];
  const buyers = listBuyers();
  return buyers
    .map((b) => {
      const { score, reasons } = scorePair(b, seller);
      return { ...enrichBuyerCard(b), matchScore: score, reasons };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

function topMatchesForBuyer(buyerUserId, limit = 5) {
  const buyer = getBuyer(buyerUserId);
  if (!buyer) return [];
  const sellers = listSellers();
  return sellers
    .map((s) => {
      const { score, reasons } = scorePair(buyer, s);
      return { ...enrichSellerCard(s), matchScore: score, reasons };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

function topMatchesForUser(userId, limit = 5) {
  const u = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
  if (!u) return { role: null, matches: [] };
  if (u.role === 'seller') return { role: 'seller', matches: topMatchesForSeller(userId, limit) };
  return { role: 'buyer', matches: topMatchesForBuyer(userId, limit) };
}

module.exports = {
  scorePair,
  topMatchesForSeller,
  topMatchesForBuyer,
  topMatchesForUser,
  enrichSellerCard,
  enrichBuyerCard,
  getSeller,
  getBuyer,
};
