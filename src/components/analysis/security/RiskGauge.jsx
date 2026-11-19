function riskColor(level) {
  if (level === "critical") return "#ef4444";
  if (level === "high") return "#f97316";
  if (level === "medium") return "#f59e0b";
  return "#22c55e";
}

export default function RiskGauge({ score = 100, level = "low" }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  const color = riskColor(level);
  return <div className="flex items-center gap-4">
    <div className="relative h-28 w-28 shrink-0" role="img" aria-label={`Security safety score ${safeScore} out of 100, ${level} risk`}>
      <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="55" cy="55" r={radius} fill="none" stroke="var(--border)" strokeWidth="9"/>
        <circle cx="55" cy="55" r={radius} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${circumference * safeScore / 100} ${circumference}`} style={{ transition: "stroke-dasharray 600ms ease, stroke 250ms ease" }}/>
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <strong className="text-3xl leading-none" style={{ color }}>{safeScore}</strong>
        <span className="mt-1 text-[9px] text-muted">safety score</span>
      </div>
    </div>
    <div className="min-w-0">
      <div className="text-[10px] text-muted">Overall heuristic risk</div>
      <span className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${level === "critical" ? "border-rose-500/30 bg-rose-500/10 text-rose-400" : level === "high" ? "border-orange-500/30 bg-orange-500/10 text-orange-400" : level === "medium" ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"}`}>
        {level} risk
      </span>
      <p className="mb-0 mt-2 max-w-sm text-[10px] leading-5 text-muted">100 is the safest score. The result is a heuristic signal, not a security certification.</p>
    </div>
  </div>;
}
