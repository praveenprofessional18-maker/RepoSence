import { lineDiff } from "../../utils/docBuilder";

export default function DiffViewer({ before, after, beforeLabel = "Before", afterLabel = "After" }) {
  const rows = lineDiff(before, after);
  return <div className="doc-diff-view" aria-label="Document line diff">
    <div className="doc-diff-labels"><span>{beforeLabel}</span><span>{afterLabel}</span></div>
    <div className="doc-diff-rows">{rows.map((row, index) => <div className="doc-diff-row" key={`${index}-${row.type}`}>
      <span className={`doc-diff-line ${row.type === "added" ? "empty" : row.type}`}><i>{row.type === "added" ? " " : row.type === "removed" ? "−" : " "}</i>{row.type === "added" ? "" : row.line || " "}</span>
      <span className={`doc-diff-line ${row.type === "removed" ? "empty" : row.type}`}><i>{row.type === "removed" ? " " : row.type === "added" ? "+" : " "}</i>{row.type === "removed" ? "" : row.line || " "}</span>
    </div>)}</div>
  </div>;
}
