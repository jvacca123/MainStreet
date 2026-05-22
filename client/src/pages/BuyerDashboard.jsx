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

export default function BuyerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [matchList, setMatchList] = useState([]);
  const [error, setError] = useState(null);
  const [openModule, setOpenModule] = useState(null);

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

  if (error) return <div className="container-wide py-10 text-red-700">{error}</div>;
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
          <blockquote className="mt-5 border-l-2 border-amber-300 pl-4 text-sm text-brand-700 italic">
            "{profile.motivation}"
          </blockquote>
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
          <div className="card card-pad text-brand-600">No matches yet. Check back as more owners join.</div>
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
          <p className="text-brand-600 text-sm">Free modules built for first-time acquirers.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {learningModules.map((m) => (
            <button
              key={m.id}
              onClick={() => setOpenModule(m)}
              className="card card-pad text-left hover:shadow-cardHover transition-shadow"
            >
              <h4 className="font-display text-xl text-brand-900 mb-1">{m.title}</h4>
              <p className="text-sm text-brand-600 mb-3">{m.blurb}</p>
              <div className="h-1.5 rounded-full bg-brand-100 overflow-hidden">
                <div className="h-full bg-brand-500" style={{ width: `${m.progress}%` }} />
              </div>
              <div className="mt-2 text-xs text-brand-500">{m.progress}% complete</div>
            </button>
          ))}
        </div>
      </section>

      {openModule && (
        <div role="dialog" className="fixed inset-0 z-40 flex items-center justify-center bg-brand-900/60 p-4" onClick={() => setOpenModule(null)}>
          <div className="card max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-2xl text-brand-900 mb-2">{openModule.title}</h3>
            <p className="text-brand-600 mb-4">
              This module is in our content roadmap — full video and quiz content lands in the next release. For now, here's the outline.
            </p>
            <ul className="list-disc pl-5 text-sm text-brand-700 space-y-1 mb-4">
              <li>Foundational concepts you need to evaluate a deal</li>
              <li>A short worked example using a real industry</li>
              <li>Common pitfalls and how to spot them</li>
              <li>A quiz at the end to lock it in</li>
            </ul>
            <div className="flex justify-end">
              <button onClick={() => setOpenModule(null)} className="btn-primary">Got it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
