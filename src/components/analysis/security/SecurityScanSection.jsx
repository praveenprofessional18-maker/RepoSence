import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Download, RefreshCw, ShieldAlert, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Button, EmptyState, ErrorState } from "../../common";
import { aiService } from "../../../services/aiService";
import { repoService } from "../../../services/repoService";
import { getSecuritySummary, scoreFromFindings } from "../../../utils/securityScanner";
import FindingFilters from "./FindingFilters";
import FindingsTable from "./FindingsTable";
import RiskGauge from "./RiskGauge";
import SecurityEmptyState from "./SecurityEmptyState";
import SecuritySkeleton from "./SecuritySkeleton";
import SeveritySummary from "./SeveritySummary";

function downloadReport(fileName, data, contentType) {
  const blob = new Blob([data], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function SecurityScanView({ analysisId, repository, onReport }) {
  const navigate = useNavigate();
  const [report, setReport] = useState(repository.securityReport || null);
  const [loading, setLoading] = useState(!repository.securityReport);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [severity, setSeverity] = useState("all");
  const [type, setType] = useState("all");
  const [pathQuery, setPathQuery] = useState("");
  const [hideInfo, setHideInfo] = useState(false);
  const [sort, setSort] = useState("severity");
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [falsePositiveBusy, setFalsePositiveBusy] = useState("");
  const [explanation, setExplanation] = useState(null);
  const [explanationText, setExplanationText] = useState("");
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationError, setExplanationError] = useState("");
  const onReportRef = useRef(onReport);

  useEffect(() => {
    onReportRef.current = onReport;
  }, [onReport]);

  const scan = useCallback(async (force = false) => {
    setError("");
    setProgress({ completed: 0, total: 0 });
    if (force) setScanning(true);
    setLoading(true);
    try {
      const next = await repoService.getSecurityReport(analysisId, setProgress, { force });
      setReport(next);
      onReportRef.current?.(next);
      if (force) toast.success("Security scan complete");
    } catch (scanError) {
      setError(scanError.message || "Could not scan this repository.");
    } finally {
      setLoading(false);
      setScanning(false);
    }
  }, [analysisId]);

  useEffect(() => {
    if (repository.securityReport) {
      setReport(repository.securityReport);
      setLoading(false);
      return;
    }
    scan();
  }, [repository.securityReport, scan]);

  useEffect(() => {
    if (!explanation) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setExplanation(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [explanation]);

  const falsePositives = report?.falsePositives || [];
  const activeFindings = useMemo(() => (report?.findings || []).filter((finding) => !falsePositives.includes(finding.id)), [report?.findings, falsePositives]);
  const allFindings = report?.findings || [];
  const summary = useMemo(() => getSecuritySummary(activeFindings), [activeFindings]);
  const riskScore = useMemo(() => scoreFromFindings(activeFindings), [activeFindings]);
  const riskLevel = riskScore >= 90 ? "low" : riskScore >= 70 ? "medium" : riskScore >= 40 ? "high" : "critical";
  const hasCriticalSecret = activeFindings.some((finding) => finding.severity === "critical" && finding.type === "secret");

  const filteredFindings = useMemo(() => {
    const severityRank = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return allFindings
      .filter((finding) => severity === "all" || finding.severity === severity)
      .filter((finding) => type === "all" || finding.type === type)
      .filter((finding) => !hideInfo || finding.severity !== "info")
      .filter((finding) => `${finding.path || ""}`.toLowerCase().includes(pathQuery.trim().toLowerCase()))
      .sort((left, right) => sort === "file"
        ? (left.path || "").localeCompare(right.path || "") || (left.line || 0) - (right.line || 0)
        : severityRank[left.severity] - severityRank[right.severity] || (left.path || "").localeCompare(right.path || ""));
  }, [allFindings, severity, type, hideInfo, pathQuery, sort]);

  const toggleFalsePositive = async (findingId) => {
    if (!report || falsePositiveBusy) return;
    setFalsePositiveBusy(findingId);
    const nextFalsePositives = falsePositives.includes(findingId)
      ? falsePositives.filter((id) => id !== findingId)
      : [...falsePositives, findingId];
    try {
      const next = await repoService.updateSecurityReport(analysisId, { ...report, falsePositives: nextFalsePositives });
      setReport(next);
      onReport?.(next);
      toast.success(nextFalsePositives.includes(findingId) ? "Finding marked as a false positive" : "False-positive mark removed");
    } catch (updateError) {
      toast.error(updateError.message || "Could not save this finding status.");
    } finally {
      setFalsePositiveBusy("");
    }
  };

  const openFile = (finding) => {
    if (!finding.path) {
      navigate(`/analysis/${analysisId}/health?section=security`);
      return;
    }
    const query = new URLSearchParams({ file: finding.path });
    if (finding.line) query.set("line", finding.line);
    navigate(`/analysis/${analysisId}?${query.toString()}`);
  };

  const explainFinding = async (finding) => {
    setExplanation(finding);
    setExplanationText("");
    setExplanationError("");
    setExplanationLoading(true);
    try {
      const result = await aiService.explainSecurity({
        maskedSnippet: finding.maskedSnippet || "",
        rule: { id: finding.ruleId, title: finding.title, severity: finding.severity, howToFix: finding.howToFix }
      });
      setExplanationText(result.explanation || "No explanation was returned.");
    } catch (explainError) {
      setExplanationError(explainError.message || "Could not explain this finding.");
    } finally {
      setExplanationLoading(false);
    }
  };

  const exportReport = (format) => {
    if (!report) return;
    const safeReport = {
      ...report,
      findings: (report.findings || []).map((finding) => ({ ...finding, maskedSnippet: finding.maskedSnippet || "" }))
    };
    if (format === "json") {
      downloadReport(`${repository.name}-security-report.json`, JSON.stringify(safeReport, null, 2), "application/json");
    } else {
      const lines = [
        `# Security scan: ${repository.fullName}`,
        "",
        `- Safety score: ${riskScore}/100`,
        `- Risk level: ${riskLevel}`,
        `- Scanned files: ${report.scannedFiles}`,
        `- Skipped files: ${report.skippedFiles}`,
        `- Scanned at: ${report.scannedAt || "Unknown"}`,
        "",
        "## Summary",
        "",
        ...Object.entries(summary).map(([level, count]) => `- ${level}: ${count}`),
        "",
        "## Findings",
        "",
        ...(activeFindings.length ? activeFindings.map((finding) => [
          `### [${finding.severity.toUpperCase()}] ${finding.title}`,
          "",
          `- Type: ${finding.type}`,
          `- File: ${finding.path || "Repository configuration"}${finding.line ? `:${finding.line}` : ""}`,
          `- Rule: ${finding.ruleId}`,
          finding.maskedSnippet ? `- Masked sample: \`${finding.maskedSnippet.replace(/`/g, "\\`")}\`` : "",
          `- Description: ${finding.description}`,
          `- How to fix: ${finding.howToFix}`,
          finding.reference ? `- Reference: ${finding.reference}` : "",
          ""
        ].filter(Boolean).join("\n")) : ["No active findings." ]),
        "",
        "> Basic heuristic scan, not a full security audit. It may produce false positives or miss issues."
      ].join("\n");
      downloadReport(`${repository.name}-security-report.md`, lines, "text/markdown");
    }
    toast.success(`Security report downloaded as ${format.toUpperCase()}`);
  };

  if (loading && !report) return <div>
    <SecuritySkeleton/>
    {progress.total > 0 && <div className="card mt-3 p-4" role="status" aria-live="polite">
      <div className="mb-2 flex justify-between text-[10px] text-muted"><span>Scanning {progress.completed} / {progress.total} files...</span><span>{Math.round(progress.completed / progress.total * 100)}%</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-panel2"><div className="h-full bg-violet-500 transition-all" style={{ width: `${progress.completed / progress.total * 100}%` }}/></div>
    </div>}
  </div>;
  if (error && !report) return <ErrorState message={error} onRetry={() => scan(true)}/>;
  if (!report) return <EmptyState title="Security report is unavailable" description="Retry the scan to inspect this saved repository." action={<Button onClick={() => scan(true)}>Retry scan</Button>}/>;

  return <section className="grid min-w-0 gap-4" aria-label="Security and secrets scan">
    {error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-[10px] text-rose-300" role="alert">{error}<button className="ml-2 underline" onClick={() => scan(true)}>Retry</button></div>}
    {scanning && progress.total > 0 && <div className="card p-3" role="status" aria-live="polite">
      <div className="mb-2 flex justify-between text-[10px] text-muted"><span>Scanning {progress.completed} / {progress.total} files...</span><span>{Math.round(progress.completed / progress.total * 100)}%</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-panel2"><div className="h-full bg-violet-500 transition-all" style={{ width: `${progress.completed / progress.total * 100}%` }}/></div>
    </div>}
    <div className="card">
      <div className="card-header flex-wrap gap-3">
        <div className="flex items-center gap-2"><ShieldAlert size={15} className="text-violet-400"/><span className="card-title">Security &amp; secrets scan</span></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => exportReport("md")} aria-label="Download masked security report as Markdown"><Download size={13}/>Markdown</Button>
          <Button variant="secondary" size="sm" onClick={() => exportReport("json")} aria-label="Download masked security report as JSON"><Download size={13}/>JSON</Button>
          <Button variant="secondary" size="sm" onClick={() => scan(true)} disabled={scanning} aria-label="Re-scan repository security">{scanning ? <RefreshCw size={13} className="animate-spin"/> : <RefreshCw size={13}/>}Re-scan</Button>
        </div>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(240px,.75fr)_1fr] lg:items-center">
        <RiskGauge score={riskScore} level={riskLevel}/>
        <SeveritySummary summary={summary} selected={severity} onSelect={setSeverity}/>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-4 py-3 text-[9px] text-muted">
        <span>{report.scannedFiles} files scanned</span><span>{report.skippedFiles} skipped</span><span>Last scanned {report.scannedAt ? new Date(report.scannedAt).toLocaleString() : "unknown"}</span>
      </div>
    </div>

    {hasCriticalSecret && !alertDismissed && <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200" role="alert">
      <AlertTriangle size={17} className="mt-0.5 shrink-0 text-rose-400"/>
      <p className="m-0 flex-1 text-[11px] leading-5"><strong>Possible exposed secret detected.</strong> Rotate this credential immediately, even if you delete the file, it stays in Git history.</p>
      <button className="icon-btn !h-7 !w-7" aria-label="Dismiss exposed secret warning" onClick={() => setAlertDismissed(true)}><X size={13}/></button>
    </div>}

    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-[10px] leading-5 text-muted" role="note">
      Basic heuristic scan. Not a full security audit and may produce false positives or miss issues. Never share real secrets in chat or screenshots.
    </div>

    <FindingFilters type={type} onTypeChange={setType} path={pathQuery} onPathChange={setPathQuery} hideInfo={hideInfo} onHideInfoChange={setHideInfo} sort={sort} onSortChange={setSort}/>
    {!activeFindings.length && <SecurityEmptyState/>}
    {filteredFindings.length
      ? <FindingsTable findings={filteredFindings} falsePositives={falsePositives} onToggleFalsePositive={toggleFalsePositive} onExplain={explainFinding} onOpenFile={openFile}/>
      : activeFindings.length > 0 && <div className="card p-5 text-center text-xs text-muted">No findings match these filters.</div>}

    {explanation && <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onMouseDown={(event) => { if (event.target === event.currentTarget) setExplanation(null); }}>
      <aside className="flex h-full w-full max-w-md flex-col border-l border-line bg-panel shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="security-explanation-title">
        <div className="flex items-start gap-3 border-b border-line p-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-400"><ShieldAlert size={15}/></span>
          <div className="min-w-0 flex-1"><h2 id="security-explanation-title" className="m-0 text-sm font-semibold">AI finding explanation</h2><p className="mb-0 mt-1 text-[10px] text-muted">{explanation.title}</p></div>
          <button className="icon-btn !h-7 !w-7" aria-label="Close AI explanation" onClick={() => setExplanation(null)}><X size={14}/></button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="mb-4 rounded-lg border border-line bg-panel2 p-3"><div className="mb-1 text-[9px] text-muted">Masked sample sent to AI</div><pre className="m-0 whitespace-pre-wrap break-words font-mono text-[10px] text-main">{explanation.maskedSnippet || "(No code sample)"}</pre><div className="mt-2 text-[9px] text-muted">Rule: {explanation.ruleId} · {explanation.severity}</div></div>
          {explanationLoading ? <SecuritySkeleton/> : explanationError ? <ErrorState message={explanationError} onRetry={() => explainFinding(explanation)}/> : <p className="whitespace-pre-wrap text-xs leading-6 text-muted">{explanationText}</p>}
        </div>
        <div className="border-t border-line p-4"><p className="mb-3 text-[9px] leading-5 text-muted">Only the masked sample and rule details are sent for this explanation. AI output is advisory; never enter a real secret into chat.</p><div className="flex justify-end"><Button variant="secondary" onClick={() => setExplanation(null)}>Close</Button></div></div>
      </aside>
    </div>}
  </section>;
}

class SecurityErrorBoundary extends Component {
  state = { hasError: false, attempt: 0 };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  reload = () => this.setState((state) => ({ hasError: false, attempt: state.attempt + 1 }));

  render() {
    if (this.state.hasError) return <div className="card p-5"><EmptyState title="The security scan could not be displayed" description="Reload the section to try again." action={<Button variant="secondary" onClick={this.reload}>Reload</Button>}/></div>;
    return <div key={this.state.attempt}>{this.props.children}</div>;
  }
}

export default function SecurityScanSection(props) {
  return <SecurityErrorBoundary key={props.analysisId}><SecurityScanView {...props}/></SecurityErrorBoundary>;
}
