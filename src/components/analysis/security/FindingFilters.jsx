const types = [
  ["all", "All types"],
  ["secret", "Secret"],
  ["risky-file", "Risky file"],
  ["dependency", "Dependency"],
  ["config", "Config"],
  ["code-pattern", "Code pattern"]
];

export default function FindingFilters({ type, onTypeChange, path, onPathChange, hideInfo, onHideInfoChange, sort, onSortChange }) {
  return <div className="flex flex-wrap items-center gap-2" aria-label="Filter security findings">
    <select className="select" value={type} onChange={(event) => onTypeChange(event.target.value)} aria-label="Filter by finding type">
      {types.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
    </select>
    <input className="input !h-9 min-w-[180px] flex-1 text-[11px] sm:flex-none" value={path} onChange={(event) => onPathChange(event.target.value)} placeholder="Search file path..." aria-label="Search findings by file path"/>
    <label className="flex items-center gap-2 px-1 text-[10px] text-muted"><input type="checkbox" checked={hideInfo} onChange={(event) => onHideInfoChange(event.target.checked)}/>Hide info</label>
    <select className="select" value={sort} onChange={(event) => onSortChange(event.target.value)} aria-label="Sort security findings">
      <option value="severity">Sort by severity</option>
      <option value="file">Sort by file</option>
    </select>
  </div>;
}
