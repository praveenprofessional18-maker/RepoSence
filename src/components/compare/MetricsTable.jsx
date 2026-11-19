import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Play } from "lucide-react";
import { percentDiff } from "../../utils/compareEngine";

const categories = ["Popularity", "Activity", "Size and structure", "Quality", "Security", "Stack"];

function formatValue(value, unit) {
  if (value === "Not analyzed" || value === "Not available") return value;
  if (value === null || value === undefined || value === "") return "Not available";
  if (unit === "date") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
  }
  if (typeof value === "number") return unit === "/100" ? `${value}/100` : `${value.toLocaleString()}${unit ? ` ${unit}` : ""}`;
  return `${value}${unit && unit !== "/100" ? ` ${unit}` : unit}`;
}

function differenceLabel(metric) {
  const left = Number(metric.a);
  const right = Number(metric.b);
  if (!Number.isFinite(left) || !Number.isFinite(right) || left === right || metric.winner === "n/a") return "";
  const delta = Math.abs(left - right);
  const percent = percentDiff(left, right);
  if (metric.unit === "issues" || metric.unit === "findings") {
    const direction = metric.higherIsBetter ? "more" : "fewer";
    return `${delta.toLocaleString()} ${direction} · Repo ${metric.winner.toUpperCase()}`;
  }
  return percent === null ? `${delta.toLocaleString()} ${metric.unit || "difference"}` : `${percent}% difference`;
}

function ValueCell({ metric, side, repoId, onRunNow }) {
  const value = metric[side];
  const winner = metric.winner === side;
  const missing = value === "Not analyzed" && metric.requiresAnalysis;
  const showRunAction = missing && (
    (metric.requiresAnalysis === "health" && metric.id === "health-overall") ||
    (metric.requiresAnalysis === "security" && metric.id === "security-safety")
  );
  return <td className={winner ? "bg-emerald-500/5 font-semibold text-emerald-500" : ""}>
    <span>{formatValue(value, metric.unit)}</span>
    {showRunAction && <button className="ml-2 inline-flex items-center gap-1 text-[9px] text-violet-400 underline underline-offset-2" onClick={() => onRunNow(repoId, metric.requiresAnalysis)} aria-label={`Run ${metric.requiresAnalysis} scan for Repo ${side.toUpperCase()}`}><Play size={9}/>Run now</button>}
  </td>;
}

export default function MetricsTable({ metrics, repos, onRunNow }) {
  const [category, setCategory] = useState("All");
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const visible = useMemo(() => metrics.filter((item) =>
    (category === "All" || item.category === category) &&
    (!differencesOnly || item.winner === "a" || item.winner === "b")
  ), [metrics, category, differencesOnly]);
  const grouped = categories.map((name) => ({
    name,
    items: visible.filter((item) => item.category === name)
  })).filter((group) => group.items.length);

  return <section className="card min-w-0" aria-label="Comparison metrics">
    <div className="card-header flex-wrap gap-3">
      <div><h2 className="card-title m-0">Metrics</h2><p className="mb-0 mt-1 text-[9px] text-muted">Popularity signals are directional; size and structure metrics are informational only.</p></div>
      <label className="flex items-center gap-2 text-[10px] text-muted"><input type="checkbox" checked={differencesOnly} onChange={(event) => setDifferencesOnly(event.target.checked)}/>Show differences only</label>
    </div>
    <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-3" role="group" aria-label="Filter metrics by category">
      {["All", ...categories].map((item) => <button key={item} type="button" className={`tag transition ${category === item ? "!border-violet-500/40 !text-violet-400" : ""}`} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
    </div>
    <div className="w-full overflow-x-auto">
      <table className="data-table min-w-[690px]">
        <thead className="sticky top-0 z-10 bg-panel"><tr><th>Metric</th><th>Repo A</th><th>Repo B</th><th>Difference</th><th>Winner</th></tr></thead>
        <tbody>
          {grouped.length ? grouped.map((group) => <FragmentGroup key={group.name} group={group} repos={repos} onRunNow={onRunNow}/>) :
            <tr><td colSpan={5} className="py-8 text-center text-muted">No directional differences match this filter.</td></tr>}
        </tbody>
      </table>
    </div>
  </section>;
}

function FragmentGroup({ group, repos, onRunNow }) {
  return <>
    <tr><th colSpan={5} className="!bg-panel2 !text-left !text-[9px]">{group.name}</th></tr>
    {group.items.map((metric) => <tr key={metric.id}>
      <td className="min-w-[180px] whitespace-normal">
        <strong className="block text-[10px] font-medium text-main">{metric.label}</strong>
        {metric.note && <small className="mt-1 block max-w-xs whitespace-normal text-[9px] leading-4 text-muted">{metric.note}</small>}
      </td>
      <ValueCell metric={metric} side="a" repoId={repos[0].id} onRunNow={onRunNow}/>
      <ValueCell metric={metric} side="b" repoId={repos[1].id} onRunNow={onRunNow}/>
      <td className="text-[9px] text-muted">{differenceLabel(metric)}</td>
      <td>{metric.winner === "n/a"
        ? <span className="tag">N/A</span>
        : metric.winner === "tie"
          ? <span className="tag">Tie / info</span>
          : <span className="tag tag-success">{metric.winner === "a" ? "Repo A" : "Repo B"} {metric.higherIsBetter ? <ArrowUp size={10}/> : <ArrowDown size={10}/>}</span>}
      </td>
    </tr>)}
  </>;
}
