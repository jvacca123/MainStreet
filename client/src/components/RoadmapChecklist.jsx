const STATUS_ORDER = ['not_started', 'in_progress', 'complete'];
const STATUS_LABEL = { not_started: 'Not started', in_progress: 'In progress', complete: 'Complete' };
const STATUS_RING = {
  not_started: 'border-brand-200 bg-white',
  in_progress: 'border-amber-300 bg-amber-50',
  complete: 'border-brand-500 bg-brand-500 text-white',
};

export default function RoadmapChecklist({ items, onChange }) {
  const completeCount = items.filter((i) => i.status === 'complete').length;
  const progressPct = Math.round((completeCount / items.length) * 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-2xl text-brand-900">Readiness Roadmap</h3>
        <span className="text-sm text-brand-600">
          {completeCount} of {items.length} complete
        </span>
      </div>
      <div className="h-2 rounded-full bg-brand-100 overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-amber-400 transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <ol className="space-y-2">
        {items.map((item, i) => (
          <li
            key={item.id}
            className="flex items-center gap-4 rounded-xl border border-brand-100 bg-white p-4 hover:border-brand-200 transition-colors"
          >
            <button
              type="button"
              onClick={() => {
                if (!onChange) return;
                const next = STATUS_ORDER[(STATUS_ORDER.indexOf(item.status) + 1) % STATUS_ORDER.length];
                onChange(item.id, next);
              }}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${STATUS_RING[item.status]}`}
              aria-label={`Toggle status for ${item.label}. Currently ${STATUS_LABEL[item.status]}.`}
            >
              {item.status === 'complete' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              ) : item.status === 'in_progress' ? (
                <span className="block h-2.5 w-2.5 rounded-full bg-amber-400" />
              ) : (
                <span className="text-brand-300 font-medium text-xs">{i + 1}</span>
              )}
            </button>
            <div className="flex-1">
              <div className="font-medium text-brand-900">{item.label}</div>
              <div className="text-xs text-brand-500">{STATUS_LABEL[item.status]}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
