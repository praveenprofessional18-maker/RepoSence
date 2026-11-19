import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, Github, Search, X } from "lucide-react";
import { Input } from "../common";

function initials(name = "") {
  return name.split("/").pop()?.slice(0, 2).toUpperCase() || "GH";
}

function analyzedDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleDateString();
}

export default function RepoPicker({ slot, analyses, selectedId, url, onSelect, onUrlChange, otherSelectedId, error }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = analyses.find((item) => item.id === selectedId);
  const filtered = useMemo(() => analyses.filter((item) =>
    `${item.fullName} ${item.language}`.toLowerCase().includes(query.trim().toLowerCase())
  ), [analyses, query]);

  const selectRepository = (repository) => {
    if (repository.id === otherSelectedId) return;
    onSelect(repository);
    setOpen(false);
    setQuery("");
  };

  return <section className="card min-w-0 p-4" aria-label={`Choose Repo ${slot}`}>
    <div className="mb-3 flex items-center justify-between">
      <h2 className="m-0 text-xs font-semibold">Repo {slot}</h2>
      <span className="tag">{selected ? "Selected analysis" : "Choose a repository"}</span>
    </div>
    <div className="relative">
      <button
        type="button"
        className="flex min-h-12 w-full items-center gap-3 rounded-lg border border-line bg-panel2 p-3 text-left hover:border-violet-500/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
        aria-label={`Choose saved Repo ${slot}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {selected?.ownerAvatar
          ? <img src={selected.ownerAvatar} alt="" className="h-8 w-8 rounded-lg object-cover"/>
          : <span className="grid h-8 w-8 place-items-center rounded-lg bg-panel text-violet-400"><Github size={16}/></span>}
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-[11px]">{selected?.fullName || `Select Repo ${slot}`}</strong>
          <small className="mt-1 flex items-center gap-1 text-[9px] text-muted">
            {selected?.language || "Saved analyses"}{selected && <> · <CalendarDays size={10}/>{analyzedDate(selected.analyzedAt)}</>}
          </small>
        </span>
        <ChevronDown size={14} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}/>
      </button>
      {open && <div className="absolute z-30 mt-2 w-full rounded-lg border border-line bg-panel p-2 shadow-xl">
        <label className="search-wrap mb-2">
          <Search size={14}/>
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Escape" && setOpen(false)} placeholder="Search saved analyses..." aria-label={`Search Repo ${slot} analyses`}/>
          {query && <button type="button" aria-label="Clear saved analysis search" onClick={() => setQuery("")}><X size={13}/></button>}
        </label>
        <div className="max-h-56 overflow-auto" role="listbox" aria-label={`Saved analyses for Repo ${slot}`}>
          {filtered.length ? filtered.map((repository) => {
            const disabled = repository.id === otherSelectedId;
            return <button
              type="button"
              key={repository.id}
              role="option"
              aria-selected={repository.id === selectedId}
              aria-disabled={disabled}
              disabled={disabled}
              title={disabled ? "This repository is already selected in the other slot." : undefined}
              onClick={() => selectRepository(repository)}
              className="flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-panel2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {repository.ownerAvatar
                ? <img src={repository.ownerAvatar} alt="" className="h-7 w-7 rounded-md object-cover"/>
                : <span className="grid h-7 w-7 place-items-center rounded-md bg-panel2 text-[9px] text-violet-400">{initials(repository.fullName)}</span>}
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[10px]">{repository.fullName}</strong>
                <small className="text-[9px] text-muted">{repository.language || "Unknown"} · {analyzedDate(repository.analyzedAt)}</small>
              </span>
            </button>;
          }) : <p className="m-0 p-3 text-center text-[10px] text-muted">No saved analyses match.</p>}
        </div>
      </div>}
    </div>
    <div className="my-3 flex items-center gap-2 text-[9px] uppercase tracking-wide text-muted"><span className="h-px flex-1 bg-line"/>or paste URL<span className="h-px flex-1 bg-line"/></div>
    <Input
      value={url}
      onChange={(event) => onUrlChange(event.target.value)}
      placeholder="https://github.com/owner/repository"
      aria-label={`Paste GitHub URL for Repo ${slot}`}
      error={error}
    />
  </section>;
}
