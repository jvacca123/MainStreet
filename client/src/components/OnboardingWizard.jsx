import { useState } from 'react';

export default function OnboardingWizard({ steps, onComplete, title, subtitle }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const update = (patch) => setData((d) => ({ ...d, ...patch }));

  async function next() {
    setError(null);
    if (step.validate) {
      const err = step.validate(data);
      if (err) { setError(err); return; }
    }
    if (isLast) {
      setSubmitting(true);
      try {
        await onComplete(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setSubmitting(false);
      }
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function prev() { setError(null); setStepIndex((i) => Math.max(0, i - 1)); }

  return (
    <div className="container-narrow py-10">
      {(title || subtitle) && (
        <div className="mb-8 text-center">
          {title && <h1 className="font-display text-4xl text-brand-900 mb-2">{title}</h1>}
          {subtitle && <p className="text-brand-600">{subtitle}</p>}
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center gap-1 mb-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i <= stepIndex ? 'bg-brand-700' : 'bg-brand-100'}`}
            />
          ))}
        </div>
        <div className="text-sm text-brand-500">
          Step {stepIndex + 1} of {steps.length} — <span className="text-brand-700 font-medium">{step.title}</span>
        </div>
      </div>

      <div className="card card-pad">
        <h2 className="font-display text-2xl text-brand-900 mb-1">{step.title}</h2>
        {step.description && <p className="text-brand-600 mb-6">{step.description}</p>}
        <div className="space-y-5">
          {step.render({ data, update })}
        </div>
        {error && (
          <div className="mt-5 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}
        <div className="mt-8 flex items-center justify-between gap-2">
          <button onClick={prev} disabled={stepIndex === 0} className="btn-outline">
            Back
          </button>
          <button onClick={next} disabled={submitting} className="btn-amber">
            {submitting ? 'Saving…' : isLast ? 'Finish' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-brand-500">{hint}</p>}
    </div>
  );
}

export function Radio({ name, value, current, label, onChange, hint }) {
  const selected = current === value;
  return (
    <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${selected ? 'border-brand-700 bg-brand-50' : 'border-brand-200 bg-white hover:bg-cream'}`}>
      <input
        type="radio"
        name={name}
        checked={selected}
        onChange={() => onChange(value)}
        className="mt-1 accent-brand-700"
      />
      <span className="flex-1">
        <span className="block font-medium text-brand-900">{label}</span>
        {hint && <span className="block text-xs text-brand-500 mt-0.5">{hint}</span>}
      </span>
    </label>
  );
}
