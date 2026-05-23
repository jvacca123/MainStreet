import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sellers, matches } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import ScoreGauge from '../components/ScoreGauge.jsx';
import RoadmapChecklist from '../components/RoadmapChecklist.jsx';
import MatchCard from '../components/MatchCard.jsx';
import EmptyState from '../components/EmptyState.jsx';

function fmt(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

const PRIORITY_BADGE = {
  high: 'badge bg-red-100 text-red-700',
  medium: 'badge bg-amber-100 text-amber-600',
  low: 'badge bg-brand-100 text-brand-700',
};

export default function SellerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [matchList, setMatchList] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      sellers.getProfile(),
      matches.forUser(user.id),
      sellers.mentors(),
    ])
      .then(([profile, m, mt]) => {
        if (cancelled) return;
        setData(profile);
        setMatchList(m.matches || []);
        setMentors(mt.mentors || []);
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user.id]);

  async function setRoadmap(id, status) {
    try {
      const res = await sellers.updateRoadmap(id, status);
      setData((d) => ({ ...d, roadmap: res.roadmap }));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="container-wide py-12 text-center text-brand-500">Loading your dashboard…</div>;
  if (error) return (
    <div className="container-wide py-12">
      <EmptyState icon="⚠︎" title="We couldn't load your dashboard" subtitle={error}
        cta={{ to: '/seller/onboarding', label: 'Open onboarding' }} />
    </div>
  );
  if (!data) return null;

  const { profile, transferabilityScore, grade, recommendations, valuation, roadmap } = data;

  return (
    <div className="container-wide py-10">
      <header className="mb-8">
        <div className="text-sm font-semibold tracking-widest text-brand-600">OWNER DASHBOARD</div>
        <h1 className="font-display text-4xl text-brand-900">{profile.businessName}</h1>
        <p className="text-brand-600 mt-1">
          {profile.location} · <span className="capitalize">{profile.industry}</span> · {profile.yearsInOperation} years in operation
        </p>
      </header>

      {/* Score + Valuation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card card-pad lg:col-span-1 flex flex-col items-center">
          <ScoreGauge score={transferabilityScore} grade={grade} label="Transferability Score" sub="How sale-ready your business is" />
        </div>

        <div className="card card-pad lg:col-span-2">
          <h3 className="font-display text-2xl text-brand-900 mb-1">Estimated valuation range</h3>
          <p className="text-brand-600 text-sm mb-4">
            Based on industry multiples ({valuation.multipleLow}× – {valuation.multipleHigh}× SDE) and your revenue range. A working estimate, not an appraisal.
          </p>
          <div className="flex items-end gap-2 mb-4">
            <div className="font-display text-4xl text-brand-900 font-semibold">{fmt(valuation.min)}</div>
            <div className="font-display text-2xl text-brand-500">–</div>
            <div className="font-display text-4xl text-brand-900 font-semibold">{fmt(valuation.max)}</div>
          </div>
          <div className="h-3 rounded-full bg-cream-dark overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-500 via-amber-400 to-brand-700" />
          </div>
          <div className="flex justify-between mt-2 text-xs text-brand-500">
            <span>Low end (struggling sale)</span>
            <span>High end (well-prepared sale)</span>
          </div>
        </div>
      </div>

      {/* Recommendations + Roadmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="card card-pad">
          <h3 className="font-display text-2xl text-brand-900 mb-1">Raise your score</h3>
          <p className="text-brand-600 text-sm mb-5">
            {recommendations.length > 0
              ? `Top ${recommendations.length} actions, in priority order.`
              : 'Your business is in great shape. Keep going on the roadmap.'}
          </p>
          {recommendations.length === 0 ? (
            <div className="text-brand-600 text-sm">No outstanding actions — well done.</div>
          ) : (
            <ol className="space-y-4">
              {recommendations.map((r, i) => (
                <li key={i} className="flex gap-3">
                  <div className="shrink-0 h-7 w-7 rounded-full bg-brand-50 text-brand-700 font-semibold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-brand-900">{r.title}</span>
                      <span className={PRIORITY_BADGE[r.priority]}>{r.priority}</span>
                    </div>
                    <p className="text-sm text-brand-600 leading-relaxed">{r.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="card card-pad">
          <RoadmapChecklist items={roadmap} onChange={setRoadmap} />
        </div>
      </div>

      {/* Matched Buyers */}
      <section className="mb-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="font-display text-3xl text-brand-900">Matched buyers</h2>
            <p className="text-brand-600 text-sm">
              {matchList.length > 0
                ? `${matchList.length} community ${matchList.length === 1 ? 'buyer fits' : 'buyers fit'} your preferences.`
                : "We'll surface buyers here as they join."}
            </p>
          </div>
        </div>
        {matchList.length === 0 ? (
          <EmptyState
            icon="✦"
            title="No buyer matches yet"
            subtitle="We surface buyers as they sign up and complete their profiles. Sharpen yours in the meantime and your matches will improve."
            cta={{ to: '/seller/onboarding', label: 'Refine your profile' }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matchList.map((m) => <MatchCard key={m.id} match={m} viewerRole="seller" />)}
          </div>
        )}
      </section>

      {/* Mentor Network */}
      <section>
        <div className="mb-4">
          <h2 className="font-display text-3xl text-brand-900">Mentor network</h2>
          <p className="text-brand-600 text-sm">Owners who opted into post-sale mentorship.</p>
        </div>
        {mentors.length === 0 ? (
          <EmptyState
            icon="✿"
            title="No mentors available yet"
            subtitle="As more owners complete their journey and opt into mentorship, they'll appear here."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mentors.map((m, i) => (
              <div key={i} className="card card-pad">
                <h4 className="font-display text-lg text-brand-900">{m.name}</h4>
                <div className="text-xs text-brand-500 capitalize mb-3">
                  {m.industry} · {m.yearsInBusiness} years · {m.location}
                </div>
                <p className="text-sm text-brand-700 mb-2"><strong className="text-brand-900">Sold:</strong> {m.soldBusiness}</p>
                <button disabled className="btn-outline btn-sm w-full opacity-60 cursor-not-allowed" title="Scheduling launches soon">
                  Schedule a Call · Coming soon
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 text-sm text-brand-500 flex justify-end">
        <Link to="/account" className="hover:text-brand-800">Account settings</Link>
      </div>
    </div>
  );
}
