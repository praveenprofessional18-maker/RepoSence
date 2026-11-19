import { Check, CircleX, ListChecks } from "lucide-react";

function severityClass(severity) {
  if (severity === "critical") return "tag-danger";
  if (severity === "warning") return "tag-warning";
  return "";
}

export default function ChecklistCard({ items }) {
  return <section className="card">
    <div className="card-header"><span className="card-title flex items-center gap-2"><ListChecks size={14} className="text-violet-400"/>Standard files checklist</span><span className="tag">{items.filter((item) => item.present).length}/{items.length} present</span></div>
    <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => <div className="flex min-w-0 items-start gap-2 rounded-lg border border-line bg-panel2 p-3" key={item.id}>
        {item.present ? <Check size={14} className="mt-0.5 shrink-0 text-emerald-400" aria-label="Present"/> : <CircleX size={14} className="mt-0.5 shrink-0 text-rose-400" aria-label="Missing"/>}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5"><strong className="text-[10px]">{item.label}</strong><span className={`tag ${item.present ? "tag-success" : severityClass(item.severity)}`}>{item.present ? "Present" : item.severity}</span></div>
          {!item.present && <p className="mb-0 mt-1 text-[9px] leading-4 text-muted">{item.tip}</p>}
        </div>
      </div>)}
    </div>
  </section>;
}
