import { Link } from 'react-router-dom';

export default function EmptyState({ icon = '✦', title, subtitle, cta, onAction }) {
  return (
    <div className="card card-pad text-center py-12 px-6">
      <div className="mx-auto w-14 h-14 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-2xl mb-4">
        {icon}
      </div>
      <h3 className="font-display text-2xl text-brand-900 mb-2">{title}</h3>
      {subtitle && <p className="text-brand-600 max-w-md mx-auto mb-6">{subtitle}</p>}
      {cta && (
        cta.to ? (
          <Link to={cta.to} className="btn-primary">{cta.label}</Link>
        ) : onAction ? (
          <button onClick={onAction} className="btn-primary">{cta.label}</button>
        ) : null
      )}
    </div>
  );
}
