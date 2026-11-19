import { lineDiff } from "../../../utils/aiActions";

export default function AiDiffView({ original, result }) {
  const lines = lineDiff(original, result);
  return <div className="ai-diff-view" aria-label="Diff between source file and AI result">
    <div className="ai-diff-legend"><span>Original vs generated</span><span><i className="removed"/>Removed <i className="added"/>Added</span></div>
    {!original && <p className="m-0 border-b border-line px-3 py-2 text-[9px] text-muted">Original source is unavailable for this saved history item.</p>}
    <pre className="m-0 overflow-auto p-2 font-mono text-[10px] leading-5">{lines.map((item, index) => <span className={`ai-diff-line ${item.type}`} key={`${item.type}-${item.oldLine}-${item.newLine}-${index}`}><span className="ai-diff-marker">{item.type === "added" ? "+" : item.type === "removed" ? "−" : " "}</span>{item.line || " "}</span>)}</pre>
  </div>;
}
