import { Activity, HeartPulse, Layers3, ShieldAlert, Star } from "lucide-react";

const icons = {
  Popularity: Star,
  Activity,
  Quality: HeartPulse,
  Security: ShieldAlert,
  Stack: Layers3
};

export default function CategoryWinnerCards({ categoryWinners }) {
  return <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Category winners">
    {categoryWinners.map(({ category, winner, reason }) => {
      const Icon = icons[category] || Activity;
      return <article className="card min-w-0 p-4" key={category}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="m-0 flex items-center gap-2 text-[10px] font-semibold"><Icon size={13} className="text-violet-400"/>{category}</h3>
          <span className={`tag ${winner === "tie" ? "" : "tag-success"}`}>{winner === "tie" ? "Tie" : `Repo ${winner.toUpperCase()}`}</span>
        </div>
        <p className="mb-0 mt-3 text-[9px] leading-5 text-muted">{reason}</p>
      </article>;
    })}
  </section>;
}
