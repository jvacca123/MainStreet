import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { buyers, matches } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import ScoreGauge from '../components/ScoreGauge.jsx';
import BuyerChecklist from '../components/BuyerChecklist.jsx';
import MatchCard from '../components/MatchCard.jsx';
import EmptyState from '../components/EmptyState.jsx';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([buyers.getProfile(), matches.forUser(user.id)])
      .then(([profile, m]) => {
        if (cancelled) return;
        setData(profile);
        setMatchList(m.matches || []);
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user.id]);

  async function setChecklist(id, done) {
    try {
      const res = await buyers.updateChecklist(id, done);
      setData((d) => ({ ...d, checklist: res.checklist }));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="container-wide py-12 text-center text-brand-500">Loading your dashboard…</div>;
  if (error) return (
    <div className="container-wide py-12">
      <EmptyState icon="⚠︎" title="We couldn't load your dashboard" subtitle={error}
        cta={{ to: '/buyer/onboarding', label: 'Open onboarding' }} />
    </div>
  );
  if (!data) return null;

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

      <div className="card card-pad mb-10">
        <BuyerChecklist items={checklist} onChange={setChecklist} />
      </div>

      <section className="mb-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="font-display text-3xl text-brand-900">Matched listings</h2>
            <p className="text-brand-600 text-sm">
              {matchList.length > 0
                ? `${matchList.length} ${matchList.length === 1 ? 'business fits' : 'businesses fit'} your profile.`
                : "We'll surface businesses here as owners join and complete their profiles."}
            </p>
          </div>
        </div>
        {matchList.length === 0 ? (
          <EmptyState
            icon="✦"
            title="No listings yet"
            subtitle="As owners complete their profiles, you'll see ones that match your industry preferences, geography, and capital."
            cta={{ to: '/buyer/onboarding', label: 'Refine your profile' }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matchList.map((m) => <MatchCard key={m.id} match={m} viewerRole="buyer" />)}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="font-display text-3xl text-brand-900">Learning center</h2>
          <p className="text-brand-600 text-sm">Free modules built for first-time acquirers.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {learningModules.map((m) => (
            <div key={m.id} className="card card-pad relative">
              <span className="absolute top-4 right-4 badge bg-amber-100 text-amber-600">Coming soon</span>
              <h4 className="font-display text-xl text-brand-900 mb-1 pr-24">{m.title}</h4>
              <p className="text-sm text-brand-600">{m.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 text-sm text-brand-500 flex justify-end">
        <Link to="/account" className="hover:text-brand-800">Account settings</Link>
      </div>
    </div>
  );
}
