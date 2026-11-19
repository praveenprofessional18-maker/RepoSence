import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Activity, Copy, ShieldCheck, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button, EmptyState, ErrorState, Skeleton } from "../../common";
import { aiService } from "../../../services/aiService";
import { repoService } from "../../../services/repoService";
import CategoryCard from "./CategoryCard";
import ChecklistCard from "./ChecklistCard";
import FileSizeChart from "./FileSizeChart";
import FileTypeChart from "./FileTypeChart";
import HealthScoreGauge from "./HealthScoreGauge";
import HealthSkeleton from "./HealthSkeleton";
import ImprovementsList from "./ImprovementsList";
import LargestFilesTable from "./LargestFilesTable";
import SecurityScanSection from "../security/SecurityScanSection";
import TodoList from "./TodoList";

const CATEGORY_LABELS = {
  documentation: "Documentation",
  testing: "Testing",
  structure: "Structure",
  dependencies: "Dependencies",
  maintainability: "Maintainability"
};
const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS);

export default function HealthTab({ analysisId, repository, onReport, onSecurityReport }) {
  const location = useLocation();
  const navigate = useNavigate();
  const requestedSection = new URLSearchParams(location.search).get("section")?.toLowerCase() || "overview";
  const [report, setReport] = useState(() => repository.healthReport || null);
  const [loading, setLoading] = useState(!repository.healthReport);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [expandedCategory, setExpandedCategory] = useState("");
  const [fixRequest, setFixRequest] = useState(null);
  const [fixAnswer, setFixAnswer] = useState("");
  const [fixError, setFixError] = useState("");
  const [fixLoading, setFixLoading] = useState(false);
  const categoryRefs = useRef({});
  const onReportRef = useRef(onReport);
  const onSecurityReportRef = useRef(onSecurityReport);

  useEffect(() => {
    onReportRef.current = onReport;
  }, [onReport]);
  useEffect(() => {
    onSecurityReportRef.current = onSecurityReport;
  }, [onSecurityReport]);
  const reportSecurity = useCallback((securityReport) => onSecurityReportRef.current?.(securityReport), []);

  const scan = useCallback(async (force = false) => {
    setError("");
    setProgress({ completed: 0, total: 0 });
    if (force) setLoading(true);
    if (force) setScanning(true);
    try {
      const nextReport = await repoService.getHealthReport(analysisId, setProgress, { force });
      setReport(nextReport);
      onReportRef.current?.(nextReport);
      if (force) toast.success("Health report updated");
    } catch (scanError) {
      setError(scanError.message || "Could not scan repository health.");
    } finally {
      setLoading(false);
      setScanning(false);
    }
  }, [analysisId]);

  useEffect(() => {
    if (requestedSection === "security") return;
    if (repository.healthReport) {
      setReport(repository.healthReport);
      setLoading(false);
      return;
    }
    scan();
  }, [repository.healthReport, scan, requestedSection]);

  const requestedCategory = new URLSearchParams(location.search).get("category")?.toLowerCase() || "";
  useEffect(() => {
    if (!report || !CATEGORY_KEYS.includes(requestedCategory)) return;
    setExpandedCategory(requestedCategory);
    requestAnimationFrame(() => categoryRefs.current[requestedCategory]?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [report, requestedCategory]);

  useEffect(() => {
    if (!fixRequest) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setFixRequest(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [fixRequest]);

  const openFile = (path) => navigate(`/analysis/${analysisId}?file=${encodeURIComponent(path)}`);
  const generateFix = async (improvement) => {
    setFixRequest(improvement);
    setFixAnswer("");
    setFixError("");
    setFixLoading(true);
    try {
      const result = await aiService.generateFix({ repository: repository.fullName, improvement });
      setFixAnswer(result.answer || result.fix || "No fix guidance was returned.");
      toast.success("AI fix guidance is ready");
    } catch (generationError) {
      setFixError(generationError.message || "Could not generate fix guidance.");
      toast.error(generationError.message || "Could not generate fix guidance.");
    } finally {
      setFixLoading(false);
    }
  };
  const copyFix = async () => {
    try {
      await navigator.clipboard.writeText(fixAnswer);
      toast.success("Fix guidance copied");
    } catch (copyError) {
      toast.error(copyError.message || "Clipboard access is unavailable.");
    }
  };

  if (loading && !report && requestedSection !== "security") return <div>
    <HealthSkeleton/>
    {progress.total > 0 && <div className="card mt-4 p-4" role="status" aria-live="polite">
      <div className="mb-2 flex justify-between text-[10px] text-muted"><span>Scanning {progress.completed} / {progress.total} files...</span><span>{Math.round(progress.completed / progress.total * 100)}%</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-panel2"><div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${progress.completed / progress.total * 100}%` }}/></div>
    </div>}
  </div>;
  if (error && !report && requestedSection !== "security") return <ErrorState message={error} onRetry={() => scan(true)}/>;
  if (!report && requestedSection !== "security") return <EmptyState title="Health report is unavailable" description="Retry the scan to analyze this saved repository." action={<Button onClick={() => scan(true)}>Retry scan</Button>}/>;

  const categoryEntries = Object.entries(report?.categories || {}).filter(([key]) => CATEGORY_LABELS[key]);

  return <div className="grid gap-4">
    <nav className="flex flex-wrap gap-2" aria-label="Health sections">
      <button className={`workspace-tab ${requestedSection !== "security" ? "active" : ""}`} onClick={() => navigate(`/analysis/${analysisId}/health`)}>Health overview</button>
      <button className={`workspace-tab ${requestedSection === "security" ? "active" : ""}`} onClick={() => navigate(`/analysis/${analysisId}/health?section=security`)}><ShieldCheck size={14}/>Security</button>
    </nav>
    {requestedSection === "security" ? <SecurityScanSection analysisId={analysisId} repository={repository} onReport={reportSecurity}/> : <>
    {error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-[10px] text-rose-300" role="alert">
      {error} <button className="ml-2 underline" onClick={() => scan(true)}>Retry</button>
    </div>}
    {scanning && progress.total > 0 && <div className="card p-3" role="status" aria-live="polite">
      <div className="mb-2 flex justify-between text-[10px] text-muted"><span>Scanning {progress.completed} / {progress.total} files...</span><span>{Math.round(progress.completed / progress.total * 100)}%</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-panel2"><div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${progress.completed / progress.total * 100}%` }}/></div>
    </div>}
    <HealthScoreGauge report={report} onRescan={() => scan(true)} scanning={scanning}/>
    <section aria-label="Health categories">
      <div className="mb-2 flex items-center justify-between"><h2 className="m-0 text-xs font-semibold">Health categories</h2><span className="text-[9px] text-muted">Each category weighted equally</span></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {categoryEntries.map(([key, category]) => <CategoryCard
          key={key}
          id={key}
          label={CATEGORY_LABELS[key]}
          category={category}
          expand={expandedCategory === key}
          cardRef={(node) => { categoryRefs.current[key] = node; }}
        />)}
      </div>
    </section>
    <ChecklistCard items={report.checklist}/>
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      <FileSizeChart files={report.largestFiles}/>
      <FileTypeChart distribution={report.fileTypeDistribution}/>
    </div>
    <LargestFilesTable files={report.largestFiles} onOpen={openFile}/>
    <TodoList items={report.todoItems} onOpen={openFile}/>
    <ImprovementsList items={report.topImprovements} onGenerateFix={generateFix} busyTitle={fixLoading ? fixRequest?.title : ""}/>
    <SecurityScanSection analysisId={analysisId} repository={repository} onReport={reportSecurity}/>
    <p className="m-0 text-center text-[9px] leading-5 text-muted">Health score is a heuristic estimate based on repository structure and sampled files. It is not a full code audit.</p>
    </>}

    {fixRequest && <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onMouseDown={(event) => { if (event.target === event.currentTarget) setFixRequest(null); }}>
      <aside className="flex h-full w-full max-w-md flex-col border-l border-line bg-panel shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="health-fix-title">
        <div className="flex items-start gap-3 border-b border-line p-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-400"><Activity size={15}/></span>
          <div className="min-w-0 flex-1"><h2 id="health-fix-title" className="m-0 text-sm font-semibold">AI fix guidance</h2><p className="mb-0 mt-1 text-[10px] text-muted">{fixRequest.title}</p></div>
          <button className="icon-btn !h-7 !w-7" aria-label="Close AI fix guidance" onClick={() => setFixRequest(null)}><X size={15}/></button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {fixLoading ? <div className="grid gap-3" role="status" aria-label="Generating fix guidance"><Skeleton className="w-full"/><Skeleton className="w-5/6"/><Skeleton className="w-2/3"/></div> :
            fixError ? <ErrorState message={fixError} onRetry={() => generateFix(fixRequest)}/> :
              <p className="whitespace-pre-wrap text-xs leading-6 text-muted">{fixAnswer}</p>}
        </div>
        <div className="border-t border-line p-4">
          <div className="mb-3 text-[9px] leading-5 text-muted">AI output is advisory. Review any suggested changes and tests before applying them.</div>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setFixRequest(null)}>Close</Button><Button onClick={copyFix} disabled={fixLoading || !fixAnswer}><Copy size={13}/>Copy guidance</Button></div>
        </div>
      </aside>
    </div>}
  </div>;
}
