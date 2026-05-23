import { useEffect, useState } from 'react';
import { sellers, matches } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import ScoreGauge from '../components/ScoreGauge.jsx';
import RoadmapChecklist from '../components/RoadmapChecklist.jsx';
import MatchCard from '../components/MatchCard.jsx';

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

  useEffect(() => {
    Promise.all([
      sellers.getProfile(),
      matches.forUser(user.id),
      sellers.mentors(),
    ])
      .then(([profile, m, mt]) => {
        setData(profile);
        setMatchList(m.matches || []);
        setMentors(mt.mentors || []);
      })
      .catch((err) => setError(err.message));
  }, [user.id]);

  async function setRoadmap(id, status) {
    const res = await sellers.updateRoadmap(id, status);
    setData((d) => ({ ...d, roadmap: res.roadmap }));
  }

  if (error) {
    return (
      <div className="container-wide py-16 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-red-700 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-outline">Try again</button>
      </div>
    );
  }
  if (!data) return <div className="container-wide py-10 text-brand-600">Loading dashboard…</div>;

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

      {/* Top row: Score + Valuation */}
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
          <p className="text-brand-600 text-sm mb-5">Top {recommendations.length} actions, in priority order.</p>
          {recommendations.length === 0 ? (
            <div className="text-brand-600 text-sm">Your business is in great shape. Keep going on the roadmap →</div>
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
            <p className="text-brand-600 text-sm">{matchList.length} community buyers fit your preferences.</p>
          </div>
        </div>
        {matchList.length === 0 ? (
          <div className="card card-pad text-center py-12">
            <div className="text-4xl mb-3">👥</div>
            <h3 className="font-display text-xl text-brand-900 mb-2">No matches yet</h3>
            <p className="text-brand-600 text-sm">Check back as more buyers join the platform. Raising your Transferability Score will broaden your match pool.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matchList.map((m) => (
              <MatchCard key={m.id} match={m} viewerRole="seller" />
            ))}
          </div>
        )}
      </section>

      {/* Mentor Network */}
      <section>
        <div className="mb-4">
          <h2 className="font-display text-3xl text-brand-900">Mentor network</h2>
          <p className="text-brand-600 text-sm">Owners who have sold and now help others through the process.</p>
        </div>
        {mentors.length === 0 ? (
          <div className="card card-pad text-center py-12">
            <div className="text-4xl mb-3">🤝</div>
            <h3 className="font-display text-xl text-brand-900 mb-2">Mentor matching coming soon</h3>
            <p className="text-brand-600 text-sm">We're building a network of sellers who have completed successful transitions. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mentors.map((m, i) => (
              <div key={i} className="card card-pad">
                <h4 className="font-display text-lg text-brand-900">{m.name}</h4>
                <div className="text-xs text-brand-500 capitalize mb-3">
                  {m.industry} · {m.yearsInBusiness} years · {m.location}
                </div>
                <p className="text-sm text-brand-700 mb-4"><strong className="text-brand-900">Business:</strong> {m.soldBusiness}</p>
                <button disabled className="btn-outline btn-sm w-full opacity-60 cursor-not-allowed">
                  Mentor scheduling — coming soon
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
