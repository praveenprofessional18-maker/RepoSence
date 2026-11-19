import { Activity, RefreshCw } from "lucide-react";
import { Button } from "../../common";

function scoreColor(score) {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function verdict(score) {
  if (score >= 90) return "Excellent repository health signals.";
  if (score >= 80) return "Strong foundations with a few areas to review.";
  if (score >= 65) return "A healthy baseline with room to improve.";
  if (score >= 50) return "Several quality signals need attention.";
  return "Start with the highest-priority recommendations below.";
}

export default function HealthScoreGauge({ report, onRescan, scanning }) {
  const score = report.overallScore;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const progress = score === null ? 0 : Math.max(0, Math.min(100, score));
  const color = scoreColor(progress);

  return <section className="card">
    <div className="card-header">
      <span className="card-title flex items-center gap-2"><Activity size={14} className="text-violet-400"/>Overall health</span>
      <Button variant="secondary" size="sm" onClick={onRescan} disabled={scanning} aria-label="Re-scan repository health">
        <RefreshCw size={13} className={scanning ? "animate-spin" : ""}/>{scanning ? "Scanning" : "Re-scan"}
      </Button>
    </div>
    <div className="grid items-center gap-4 p-4 sm:grid-cols-[132px_1fr]">
      <div className="relative mx-auto h-32 w-32" role="img" aria-label={`Health score ${score ?? "unavailable"} out of 100, grade ${report.grade}`}>
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--border)" strokeWidth="10"/>
          <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${circumference * progress / 100} ${circumference}`}
            style={{ transition: "stroke-dasharray 700ms ease, stroke 300ms ease" }}/>
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <strong className="text-3xl leading-none" style={{ color }}>{score ?? "—"}</strong>
          <span className="mt-1 text-[9px] text-muted">out of 100</span>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-line bg-panel2 px-2.5 py-1 text-lg font-semibold" style={{ color }}>{report.grade}</span>
          <span className="text-[11px] font-medium text-main">Heuristic health grade</span>
        </div>
        <p className="mb-2 mt-3 text-xs leading-6 text-muted">{score === null ? "Not enough repository data to calculate a score." : verdict(score)}</p>
        <p className="m-0 text-[9px] text-muted">
          {report.sample?.filesScanned ?? 0} files sampled · Last scanned {report.scannedAt ? new Date(report.scannedAt).toLocaleString() : "just now"}
        </p>
      </div>
    </div>
  </section>;
}
