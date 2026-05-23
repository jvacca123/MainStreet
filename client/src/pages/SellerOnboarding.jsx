import { useNavigate } from 'react-router-dom';
import OnboardingWizard, { Field, Radio } from '../components/OnboardingWizard.jsx';
import { sellers } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const REVENUE_OPTIONS = [
  { value: '<500k', label: 'Under $500K' },
  { value: '500k-1m', label: '$500K – $1M' },
  { value: '1m-3m', label: '$1M – $3M' },
  { value: '3m-10m', label: '$3M – $10M' },
  { value: '10m+', label: 'Over $10M' },
];

const INDUSTRY_OPTIONS = [
  'restaurant', 'auto repair', 'landscaping', 'bookkeeping',
  'retail', 'hardware', 'manufacturing', 'professional services', 'service business', 'other',
];

export default function SellerOnboarding() {
  const { refresh } = useAuth();
  const nav = useNavigate();

  async function onComplete(data) {
    await sellers.saveProfile(data);
    await refresh();
    nav('/seller/dashboard');
  }

  const steps = [
    {
      title: 'Business basics',
      description: 'Tell us about your business at a high level. No need to be exact.',
      validate: (d) => {
        if (!d.business_name) return 'Business name is required.';
        if (!d.industry) return 'Pick an industry.';
        if (!d.location) return 'Location is required.';
        if (!d.revenue_range) return 'Pick a revenue range.';
        return null;
      },
      render: ({ data, update }) => (
        <>
          <Field label="Business name">
            <input className="input" value={data.business_name || ''} onChange={(e) => update({ business_name: e.target.value })} placeholder="e.g. Main Street Auto Repair" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Industry">
              <select className="select" value={data.industry || ''} onChange={(e) => update({ industry: e.target.value })}>
                <option value="">Choose…</option>
                {INDUSTRY_OPTIONS.map((i) => <option key={i} value={i} className="capitalize">{i}</option>)}
              </select>
            </Field>
            <Field label="Years in operation">
              <input className="input" type="number" min="0" max="200" value={data.years_in_operation || ''} onChange={(e) => update({ years_in_operation: e.target.value })} />
            </Field>
          </div>
          <Field label="Location" hint="City, State">
            <input className="input" value={data.location || ''} onChange={(e) => update({ location: e.target.value })} placeholder="e.g. Cleveland, OH" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Annual revenue range">
              <select className="select" value={data.revenue_range || ''} onChange={(e) => update({ revenue_range: e.target.value })}>
                <option value="">Choose…</option>
                {REVENUE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Number of employees">
              <input className="input" type="number" min="0" value={data.employee_count || ''} onChange={(e) => update({ employee_count: e.target.value })} />
            </Field>
          </div>
        </>
      ),
    },
    {
      title: 'Your situation',
      description: 'When are you thinking of stepping back, and why?',
      validate: (d) => d.retirement_timeline ? null : 'Pick a timeline.',
      render: ({ data, update }) => (
        <>
          <Field label="Retirement timeline">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { v: '1-2', l: '1–2 years' },
                { v: '3-5', l: '3–5 years' },
                { v: '5-10', l: '5–10 years' },
              ].map((o) => (
                <Radio key={o.v} name="timeline" value={o.v} current={data.retirement_timeline} label={o.l} onChange={(v) => update({ retirement_timeline: v })} />
              ))}
            </div>
          </Field>
          <Field label="Why are you selling?" hint="A few sentences is plenty.">
            <textarea className="textarea" value={data.reason_for_selling || ''} onChange={(e) => update({ reason_for_selling: e.target.value })} placeholder="A few sentences about why you're looking to transition the business." />
          </Field>
          <Field label="Do you have a successor in mind?">
            <div className="grid grid-cols-2 gap-2">
              <Radio name="successor" value={1} current={data.has_successor} label="Yes" onChange={(v) => update({ has_successor: v })} />
              <Radio name="successor" value={0} current={data.has_successor === 0 ? 0 : null} label="No" onChange={(v) => update({ has_successor: v })} />
            </div>
          </Field>
        </>
      ),
    },
    {
      title: 'Transferability self-assessment',
      description: 'These five questions help us calculate your Transferability Score — the number that drives your sale price.',
      validate: (d) => null,
      render: ({ data, update }) => (
        <>
          <Field
            label="Does your business rely on your personal relationships to generate revenue?"
            hint="1 = not at all  ·  5 = completely"
          >
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => update({ q_personal_relationships: n })}
                  className={`h-10 w-10 rounded-full border font-medium transition-colors ${
                    data.q_personal_relationships === n
                      ? 'bg-brand-700 text-cream border-brand-700'
                      : 'bg-white text-brand-700 border-brand-200 hover:border-brand-400'
                  }`}
                >{n}</button>
              ))}
            </div>
          </Field>

          {[
            { key: 'q_documented_procedures', label: 'Do you have documented operating procedures?' },
            { key: 'q_runs_without_owner', label: 'Could your business run for 2 weeks without you?' },
            { key: 'q_management_team', label: 'Do you have a management team in place?' },
            { key: 'q_clean_financials', label: 'Are your financials clean and audit-ready?' },
          ].map((q) => (
            <Field key={q.key} label={q.label}>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: 0, l: 'No' },
                  { v: 1, l: 'Partial' },
                  { v: 2, l: 'Yes' },
                ].map((o) => (
                  <Radio
                    key={o.v}
                    name={q.key}
                    value={o.v}
                    current={data[q.key]}
                    label={o.l}
                    onChange={(v) => update({ [q.key]: v })}
                  />
                ))}
              </div>
            </Field>
          ))}
        </>
      ),
    },
    {
      title: 'Preferred buyer',
      description: 'Who would you most like to see take over?',
      validate: (d) => d.preferred_buyer_type ? null : 'Choose a buyer type.',
      render: ({ data, update }) => (
        <Field label="Preferred buyer type">
          <div className="grid grid-cols-1 gap-2">
            {[
              { v: 'employee',  l: 'A current employee',       h: 'Promote someone who already knows the business.' },
              { v: 'veteran',   l: 'A military veteran',       h: 'A buyer with leadership and operations experience.' },
              { v: 'immigrant', l: 'An immigrant entrepreneur',h: 'Often hungry, capable, underserved by capital.' },
              { v: 'community', l: 'A local community member', h: 'Someone rooted in the same town.' },
              { v: 'open',      l: 'Open to all',              h: 'Show me the best matches regardless of background.' },
            ].map((o) => (
              <Radio key={o.v} name="buyer_type" value={o.v} current={data.preferred_buyer_type} label={o.l} hint={o.h} onChange={(v) => update({ preferred_buyer_type: v })} />
            ))}
          </div>
        </Field>
      ),
    },
    {
      title: 'Mentorship',
      description: 'Would you mentor the buyer post-sale for 6–12 months?',
      validate: () => null,
      render: ({ data, update }) => (
        <div className="grid grid-cols-2 gap-3">
          <Radio name="mentor" value={1} current={data.mentorship_willing} label="Yes" hint="A mentored transition raises sale price." onChange={(v) => update({ mentorship_willing: v })} />
          <Radio name="mentor" value={0} current={data.mentorship_willing === 0 ? 0 : null} label="No, clean break" hint="Closing means closing." onChange={(v) => update({ mentorship_willing: v })} />
        </div>
      ),
    },
  ];

  return (
    <OnboardingWizard
      title="Owner profile"
      subtitle="Five quick steps. We'll generate your Transferability Score at the end."
      steps={steps}
      onComplete={onComplete}
    />
  );
}
