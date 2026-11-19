import { useMemo, useState } from "react";
import { Search } from "lucide-react";

function DependencyChip({ dependency, shared = false }) {
  return <li className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-line bg-panel2 px-2.5 py-2 text-[9px]">
    <span className="truncate font-medium">{dependency.name}</span>
    {shared ? <span className="shrink-0 text-muted">
      {dependency.versionA} / {dependency.versionB}
      {dependency.differs && <span className="ml-1 rounded bg-amber-500/10 px-1 py-0.5 text-amber-500">version differs</span>}
    </span> : <span className="shrink-0 text-muted">{dependency.version}</span>}
  </li>;
}

export default function DependencyDiff({ dependencies }) {
  const [query, setQuery] = useState("");
  const filter = (items) => items.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()));
  const filtered = useMemo(() => ({
    onlyA: filter(dependencies.onlyA),
    shared: filter(dependencies.shared),
    onlyB: filter(dependencies.onlyB)
  }), [dependencies, query]);
  const columns = [
    { key: "onlyA", title: "Only in Repo A", count: dependencies.onlyA.length },
    { key: "shared", title: "Shared", count: dependencies.shared.length },
    { key: "onlyB", title: "Only in Repo B", count: dependencies.onlyB.length }
  ];

  return <section className="card min-w-0">
    <div className="card-header flex-wrap gap-3">
      <div><h2 className="card-title m-0">Dependency diff</h2><p className="mb-0 mt-1 text-[9px] text-muted">Repo A: {dependencies.countA} · Repo B: {dependencies.countB}</p></div>
      <label className="search-wrap w-full sm:max-w-56"><Search size={13}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search packages..." aria-label="Search dependency differences"/></label>
    </div>
    <div className="grid gap-3 p-4 lg:grid-cols-3">
      {columns.map(({ key, title, count }) => <section key={key} className="min-w-0">
        <h3 className="mb-2 flex items-center justify-between text-[10px] font-semibold">{title}<span className="tag">{count}</span></h3>
        <ul className="m-0 grid max-h-64 list-none gap-1.5 overflow-auto p-0">
          {filtered[key].length ? filtered[key].map((dependency) => <DependencyChip key={`${key}-${dependency.name}`} dependency={dependency} shared={key === "shared"}/>) :
            <li className="rounded-md border border-dashed border-line p-3 text-center text-[9px] text-muted">{query ? "No matches" : "None"}</li>}
        </ul>
      </section>)}
    </div>
  </section>;
}
