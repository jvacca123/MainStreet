export default function BuyerChecklist({ items, onChange }) {
  const doneCount = items.filter((i) => i.done).length;
  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-2xl text-brand-900">Readiness Checklist</h3>
        <span className="text-sm text-brand-600">{doneCount} of {items.length} done</span>
      </div>
      <div className="h-2 rounded-full bg-brand-100 overflow-hidden mb-6">
        <div className="h-full bg-gradient-to-r from-brand-500 to-amber-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 rounded-xl border border-brand-100 bg-white p-4">
            <input
              type="checkbox"
              checked={!!item.done}
              onChange={(e) => onChange && onChange(item.id, e.target.checked)}
              className="h-5 w-5 rounded border-brand-300 text-brand-700 focus:ring-brand-500 accent-brand-700"
              aria-label={item.label}
            />
            <div className="flex-1">
              <div className={`font-medium ${item.done ? 'text-brand-500 line-through' : 'text-brand-900'}`}>
                {item.label}
              </div>
              {item.link && (
                <a href={item.link} target="_blank" rel="noreferrer" className="text-xs text-amber-500 hover:text-amber-600">
                  Open SBA.gov →
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
