import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "../../common";

function severityClass(severity) {
  if (severity === "critical") return "tag-danger";
  if (severity === "warning") return "tag-warning";
  return "";
}

export default function ImprovementsList({ items, onGenerateFix, busyTitle }) {
  return <section className="card">
    <div className="card-header"><span className="card-title">Top improvements</span><span className="tag">Prioritized · {items.length}</span></div>
    {!items.length ? <p className="p-5 text-center text-xs text-muted">No recommendations are available.</p> : <div className="grid gap-3 p-3 md:grid-cols-2">
      {items.map((item, index) => <article className="flex min-w-0 flex-col rounded-xl border border-line bg-panel2 p-3" key={`${item.category}:${item.title}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="grid h-5 w-5 place-items-center rounded-md bg-violet-500/10 text-[9px] font-semibold text-violet-400">{index + 1}</span>
          <span className={`tag ${severityClass(item.severity)}`}>{item.severity}</span>
          <span className="tag">{item.category}</span>
          <span className="ml-auto text-[9px] text-muted">Effort: {item.effort}</span>
        </div>
        <h3 className="mb-1 mt-3 text-xs font-semibold">{item.title}</h3>
        <p className="mb-3 flex-1 text-[10px] leading-5 text-muted">{item.description}</p>
        <Button variant="secondary" size="sm" className="self-start" onClick={() => onGenerateFix(item)} disabled={Boolean(busyTitle)}>
          {busyTitle === item.title ? <Sparkles size={13} className="animate-pulse"/> : <ArrowRight size={13}/>}
          {busyTitle === item.title ? "Generating..." : "Generate fix with AI"}
        </Button>
      </article>)}
    </div>}
  </section>;
}
