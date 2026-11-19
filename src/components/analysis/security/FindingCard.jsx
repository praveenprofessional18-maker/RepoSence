import { useState } from "react";
import { Check, ChevronDown, Copy, ExternalLink, FileCode2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../common";

function severityClass(severity) {
  if (severity === "critical" || severity === "high") return "tag-danger";
  if (severity === "medium") return "tag-warning";
  return "";
}

export default function FindingCard({ finding, falsePositive, onToggleFalsePositive, onExplain, onOpenFile }) {
  const [fixOpen, setFixOpen] = useState(false);
  const copyFix = async () => {
    try {
      await navigator.clipboard.writeText(finding.howToFix || "");
      toast.success("Fix tip copied");
    } catch (error) {
      toast.error(error.message || "Clipboard access is unavailable.");
    }
  };
  return <article className={`min-w-0 rounded-xl border p-4 ${falsePositive ? "border-line bg-panel2/50 opacity-75" : "border-line bg-panel"}`}>
    <div className="flex flex-wrap items-start gap-2">
      <span className={`tag capitalize ${severityClass(finding.severity)}`}>{finding.severity}</span>
      <span className="tag">{finding.type.replace("-", " ")}</span>
      {falsePositive && <span className="tag tag-warning">False positive</span>}
      <h3 className="m-0 min-w-[160px] flex-1 pt-1 text-xs font-semibold">{finding.title}</h3>
    </div>
    <button type="button" className="mt-3 inline-flex max-w-full items-center gap-1.5 truncate text-left font-mono text-[10px] text-violet-400 hover:underline" onClick={onOpenFile} aria-label={`Open ${finding.path || "finding location"}${finding.line ? ` at line ${finding.line}` : ""} in Structure`}>
      <FileCode2 size={12} className="shrink-0"/><span className="truncate">{finding.path || "Repository configuration"}{finding.line ? `:${finding.line}` : ""}</span>
    </button>
    {finding.maskedSnippet && <pre className="mt-3 max-h-32 overflow-auto rounded-lg border border-line bg-panel2 p-3 font-mono text-[10px] leading-5 text-main"><code>{finding.maskedSnippet}</code></pre>}
    <p className="mb-0 mt-3 text-[10px] leading-5 text-muted">{finding.description}</p>
    <div className="mt-3">
      <button className="inline-flex items-center gap-1 text-[10px] font-medium text-main hover:text-violet-400" aria-expanded={fixOpen} onClick={() => setFixOpen((value) => !value)}>
        How to fix <ChevronDown size={12} className={`transition-transform ${fixOpen ? "rotate-180" : ""}`}/>
      </button>
      {fixOpen && <div className="mt-2 rounded-lg bg-panel2 p-3 text-[10px] leading-5 text-muted"><ol className="m-0 grid list-decimal gap-1 pl-4"><li>Review the affected file and confirm the finding in context.</li><li>{finding.howToFix}</li><li>Re-scan the repository and check whether any exposed value remains in Git history.</li></ol></div>}
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
      <Button variant="secondary" size="sm" onClick={onToggleFalsePositive} aria-pressed={falsePositive}>{falsePositive ? <Check size={12}/> : null}{falsePositive ? "Undo false positive" : "Mark as false positive"}</Button>
      <Button variant="secondary" size="sm" onClick={copyFix}><Copy size={12}/>Copy fix tip</Button>
      <Button variant="secondary" size="sm" onClick={onExplain}><Sparkles size={12}/>Explain this with AI</Button>
      {finding.reference && <a className="ml-auto inline-flex items-center gap-1 text-[9px] text-muted hover:text-violet-400" href={finding.reference} target="_blank" rel="noreferrer">Reference <ExternalLink size={11}/></a>}
    </div>
  </article>;
}
