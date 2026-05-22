// Semi-circular SVG gauge from 0 to 100. Color stops from red → amber → green.

export default function ScoreGauge({ score = 0, grade, label = 'Score', size = 220, sub }) {
  const clamped = Math.max(0, Math.min(100, score));
  // Arc from 180° to 360° (top half-circle). Sweep length proportional to score.
  const cx = size / 2;
  const cy = size * 0.62;
  const r = size * 0.4;
  const startAngle = Math.PI; // 180°
  const endAngle = Math.PI + (clamped / 100) * Math.PI;

  const arcPath = (a0, a1) => {
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
  };

  const bgArc = arcPath(Math.PI, Math.PI * 2);
  const fgArc = arcPath(Math.PI, endAngle);

  const grad = `gauge-${Math.round(Math.random() * 1e6)}`;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.72} viewBox={`0 0 ${size} ${size * 0.72}`} role="img" aria-label={`${label}: ${score}`}>
        <defs>
          <linearGradient id={grad} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b9442f" />
            <stop offset="35%" stopColor="#e8a020" />
            <stop offset="70%" stopColor="#5d9971" />
            <stop offset="100%" stopColor="#1a3d2b" />
          </linearGradient>
        </defs>
        <path d={bgArc} fill="none" stroke="#eee5d3" strokeWidth="14" strokeLinecap="round" />
        {clamped > 0 && (
          <path d={fgArc} fill="none" stroke={`url(#${grad})`} strokeWidth="14" strokeLinecap="round" />
        )}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="fill-brand-900"
          style={{ fontFamily: 'Playfair Display, serif', fontSize: size * 0.22, fontWeight: 600 }}
        >
          {Math.round(clamped)}
        </text>
        {grade && (
          <text
            x={cx}
            y={cy + size * 0.10}
            textAnchor="middle"
            className="fill-brand-600"
            style={{ fontFamily: 'DM Sans, sans-serif', fontSize: size * 0.085, letterSpacing: '0.08em' }}
          >
            GRADE {grade}
          </text>
        )}
      </svg>
      <div className="mt-1 text-sm text-brand-700 font-medium">{label}</div>
      {sub && <div className="mt-0.5 text-xs text-brand-500">{sub}</div>}
    </div>
  );
}
