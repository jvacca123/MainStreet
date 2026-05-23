const db = require('./db');
const NodeCache = require('node-cache');
const {
  computeTransferabilityScore,
  computeReadinessScore,
  estimatedValuation,
  capitalMidpoint,
} = require('./scoring');

// Match results cached for 10 minutes per user
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

async function getSeller(userId) {
  return db.prepare(
    'SELECT u.id, u.email, u.full_name, s.* FROM users u JOIN seller_profiles s ON s.user_id = u.id WHERE u.id = ? AND u.deleted_at IS NULL'
  ).get(userId);
}

async function getBuyer(userId) {
  return db.prepare(
    'SELECT u.id, u.email, u.full_name, b.* FROM users u JOIN buyer_profiles b ON b.user_id = u.id WHERE u.id = ? AND u.deleted_at IS NULL'
  ).get(userId);
}

async function listSellers() {
  return db.prepare(
    'SELECT u.id, u.email, u.full_name, s.* FROM users u JOIN seller_profiles s ON s.user_id = u.id WHERE u.deleted_at IS NULL'
  ).all();
}

async function listBuyers() {
  return db.prepare(
    'SELECT u.id, u.email, u.full_name, b.* FROM users u JOIN buyer_profiles b ON b.user_id = u.id WHERE u.deleted_at IS NULL'
  ).all();
}

function scorePair(buyer, seller) {
  let score = 0;
  const reasons = [];

  let buyerIndustries = [];
  try { buyerIndustries = JSON.parse(buyer.preferred_industries || '[]'); } catch { /* */ }
  const sellerIndustry = (seller.industry || '').toLowerCase();
  const overlap = buyerIndustries.some(
    (i) => i.toLowerCase() === sellerIndustry || sellerIndustry.includes(i.toLowerCase()) || i.toLowerCase().includes(sellerIndustry),
  );
  if (overlap) { score += 30; reasons.push('Industry match'); }

  const buyerLoc = (buyer.location || '').toLowerCase();
  const sellerLoc = (seller.location || '').toLowerCase();
  const locationMatch =
    !!buyerLoc && !!sellerLoc &&
    (buyerLoc === sellerLoc ||
      buyerLoc.split(',')[1]?.trim() === sellerLoc.split(',')[1]?.trim());
  if (locationMatch) { score += 20; reasons.push('Same region'); }
  else if (buyer.willing_to_relocate) { score += 10; reasons.push('Buyer willing to relocate'); }

  if (seller.preferred_buyer_type === buyer.background_type || seller.preferred_buyer_type === 'open') {
    score += 25;
    if (seller.preferred_buyer_type !== 'open') reasons.push('Preferred buyer type');
    else reasons.push('Seller open to all buyer types');
  }

  const val = estimatedValuation(seller);
  const cap = capitalMidpoint(buyer.capital_range);
  const requiredDown = val.min * 0.15;
  if (cap >= requiredDown) { score += 15; reasons.push('Capital aligned'); }
  else if (buyer.sba_eligible && cap >= requiredDown * 0.6) { score += 10; reasons.push('SBA-bridgeable capital'); }

  if (seller.mentorship_willing && buyer.wants_mentor) {
    score += 10; reasons.push('Mentorship aligned');
  }

  return { score, reasons };
}

function enrichSellerCard(seller) {
  return {
    id: seller.id,
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
  };
}

function enrichBuyerCard(buyer) {
  let preferredIndustries = [];
  try { preferredIndustries = JSON.parse(buyer.preferred_industries || '[]'); } catch { /* */ }
  return {
    id: buyer.id,
    backgroundType: buyer.background_type,
    location: buyer.location,
    sbaEligible: !!buyer.sba_eligible,
    preferredIndustries,
    wantsMentor: !!buyer.wants_mentor,
    readinessScore: computeReadinessScore(buyer),
  };
}

async function topMatchesForSeller(sellerUserId, limit = 5) {
  const seller = await getSeller(sellerUserId);
  if (!seller) return [];
  const buyers = await listBuyers();
  return buyers
    .map((b) => {
      const { score, reasons } = scorePair(b, seller);
      return { ...enrichBuyerCard(b), matchScore: score, reasons };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

async function topMatchesForBuyer(buyerUserId, limit = 5) {
  const buyer = await getBuyer(buyerUserId);
  if (!buyer) return [];
  const sellers = await listSellers();
  return sellers
    .map((s) => {
      const { score, reasons } = scorePair(buyer, s);
      return { ...enrichSellerCard(s), matchScore: score, reasons };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

async function topMatchesForUser(userId, limit = 5) {
  const cacheKey = `matches:${userId}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const u = await db.prepare('SELECT role FROM users WHERE id = ? AND deleted_at IS NULL').get(userId);
  if (!u) return { role: null, matches: [] };

  const result = u.role === 'seller'
    ? { role: 'seller', matches: await topMatchesForSeller(userId, limit) }
    : { role: 'buyer',  matches: await topMatchesForBuyer(userId, limit) };

  cache.set(cacheKey, result);
  return result;
}

function invalidateMatchesCache(userId) {
  // Clear all cached match results for this user (any limit)
  for (const key of cache.keys()) {
    if (key.startsWith(`matches:${userId}:`)) cache.del(key);
  }
}

function invalidateAllMatchesCache() {
  cache.flushAll();
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
  invalidateMatchesCache,
  invalidateAllMatchesCache,
};
