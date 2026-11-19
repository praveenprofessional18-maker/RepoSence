import { useState } from "react";
import { Copy, RefreshCw, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import toast from "react-hot-toast";
import { Button, ErrorState, Skeleton } from "../common";
import { aiService } from "../../services/aiService";

export default function CompareAiSummary({ comparison }) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await aiService.getComparisonAiSummary(comparison);
      setSummary(result.summary || result.answer || "");
    } catch (summaryError) {
      setError(summaryError.message || "Could not generate an AI comparison summary.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      toast.success("Comparison summary copied");
    } catch (copyError) {
      toast.error(copyError.message || "Clipboard access is unavailable.");
    }
  };

  return <section className="card min-w-0">
    <div className="card-header flex-wrap gap-3">
      <div><h2 className="card-title m-0 flex items-center gap-2"><Sparkles size={14} className="text-violet-400"/>AI comparison summary</h2><p className="mb-0 mt-1 text-[9px] text-muted">Only repository names and compact comparison metrics are sent. No file contents are included.</p></div>
      <div className="flex gap-2">
        {summary && <Button variant="secondary" size="sm" onClick={copy} disabled={loading}><Copy size={12}/>Copy</Button>}
        <Button size="sm" onClick={generate} disabled={loading}>{loading ? <RefreshCw size={12} className="animate-spin"/> : <Sparkles size={12}/>} {summary ? "Regenerate" : "Generate AI summary"}</Button>
      </div>
    </div>
    <div className="p-4">
      {loading ? <div className="grid gap-3" role="status" aria-label="Generating comparison summary"><Skeleton className="w-full"/><Skeleton className="w-5/6"/><Skeleton className="w-2/3 h-24"/></div> :
        error ? <ErrorState message={error} onRetry={generate}/> :
          summary ? <div className="prose prose-sm max-w-none text-[11px] leading-6 text-muted dark:prose-invert"><ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown></div> :
            <p className="m-0 py-5 text-center text-[10px] text-muted">Generate an advisory summary of the available repository metrics.</p>}
      <p className="mb-0 mt-3 border-t border-line pt-3 text-[9px] text-muted">AI output may be incomplete or inaccurate.</p>
    </div>
  </section>;
}
