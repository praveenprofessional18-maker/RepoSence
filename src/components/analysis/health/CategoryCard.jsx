import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, FlaskConical, Layers3, PackageCheck, Wrench } from "lucide-react";

const icons = {
  documentation: BookOpen,
  testing: FlaskConical,
  structure: Layers3,
  dependencies: PackageCheck,
  maintainability: Wrench
};

function scoreColor(score) {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

export default function CategoryCard({ id, label, category, expand = false, cardRef }) {
  const [open, setOpen] = useState(false);
  const Icon = icons[id] || Layers3;
  const score = category.score;
  const color = score === null ? "var(--muted)" : scoreColor(score);

  useEffect(() => {
    if (expand) setOpen(true);
  }, [expand]);

  return <section className="card scroll-mt-24" id={`health-category-${id}`} ref={cardRef}>
    <button className="flex w-full items-center gap-3 p-4 text-left" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-panel2" style={{ color }}><Icon size={15}/></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">{label}</span>
          <strong className="text-sm" style={{ color }}>{score ?? "—"}<span className="ml-1 text-[9px] font-normal text-muted">/100</span></strong>
        </span>
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-panel2">
          <span className="block h-full rounded-full transition-all duration-500" style={{ width: `${score ?? 0}%`, background: color }}/>
        </span>
      </span>
      <ChevronDown size={14} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}/>
    </button>
    {open && <div className="grid gap-2 border-t border-line px-4 py-3">
      {category.details.length ? category.details.map((detail) => <div className="flex items-start gap-2 text-[10px] leading-5 text-muted" key={detail.label}>
        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: scoreColor(detail.score) }}/>
        <span><strong className="font-medium text-main">{detail.label}:</strong> {detail.text}</span>
      </div>) : <p className="m-0 text-[10px] text-muted">Not enough data for this category.</p>}
    </div>}
  </section>;
}
