import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, FileWarning } from "lucide-react";

function formatSize(bytes) {
  if (!Number(bytes)) return "—";
  return Number(bytes) >= 1024 * 1024 ? `${(Number(bytes) / 1024 / 1024).toFixed(2)} MB` : `${(Number(bytes) / 1024).toFixed(1)} KB`;
}

export default function LargestFilesTable({ files, onOpen }) {
  const [sortKey, setSortKey] = useState("size");
  const [descending, setDescending] = useState(true);
  const sorted = useMemo(() => [...files].sort((left, right) => {
    const result = sortKey === "path"
      ? left.path.localeCompare(right.path)
      : (left[sortKey] ?? -1) - (right[sortKey] ?? -1);
    return descending ? -result : result;
  }), [files, sortKey, descending]);
  const toggleSort = (key) => {
    if (sortKey === key) setDescending((value) => !value);
    else {
      setSortKey(key);
      setDescending(key !== "path");
    }
  };
  const sortIcon = (key) => sortKey !== key ? <ArrowUpDown size={11}/> : descending ? <ArrowDown size={11}/> : <ArrowUp size={11}/>;

  return <section className="card min-w-0">
    <div className="card-header"><span className="card-title flex items-center gap-2"><FileWarning size={14} className="text-amber-400"/>Largest files</span><span className="tag">Top {files.length}</span></div>
    {!files.length ? <p className="p-5 text-center text-xs text-muted">No file-size data is available.</p> : <div className="table-wrap">
      <table className="data-table min-w-[440px]">
        <thead><tr>
          <th><button className="inline-flex items-center gap-1" onClick={() => toggleSort("path")} aria-label="Sort largest files by path">Path {sortIcon("path")}</button></th>
          <th><button className="inline-flex items-center gap-1" onClick={() => toggleSort("size")} aria-label="Sort largest files by size">Size {sortIcon("size")}</button></th>
          <th><button className="inline-flex items-center gap-1" onClick={() => toggleSort("lines")} aria-label="Sort largest files by lines">Lines {sortIcon("lines")}</button></th>
        </tr></thead>
        <tbody>{sorted.map((file) => <tr key={file.path}>
          <td className="max-w-[360px]"><button className="block max-w-full truncate text-left font-mono text-[10px] text-violet-400 hover:underline" title={`Open ${file.path} in Structure`} onClick={() => onOpen(file.path)}>{file.path}</button></td>
          <td className="whitespace-nowrap text-muted">{formatSize(file.size)}</td>
          <td className="text-muted">{file.lines ?? "—"}</td>
        </tr>)}</tbody>
      </table>
    </div>}
  </section>;
}
