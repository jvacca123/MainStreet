import { useEffect, useState } from 'react';
import { buyers, matches } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import ScoreGauge from '../components/ScoreGauge.jsx';
import BuyerChecklist from '../components/BuyerChecklist.jsx';
import MatchCard from '../components/MatchCard.jsx';

const BG_LABEL = {
  veteran: 'Veteran',
  immigrant: 'Immigrant entrepreneur',
  employee: 'Long-tenured employee',
  first_gen: 'First-gen owner',
  other: 'Career changer',
};

function LearningModuleCard({ module }) {
  return (
    <div className="card card-pad flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-display text-xl text-brand-900">{module.title}</h4>
        <span className="badge bg-amber-100 text-amber-700 shrink-0">Coming soon</span>
      </div>
      <p className="text-sm text-brand-600">{module.blurb}</p>
    </div>
  );
}

export default function BuyerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [matchList, setMatchList] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      buyers.getProfile(),
      matches.forUser(user.id),
    ])
      .then(([profile, m]) => {
        setData(profile);
        setMatchList(m.matches || []);
      })
      .catch((err) => setError(err.message));
  }, [user.id]);

  async function setChecklist(id, done) {
    const res = await buyers.updateChecklist(id, done);
    setData((d) => ({ ...d, checklist: res.checklist }));
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

  const { profile, readinessScore, grade, checklist, learningModules } = data;

  return (
    <div className="container-wide py-10">
      <header className="mb-8">
        <div className="text-sm font-semibold tracking-widest text-brand-600">BUYER DASHBOARD</div>
        <h1 className="font-display text-4xl text-brand-900">Welcome, {profile.fullName || 'there'}.</h1>
        <p className="text-brand-600 mt-1">
          {BG_LABEL[profile.backgroundType] || profile.backgroundType} · {profile.location} · Capital: {profile.capitalRange}
        </p>
      </header>

      {/* Top row: Score + Profile summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card card-pad lg:col-span-1 flex flex-col items-center">
          <ScoreGauge score={readinessScore} grade={grade} label="Buyer Readiness Score" sub="How prepared you are to acquire" />
        </div>
        <div className="card card-pad lg:col-span-2">
          <h3 className="font-display text-2xl text-brand-900 mb-3">Your acquisition snapshot</h3>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
            <div><dt className="text-xs text-brand-500">Capital</dt><dd className="font-medium text-brand-900">{profile.capitalRange}</dd></div>
            <div><dt className="text-xs text-brand-500">SBA eligible</dt><dd className="font-medium text-brand-900">{profile.sbaEligible ? 'Yes' : 'Not yet'}</dd></div>
            <div><dt className="text-xs text-brand-500">Credit</dt><dd className="font-medium text-brand-900">{profile.creditScoreRange}</dd></div>
            <div><dt className="text-xs text-brand-500">Experience</dt><dd className="font-medium text-brand-900 capitalize">{profile.businessExperience}</dd></div>
            <div><dt className="text-xs text-brand-500">Target size</dt><dd className="font-medium text-brand-900">{profile.preferredSize || '—'}</dd></div>
            <div><dt className="text-xs text-brand-500">Wants mentor</dt><dd className="font-medium text-brand-900">{profile.wantsMentor ? 'Yes' : 'No'}</dd></div>
          </dl>
          <div className="mt-5">
            <div className="text-xs text-brand-500 mb-2">Industries of interest</div>
            <div className="flex flex-wrap gap-2">
              {profile.preferredIndustries.length === 0 && <span className="text-brand-500 text-sm">None selected</span>}
              {profile.preferredIndustries.map((i) => (
                <span key={i} className="badge bg-brand-50 text-brand-700 capitalize">{i}</span>
              ))}
            </div>
          </div>
          {profile.motivation && (
            <blockquote className="mt-5 border-l-2 border-amber-300 pl-4 text-sm text-brand-700 italic">
              "{profile.motivation}"
            </blockquote>
          )}
        </div>
      </div>

      {/* Checklist */}
      <div className="card card-pad mb-10">
        <BuyerChecklist items={checklist} onChange={setChecklist} />
      </div>

      {/* Matched Listings */}
      <section className="mb-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="font-display text-3xl text-brand-900">Matched listings</h2>
            <p className="text-brand-600 text-sm">{matchList.length} businesses that fit your profile.</p>
          </div>
        </div>
        {matchList.length === 0 ? (
          <div className="card card-pad text-center py-12">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="font-display text-xl text-brand-900 mb-2">No matches yet</h3>
            <p className="text-brand-600 text-sm">Matches appear as more owners join. Make sure your profile is complete to improve your matches.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matchList.map((m) => (
              <MatchCard key={m.id} match={m} viewerRole="buyer" />
            ))}
          </div>
        )}
      </section>

      {/* Learning center */}
      <section>
        <div className="mb-4">
          <h2 className="font-display text-3xl text-brand-900">Learning center</h2>
          <p className="text-brand-600 text-sm">Free modules for first-time acquirers — launching soon.</p>
        </div>
        {learningModules && learningModules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {learningModules.map((m) => (
              <LearningModuleCard key={m.id} module={m} />
            ))}
          </div>
        ) : (
          <div className="card card-pad text-center py-12">
            <div className="text-4xl mb-3">📚</div>
            <h3 className="font-display text-xl text-brand-900 mb-2">Learning center coming soon</h3>
            <p className="text-brand-600 text-sm">Modules on valuation, SBA financing, and due diligence are in development.</p>
          </div>
        )}
      </section>
    </div>
  );
}
