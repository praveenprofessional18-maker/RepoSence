import { Sparkles, Trophy } from "lucide-react";

export default function OverallWinnerBanner({ overallWinner, repos }) {
  const winner = overallWinner.winner;
  const label = winner === "tie" ? "Too close to call" : repos[winner === "a" ? 0 : 1].fullName;
  return <section className="compare-winner-banner relative overflow-hidden rounded-xl border border-violet-500/25 p-5 sm:p-6" aria-label="Overall comparison result">
    <div className="relative z-10 flex flex-wrap items-center gap-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-300">{winner === "tie" ? <Sparkles size={20}/> : <Trophy size={20}/>}</span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[9px] font-semibold uppercase tracking-widest text-violet-300">{winner === "tie" ? "Balanced comparison" : "Category-based leader"}</p>
        <h2 className="mb-1 mt-1 truncate text-base font-semibold">{label}</h2>
        <p className="m-0 text-[10px] leading-5 text-muted">{overallWinner.reason}</p>
      </div>
      <div className="flex items-center gap-2 text-center">
        <span className={`min-w-16 rounded-lg border px-3 py-2 ${winner === "a" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-line bg-panel/60"}`}><small className="block text-[8px] text-muted">Repo A</small><strong className="text-sm">{overallWinner.scoreA}/5</strong></span>
        <span className="text-[9px] text-muted">vs</span>
        <span className={`min-w-16 rounded-lg border px-3 py-2 ${winner === "b" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-line bg-panel/60"}`}><small className="block text-[8px] text-muted">Repo B</small><strong className="text-sm">{overallWinner.scoreB}/5</strong></span>
      </div>
    </div>
  </section>;
}
