import { useState } from 'react';
import { connections } from '../api/client.js';

const BG_LABEL = {
  veteran: 'Veteran',
  immigrant: 'Immigrant entrepreneur',
  employee: 'Long-tenured employee',
  first_gen: 'First-gen owner',
  other: 'Career changer',
  community: 'Community member',
  open: 'Open to all',
};

const INDUSTRY_ICON = {
  restaurant: '🍳',
  'auto repair': '🔧',
  landscaping: '🌿',
  bookkeeping: '📒',
  retail: '🏪',
  hardware: '🔨',
  manufacturing: '🏭',
  'professional services': '📊',
  'service business': '🛠️',
  other: '🏢',
};

function scoreColor(score) {
  if (score >= 70) return 'badge-grade-A';
  if (score >= 50) return 'badge-grade-C';
  return 'badge-grade-F';
}

function fmtMoney(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

export default function MatchCard({ match, viewerRole }) {
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const isSellerCard = viewerRole === 'buyer'; // buyer is looking at a seller's listing

  async function requestIntro() {
    setBusy(true);
    setError(null);
    try {
      await connections.request(match.id, isSellerCard
        ? "I'm interested in learning more about your business."
        : "I'd like to introduce myself as a potential buyer.");
      setRequested(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (isSellerCard) {
    const icon = INDUSTRY_ICON[(match.industry || 'other').toLowerCase()] || '🏢';
    return (
      <div className="card card-pad flex flex-col h-full hover:shadow-cardHover transition-shadow">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden>{icon}</span>
            <div>
              <h4 className="font-display text-lg text-brand-900 leading-tight">{match.businessName}</h4>
              <div className="text-xs text-brand-500 capitalize">{match.industry}</div>
            </div>
          </div>
          <span className={scoreColor(match.transferabilityScore)}>
            T-Score {match.transferabilityScore}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-brand-700 mb-4">
          <div><dt className="text-xs text-brand-500">Location</dt><dd>{match.location}</dd></div>
          <div><dt className="text-xs text-brand-500">Revenue</dt><dd className="capitalize">{match.revenueRange}</dd></div>
          <div><dt className="text-xs text-brand-500">Employees</dt><dd>{match.employeeCount}</dd></div>
          <div><dt className="text-xs text-brand-500">Timeline</dt><dd>{match.retirementTimeline} yrs</dd></div>
        </dl>

        <div className="mb-3 text-xs text-brand-600">
          Seller wants: <span className={`badge-${match.preferredBuyerType}`}>{BG_LABEL[match.preferredBuyerType] || match.preferredBuyerType}</span>
        </div>

        {match.valuation && (
          <div className="mb-4 rounded-lg bg-cream px-3 py-2 text-xs text-brand-700">
            Est. value: <span className="font-semibold text-brand-900">{fmtMoney(match.valuation.min)} – {fmtMoney(match.valuation.max)}</span>
          </div>
        )}

        {match.reasons?.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {match.reasons.slice(0, 3).map((r) => (
              <span key={r} className="badge bg-brand-50 text-brand-700">{r}</span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-2">
          {requested ? (
            <div className="rounded-lg bg-brand-50 text-brand-800 px-4 py-2 text-sm text-center font-medium">
              Interest sent ✓
            </div>
          ) : (
            <button onClick={requestIntro} disabled={busy} className="btn-primary btn-sm w-full">
              {busy ? 'Sending…' : 'Express Interest'}
            </button>
          )}
          {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
        </div>
      </div>
    );
  }

  // Buyer card (seller is viewing)
  return (
    <div className="card card-pad flex flex-col h-full hover:shadow-cardHover transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h4 className="font-display text-lg text-brand-900 leading-tight">Buyer match</h4>
          <div className="text-xs text-brand-500">{match.location}</div>
        </div>
        <span className={`badge-${match.backgroundType}`}>
          {BG_LABEL[match.backgroundType] || match.backgroundType}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <span className={scoreColor(match.readinessScore)}>
          Readiness {match.readinessScore}
        </span>
        <span className="text-xs text-brand-500">Capital profile on file</span>
        {match.sbaEligible && <span className="badge bg-amber-100 text-amber-600">SBA eligible</span>}
      </div>

      <p className="mb-4 text-sm text-brand-700">
        Profile details are shared after an introduction is requested.
      </p>

      {match.reasons?.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {match.reasons.slice(0, 3).map((r) => (
            <span key={r} className="badge bg-brand-50 text-brand-700">{r}</span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-2">
        {requested ? (
          <div className="rounded-lg bg-brand-50 text-brand-800 px-4 py-2 text-sm text-center font-medium">
            Introduction requested ✓
          </div>
        ) : (
          <button onClick={requestIntro} disabled={busy} className="btn-primary btn-sm w-full">
            {busy ? 'Sending…' : 'Request Introduction'}
          </button>
        )}
        {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
      </div>
    </div>
  );
}
