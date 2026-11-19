import { useMemo, useState } from "react";
import { ListTodo } from "lucide-react";
import { SearchInput } from "../../common";

const TYPES = ["TODO", "FIXME", "HACK", "XXX"];

export default function TodoList({ items, onOpen }) {
  const [activeType, setActiveType] = useState("All");
  const [query, setQuery] = useState("");
  const counts = useMemo(() => Object.fromEntries(TYPES.map((type) => [type, items.filter((item) => item.type === type).length])), [items]);
  const filtered = useMemo(() => items.filter((item) =>
    (activeType === "All" || item.type === activeType) &&
    `${item.path} ${item.text}`.toLowerCase().includes(query.toLowerCase())
  ), [items, activeType, query]);

  return <section className="card">
    <div className="card-header"><span className="card-title flex items-center gap-2"><ListTodo size={14} className="text-amber-400"/>TODO / FIXME / HACK markers</span><span className="tag">{items.length} sampled</span></div>
    <div className="grid gap-3 p-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter TODO markers by type">
        {["All", ...TYPES].map((type) => <button key={type} className={`tag cursor-pointer ${activeType === type ? "border-violet-500/60 text-violet-400" : ""}`} aria-pressed={activeType === type} onClick={() => setActiveType(type)}>
          {type}{type !== "All" && <span className="ml-1 text-muted">{counts[type]}</span>}{type === "All" && <span className="ml-1 text-muted">{items.length}</span>}
        </button>)}
      </div>
      <SearchInput value={query} onChange={setQuery} placeholder="Search TODO markers..."/>
      {filtered.length ? <ul className="m-0 grid max-h-80 gap-2 overflow-auto p-0">
        {filtered.map((item, index) => <li className="list-none rounded-lg border border-line bg-panel2 p-3" key={`${item.path}:${item.line}:${index}`}>
          <div className="flex flex-wrap items-center gap-2"><span className={`tag ${item.type === "FIXME" || item.type === "HACK" ? "tag-warning" : ""}`}>{item.type}</span><span className="text-[9px] text-muted">Line {item.line}</span></div>
          <p className="mb-1 mt-2 break-words text-[10px] leading-5 text-main">{item.text}</p>
          <button className="max-w-full truncate text-left font-mono text-[9px] text-violet-400 hover:underline" title={`Open ${item.path} in Structure`} onClick={() => onOpen(item.path)}>{item.path}</button>
        </li>)}
      </ul> : <p className="m-0 py-5 text-center text-[10px] text-muted">{items.length ? "No markers match this filter." : "No TODO-style markers were found in the sampled text."}</p>}
    </div>
  </section>;
}
