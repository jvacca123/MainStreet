import { useNavigate } from 'react-router-dom';
import OnboardingWizard, { Field, Radio } from '../components/OnboardingWizard.jsx';
import { buyers } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const CAPITAL_OPTIONS = [
  { value: '<100k', label: 'Under $100K' },
  { value: '100k-250k', label: '$100K – $250K' },
  { value: '250k-500k', label: '$250K – $500K' },
  { value: '500k-1m', label: '$500K – $1M' },
  { value: '1m+', label: 'Over $1M' },
];

const SIZE_OPTIONS = [
  { value: '<500k', label: 'Under $500K revenue' },
  { value: '500k-1m', label: '$500K – $1M revenue' },
  { value: '1m-3m', label: '$1M – $3M revenue' },
  { value: '3m-10m', label: '$3M – $10M revenue' },
];

const CREDIT_OPTIONS = [
  { value: '<600', label: 'Below 600' },
  { value: '600-679', label: '600 – 679' },
  { value: '680-739', label: '680 – 739' },
  { value: '740+', label: '740+' },
];

const INDUSTRY_OPTIONS = [
  'restaurant', 'auto repair', 'landscaping', 'bookkeeping',
  'retail', 'hardware', 'manufacturing', 'professional services', 'service business',
];

export default function BuyerOnboarding() {
  const { refresh } = useAuth();
  const nav = useNavigate();

  async function onComplete(data) {
    const payload = { ...data, preferred_industries: data.preferred_industries || [] };
    await buyers.saveProfile(payload);
    await refresh();
    nav('/buyer/dashboard');
  }

  const steps = [
    {
      title: 'Your background',
      description: 'Tell us where you\'re coming from. This helps owners find buyers who fit their values.',
      validate: (d) => {
        if (!d.background_type) return 'Pick a background.';
        if (!d.location) return 'Location is required.';
        if (!d.experience_summary) return 'Tell us briefly about your experience.';
        return null;
      },
      render: ({ data, update }) => (
        <>
          <Field label="Background">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { v: 'veteran',   l: 'Military veteran' },
                { v: 'immigrant', l: 'Immigrant entrepreneur' },
                { v: 'employee',  l: 'Current/former employee' },
                { v: 'first_gen', l: 'First-gen owner' },
                { v: 'other',     l: 'Career changer' },
              ].map((o) => (
                <Radio key={o.v} name="bg" value={o.v} current={data.background_type} label={o.l} onChange={(v) => update({ background_type: v })} />
              ))}
            </div>
          </Field>
          <Field label="Location" hint="City, State">
            <input className="input" value={data.location || ''} onChange={(e) => update({ location: e.target.value })} placeholder="e.g. Columbus, OH" />
          </Field>
          <Field label="Professional experience" hint="A few sentences about what you've done.">
            <textarea className="textarea" value={data.experience_summary || ''} onChange={(e) => update({ experience_summary: e.target.value })} placeholder="A few sentences about your background, industry experience, and what you've managed." />
          </Field>
        </>
      ),
    },
    {
      title: 'Acquisition readiness',
      description: 'A snapshot of what you bring to the table financially.',
      validate: (d) => {
        if (!d.capital_range) return 'Pick a capital range.';
        if (!d.credit_score_range) return 'Pick a credit score range.';
        if (!d.business_experience) return 'Pick a business experience level.';
        return null;
      },
      render: ({ data, update }) => (
        <>
          <Field label="Available capital">
            <select className="select" value={data.capital_range || ''} onChange={(e) => update({ capital_range: e.target.value })}>
              <option value="">Choose…</option>
              {CAPITAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="SBA loan eligible?">
            <div className="grid grid-cols-2 gap-2">
              <Radio name="sba" value={1} current={data.sba_eligible} label="Yes" onChange={(v) => update({ sba_eligible: v })} />
              <Radio name="sba" value={0} current={data.sba_eligible === 0 ? 0 : null} label="No / unsure" onChange={(v) => update({ sba_eligible: v })} />
            </div>
          </Field>
          <Field label="Credit score range">
            <select className="select" value={data.credit_score_range || ''} onChange={(e) => update({ credit_score_range: e.target.value })}>
              <option value="">Choose…</option>
              {CREDIT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Business experience">
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: 'none', l: 'None' },
                { v: 'employed', l: 'Have been employed' },
                { v: 'managed', l: 'Have managed teams' },
                { v: 'owned', l: 'Have owned a business' },
              ].map((o) => (
                <Radio key={o.v} name="exp" value={o.v} current={data.business_experience} label={o.l} onChange={(v) => update({ business_experience: v })} />
              ))}
            </div>
          </Field>
        </>
      ),
    },
    {
      title: 'What you\'re looking for',
      description: 'We use this to find businesses worth your time.',
      validate: () => null,
      render: ({ data, update }) => {
        const selected = data.preferred_industries || [];
        const toggle = (i) => {
          const next = selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i];
          update({ preferred_industries: next });
        };
        return (
          <>
            <Field label="Preferred industries" hint="Pick all that interest you.">
              <div className="flex flex-wrap gap-2">
                {INDUSTRY_OPTIONS.map((i) => {
                  const on = selected.includes(i);
                  return (
                    <button
                      type="button"
                      key={i}
                      onClick={() => toggle(i)}
                      className={`rounded-full border px-3 py-1.5 text-sm capitalize transition-colors ${on ? 'bg-brand-700 text-cream border-brand-700' : 'bg-white text-brand-700 border-brand-200 hover:border-brand-400'}`}
                    >
                      {i}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Target business size">
              <select className="select" value={data.preferred_size || ''} onChange={(e) => update({ preferred_size: e.target.value })}>
                <option value="">Choose…</option>
                {SIZE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Willing to relocate?">
              <div className="grid grid-cols-2 gap-2">
                <Radio name="reloc" value={1} current={data.willing_to_relocate} label="Yes" onChange={(v) => update({ willing_to_relocate: v })} />
                <Radio name="reloc" value={0} current={data.willing_to_relocate === 0 ? 0 : null} label="No" onChange={(v) => update({ willing_to_relocate: v })} />
              </div>
            </Field>
            <Field label="Want a mentor from the seller?">
              <div className="grid grid-cols-2 gap-2">
                <Radio name="mentor" value={1} current={data.wants_mentor === undefined ? 1 : data.wants_mentor} label="Yes" onChange={(v) => update({ wants_mentor: v })} />
                <Radio name="mentor" value={0} current={data.wants_mentor === 0 ? 0 : null} label="Prefer a clean handoff" onChange={(v) => update({ wants_mentor: v })} />
              </div>
            </Field>
          </>
        );
      },
    },
    {
      title: 'Your motivation',
      description: 'A short statement. Sellers read this when matching.',
      validate: (d) => {
        if (!d.motivation || d.motivation.length < 20) return 'Tell us a little more — at least a sentence or two.';
        return null;
      },
      render: ({ data, update }) => (
        <Field
          label="Why do you want to own a business?"
          hint={`${(data.motivation || '').length} / 500 characters`}
        >
          <textarea
            className="textarea"
            maxLength={500}
            value={data.motivation || ''}
            onChange={(e) => update({ motivation: e.target.value })}
            placeholder="Why do you want to own a business, and what kind of impact do you want to make in your community?"
          />
        </Field>
      ),
    },
  ];

  return (
    <OnboardingWizard
      title="Buyer profile"
      subtitle="Four steps. We'll generate your Readiness Score at the end."
      steps={steps}
      onComplete={onComplete}
    />
  );
}
