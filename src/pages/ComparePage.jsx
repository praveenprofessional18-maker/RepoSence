import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeftRight, Download, GitCompare, Link2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button, ConfirmModal, EmptyState, ErrorState } from "../components/common";
import CompareAiSummary from "../components/compare/CompareAiSummary";
import CategoryWinnerCards from "../components/compare/CategoryWinnerCards";
import CompareHeader from "../components/compare/CompareHeader";
import CompareSkeleton from "../components/compare/CompareSkeleton";
import DependencyDiff from "../components/compare/DependencyDiff";
import LanguageCompareChart from "../components/compare/LanguageCompareChart";
import MetricsTable from "../components/compare/MetricsTable";
import OverallWinnerBanner from "../components/compare/OverallWinnerBanner";
import RadarCompareChart from "../components/compare/RadarCompareChart";
import RepoPicker from "../components/compare/RepoPicker";
import TechStackDiff from "../components/compare/TechStackDiff";
import { historyService } from "../services/historyService";
import { repoService } from "../services/repoService";
import { generateComparisonMarkdown } from "../utils/compareEngine";

const GITHUB_URL = /^https?:\/\/(?:www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?$/i;
const ANALYZE_STEPS = ["Validating repository", "Fetching metadata", "Reading file tree", "Detecting tech stack", "Saving analysis"];

function normalizedRepoUrl(value) {
  try {
    const url = new URL(value.trim());
    const parts = url.pathname.split("/").filter(Boolean);
    if (!["github.com", "www.github.com"].includes(url.hostname.toLowerCase()) || parts.length !== 2) return "";
    return `${parts[0]}/${parts[1].replace(/\.git$/i, "")}`.toLowerCase();
  } catch {
    return "";
  }
}

function downloadComparison(fileName, data, type) {
  const blobUrl = URL.createObjectURL(new Blob([data], { type }));
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
}

function PopularityChart({ comparison, names }) {
  const data = ["stars", "forks", "open-issues"].map((id) => {
    const item = comparison.metrics.find((metric) => metric.id === id);
    return {
      metric: id === "open-issues" ? "Open issues (lower is better)" : item.label,
      a: typeof item.a === "number" ? item.a : null,
      b: typeof item.b === "number" ? item.b : null
    };
  });
  return <section className="card min-w-0">
    <div className="card-header"><div><h2 className="card-title m-0">Popularity signals</h2><p className="mb-0 mt-1 text-[9px] text-muted">Open issues are shown as raw counts; fewer is considered favorable.</p></div></div>
    <div className="h-64 p-3" role="img" aria-label="Grouped bar chart comparing repository stars, forks, and open issues">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 2 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false}/>
          <XAxis dataKey="metric" tick={{ fill: "var(--muted)", fontSize: 8 }} interval={0} angle={-8} height={45}/>
          <YAxis tick={{ fill: "var(--muted)", fontSize: 9 }} width={45}/>
          <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 10 }}/>
          <Bar dataKey="a" name={`Repo A · ${names[0]}`} fill="#8b5cf6" radius={[4, 4, 0, 0]}/>
          <Bar dataKey="b" name={`Repo B · ${names[1]}`} fill="#22c55e" radius={[4, 4, 0, 0]}/>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </section>;
}

function ComparePageContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [analyses, setAnalyses] = useState([]);
  const [savedComparisons, setSavedComparisons] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [slotA, setSlotA] = useState({ selectedId: "", url: "" });
  const [slotB, setSlotB] = useState({ selectedId: "", url: "" });
  const [urlErrors, setUrlErrors] = useState({ a: "", b: "" });
  const [comparison, setComparison] = useState(null);
  const [analysisA, setAnalysisA] = useState(null);
  const [analysisB, setAnalysisB] = useState(null);
  const [pageError, setPageError] = useState("");
  const [comparing, setComparing] = useState(false);
  const [analyzingSlot, setAnalyzingSlot] = useState("");
  const [analyzeStep, setAnalyzeStep] = useState(-1);
  const [scanProgress, setScanProgress] = useState(null);
  const [scanError, setScanError] = useState("");
  const [scanRetryTasks, setScanRetryTasks] = useState([]);
  const [scanBusy, setScanBusy] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const initialLinkRef = useRef(false);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError("");
    try {
      const [items, saved] = await Promise.all([historyService.list(), historyService.listComparisons()]);
      setAnalyses(items);
      setSavedComparisons(saved);
    } catch (loadError) {
      setHistoryError(loadError.message || "Could not load saved analyses.");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const loadComparison = useCallback(async (idA, idB) => {
    setComparing(true);
    setPageError("");
    setComparison(null);
    try {
      const result = await repoService.getComparison(idA, idB);
      setAnalysisA(result.analysisA);
      setAnalysisB(result.analysisB);
      setComparison(result.comparison);
      setSlotA({ selectedId: idA, url: "" });
      setSlotB({ selectedId: idB, url: "" });
      setSaveTitle(`${result.analysisA.fullName} vs ${result.analysisB.fullName}`);
    } catch (loadError) {
      setPageError(loadError.message || "Could not load these saved analyses.");
    } finally {
      setComparing(false);
    }
  }, []);

  useEffect(() => {
    if (loadingHistory || initialLinkRef.current) return;
    initialLinkRef.current = true;
    const idA = searchParams.get("a") || "";
    const idB = searchParams.get("b") || "";
    if (!idA && !idB) return;
    const knownIds = new Set(analyses.map((item) => item.id));
    if (idA && !idB) {
      if (!knownIds.has(idA)) {
        setPageError("The repository in this comparison link could not be found in your saved history.");
        return;
      }
      setSlotA({ selectedId: idA, url: "" });
      return;
    }
    if (idB && !idA) {
      if (!knownIds.has(idB)) {
        setPageError("The repository in this comparison link could not be found in your saved history.");
        return;
      }
      setSlotB({ selectedId: idB, url: "" });
      return;
    }
    if (!knownIds.has(idA) || !knownIds.has(idB)) {
      setPageError("One or both analyses in this comparison link could not be found in your saved history.");
      return;
    }
    if (idA === idB) {
      setPageError("This link selects the same repository twice. Choose two different analyses.");
      return;
    }
    loadComparison(idA, idB);
  }, [analyses, loadComparison, loadingHistory, searchParams]);

  const syncUrl = (nextA, nextB) => {
    const params = new URLSearchParams();
    if (nextA) params.set("a", nextA);
    if (nextB) params.set("b", nextB);
    setSearchParams(params, { replace: true });
  };

  const changeSlot = (slot, value) => {
    setPageError("");
    setComparison(null);
    const nextA = slot === "a" ? value : slotA;
    const nextB = slot === "b" ? value : slotB;
    if (slot === "a") setSlotA(value);
    else setSlotB(value);
    syncUrl(nextA.selectedId, nextB.selectedId);
  };

  const analyzeUrl = async (slot, value) => {
    const trimmed = value.trim();
    if (!GITHUB_URL.test(trimmed)) {
      const message = "Use a public GitHub URL in the format https://github.com/owner/repository.";
      setUrlErrors((current) => ({ ...current, [slot]: message }));
      throw new Error(message);
    }
    setUrlErrors((current) => ({ ...current, [slot]: "" }));
    const normalized = normalizedRepoUrl(trimmed);
    let existing = analyses.find((item) =>
      normalizedRepoUrl(item.url || `https://github.com/${item.fullName}`) === normalized
    );
    if (!existing) {
      const currentHistory = await historyService.list();
      existing = currentHistory.find((item) =>
        normalizedRepoUrl(item.url || `https://github.com/${item.fullName}`) === normalized
      );
      if (existing) setAnalyses(currentHistory);
    }
    if (existing) return existing;

    setAnalyzingSlot(slot);
    setAnalyzeStep(0);
    const timer = window.setInterval(() => setAnalyzeStep((step) => Math.min(step + 1, ANALYZE_STEPS.length - 1)), 350);
    try {
      const result = await repoService.analyze(trimmed);
      setAnalyzeStep(ANALYZE_STEPS.length);
      setAnalyses((current) => [result, ...current.filter((item) => item.id !== result.id)]);
      return result;
    } finally {
      window.clearInterval(timer);
      setAnalyzingSlot("");
      setAnalyzeStep(-1);
    }
  };

  const resolveSlot = async (slot, value) => {
    if (value.selectedId) {
      const saved = analyses.find((item) => item.id === value.selectedId);
      if (!saved) throw new Error(`Repo ${slot.toUpperCase()} is not in saved analysis history.`);
      return saved;
    }
    if (value.url.trim()) return analyzeUrl(slot, value.url);
    throw new Error(`Choose a saved analysis or paste a GitHub URL for Repo ${slot.toUpperCase()}.`);
  };

  const compareSelected = async () => {
    setPageError("");
    if (slotA.selectedId && slotA.selectedId === slotB.selectedId && !slotA.url.trim() && !slotB.url.trim()) {
      setPageError("Choose two different repositories to compare.");
      return;
    }
    try {
      const repoA = await resolveSlot("a", slotA);
      const repoB = await resolveSlot("b", slotB);
      if (repoA.id === repoB.id) throw new Error("Choose two different repositories to compare.");
      setSlotA({ selectedId: repoA.id, url: "" });
      setSlotB({ selectedId: repoB.id, url: "" });
      syncUrl(repoA.id, repoB.id);
      await loadComparison(repoA.id, repoB.id);
    } catch (compareError) {
      setPageError(compareError.message || "Could not compare these repositories.");
    }
  };

  const clearSelection = () => {
    setSlotA({ selectedId: "", url: "" });
    setSlotB({ selectedId: "", url: "" });
    setComparison(null);
    setAnalysisA(null);
    setAnalysisB(null);
    setPageError("");
    setUrlErrors({ a: "", b: "" });
    syncUrl("", "");
  };

  const swapSelection = () => {
    setSlotA(slotB);
    setSlotB(slotA);
    setComparison(null);
    setAnalysisA(null);
    setAnalysisB(null);
    setPageError("");
    syncUrl(slotB.selectedId, slotA.selectedId);
  };

  const missingTasks = useMemo(() => {
    const tasks = [];
    for (const repository of [analysisA, analysisB]) {
      if (!repository) continue;
      if (!repository.healthReport) tasks.push({ repoId: repository.id, type: "health" });
      if (!repository.securityReport) tasks.push({ repoId: repository.id, type: "security" });
    }
    return tasks;
  }, [analysisA, analysisB]);

  const runScans = async (tasks = missingTasks) => {
    if (!tasks.length || scanBusy) return;
    setScanBusy(true);
    setScanError("");
    setScanRetryTasks([]);
    let taskIndex = 0;
    try {
      for (let index = 0; index < tasks.length; index += 1) {
        taskIndex = index;
        const task = tasks[index];
        setScanProgress({ ...task, completed: 0, total: 0, current: index + 1, count: tasks.length });
        const onProgress = ({ completed, total }) => setScanProgress((current) => current ? { ...current, completed, total } : current);
        if (task.type === "health") await repoService.getHealthReport(task.repoId, onProgress);
        else await repoService.getSecurityReport(task.repoId, onProgress);
      }
      const [nextA, nextB] = await Promise.all([historyService.get(analysisA.id), historyService.get(analysisB.id)]);
      setAnalysisA(nextA);
      setAnalysisB(nextB);
      setComparison((await repoService.getComparison(nextA.id, nextB.id)).comparison);
      setAnalyses((current) => current.map((item) => item.id === nextA.id ? nextA : item.id === nextB.id ? nextB : item));
      toast.success("Missing scans are complete");
    } catch (scanError) {
      setScanError(scanError.message || "A requested scan could not be completed.");
      setScanRetryTasks(tasks.slice(taskIndex));
    } finally {
      setScanBusy(false);
      setScanProgress(null);
    }
  };

  const runNow = (repoId, type) => runScans([{ repoId, type }]);

  const saveCurrentComparison = async () => {
    if (!analysisA || !analysisB || saveBusy) return;
    setSaveBusy(true);
    try {
      const saved = await historyService.saveComparison({ idA: analysisA.id, idB: analysisB.id, title: saveTitle.trim() });
      setSavedComparisons((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      toast.success("Comparison saved to history");
    } catch (saveError) {
      toast.error(saveError.message || "Could not save this comparison.");
    } finally {
      setSaveBusy(false);
    }
  };

  const openSavedComparison = async (saved) => {
    setPageError("");
    if (!analyses.some((item) => item.id === saved.idA) || !analyses.some((item) => item.id === saved.idB)) {
      setPageError("One or both repositories in this saved comparison are no longer in analysis history.");
      return;
    }
    syncUrl(saved.idA, saved.idB);
    await loadComparison(saved.idA, saved.idB);
  };

  const removeSavedComparison = async () => {
    if (!pendingDelete) return;
    try {
      await historyService.removeComparison(pendingDelete.id);
      setSavedComparisons((current) => current.filter((item) => item.id !== pendingDelete.id));
      setPendingDelete(null);
      toast.success("Saved comparison deleted");
    } catch (deleteError) {
      toast.error(deleteError.message || "Could not delete the saved comparison.");
    }
  };

  const copyComparisonLink = async () => {
    if (!analysisA || !analysisB) return;
    try {
      const link = `${window.location.origin}/compare?a=${encodeURIComponent(analysisA.id)}&b=${encodeURIComponent(analysisB.id)}`;
      await navigator.clipboard.writeText(link);
      toast.success("Comparison link copied");
    } catch (copyError) {
      toast.error(copyError.message || "Clipboard access is unavailable.");
    }
  };

  const exportComparison = (format) => {
    if (!comparison) return;
    const [repoA, repoB] = comparison.repos;
    if (format === "json") {
      downloadComparison(`${repoA.fullName.replace(/[^\w.-]+/g, "-")}-vs-${repoB.fullName.replace(/[^\w.-]+/g, "-")}.json`, JSON.stringify(comparison, null, 2), "application/json");
    } else {
      downloadComparison(`${repoA.fullName.split("/").pop()}-vs-${repoB.fullName.split("/").pop()}.md`, generateComparisonMarkdown(comparison), "text/markdown");
    }
    toast.success(`Comparison exported as ${format.toUpperCase()}`);
  };

  const sameSelected = Boolean(slotA.selectedId && slotA.selectedId === slotB.selectedId);
  const renderPickers = () => <div className="grid gap-3 md:grid-cols-2">
    <RepoPicker slot="A" analyses={analyses} selectedId={slotA.selectedId} url={slotA.url}
      onSelect={(repository) => changeSlot("a", { selectedId: repository.id, url: "" })}
      onUrlChange={(url) => { setUrlErrors((current) => ({ ...current, a: url.trim() && !GITHUB_URL.test(url.trim()) ? "Use a valid public GitHub owner/repository URL." : "" })); changeSlot("a", { selectedId: "", url }); }}
      otherSelectedId={slotB.selectedId} error={urlErrors.a}/>
    <RepoPicker slot="B" analyses={analyses} selectedId={slotB.selectedId} url={slotB.url}
      onSelect={(repository) => changeSlot("b", { selectedId: repository.id, url: "" })}
      onUrlChange={(url) => { setUrlErrors((current) => ({ ...current, b: url.trim() && !GITHUB_URL.test(url.trim()) ? "Use a valid public GitHub owner/repository URL." : "" })); changeSlot("b", { selectedId: "", url }); }}
      otherSelectedId={slotA.selectedId} error={urlErrors.b}/>
  </div>;

  if (loadingHistory) return <CompareSkeleton/>;
  if (historyError) return <ErrorState message={historyError} onRetry={loadHistory}/>;

  return <div className="grid min-w-0 gap-4">
    <div className="page-heading mb-0">
      <div><h1 className="flex items-center gap-2"><GitCompare size={22} className="text-violet-400"/>Compare repositories</h1><p>Compare saved analyses or bring in public GitHub repositories.</p></div>
      <Link to="/analyze" className="btn btn-secondary btn-sm"><Plus size={13}/>New analysis</Link>
    </div>

    {analyses.length === 0 && <div className="card"><EmptyState title="No analyses yet" description="Analyze a public GitHub repository to compare it here. You can also paste two URLs below." action={<Link className="btn btn-primary" to="/analyze">Analyze a repository</Link>}/></div>}
    {analyses.length === 1 && <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-[10px] text-muted">You have one saved analysis. <Link className="text-violet-400 underline" to="/analyze">Analyze another repository</Link> to compare saved analyses.</div>}

    <section className="grid gap-3">
      {renderPickers()}
      {sameSelected && <p className="m-0 text-[10px] text-rose-400" role="alert">Choose two different repositories to compare.</p>}
      {pageError && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-500/25 bg-rose-500/5 p-3 text-[10px] text-rose-300" role="alert"><span>{pageError}</span><div className="flex gap-2"><Button variant="secondary" size="sm" onClick={compareSelected} disabled={comparing || (sameSelected && !slotA.url.trim() && !slotB.url.trim())}><RefreshCw size={11}/>Retry</Button><Link to="/history" className="btn btn-ghost btn-sm">Back to history</Link><Button variant="ghost" size="sm" onClick={() => { clearSelection(); setPageError(""); }}>Clear</Button></div></div>}
      {analyzingSlot && <div className="card p-3" role="status" aria-live="polite">
        <div className="mb-2 flex justify-between text-[10px]"><span>Analyzing Repo {analyzingSlot.toUpperCase()}</span><span>{ANALYZE_STEPS[Math.max(0, analyzeStep)]}</span></div>
        <div className="h-1.5 overflow-hidden rounded-full bg-panel2"><div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${Math.min(100, ((analyzeStep + 1) / ANALYZE_STEPS.length) * 100)}%` }}/></div>
      </div>}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="secondary" onClick={swapSelection} disabled={!slotA.selectedId && !slotB.selectedId && !slotA.url && !slotB.url} aria-label="Swap Repo A and Repo B"><ArrowLeftRight size={13}/>Swap A and B</Button>
        <Button variant="secondary" onClick={clearSelection} disabled={!slotA.selectedId && !slotB.selectedId && !slotA.url && !slotB.url}>Clear</Button>
        <Button onClick={compareSelected} disabled={comparing || Boolean(analyzingSlot) || scanBusy}><GitCompare size={13}/>{comparing ? "Comparing..." : "Compare"}</Button>
      </div>
    </section>

    {comparing && <CompareSkeleton/>}

    {comparison && !comparing && <>
      <CompareHeader repos={comparison.repos}/>
      <OverallWinnerBanner overallWinner={comparison.overallWinner} repos={comparison.repos}/>
      <CategoryWinnerCards categoryWinners={comparison.categoryWinners}/>

      {missingTasks.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
        <p className="m-0 text-[10px] leading-5 text-muted">{missingTasks.length} optional Health/Security scan{missingTasks.length === 1 ? "" : "s"} not yet run. Missing results are excluded from winner scoring.</p>
        <Button variant="secondary" size="sm" onClick={() => runScans()} disabled={scanBusy}>{scanBusy ? <RefreshCw size={12} className="animate-spin"/> : <Plus size={12}/>}Run missing scans</Button>
      </div>}
      {scanError && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-500/25 bg-rose-500/5 p-3 text-[10px] text-rose-300" role="alert"><span>{scanError}</span><Button variant="secondary" size="sm" onClick={() => runScans(scanRetryTasks)} disabled={scanBusy}>Retry missing scans</Button></div>}
      {scanBusy && scanProgress && <div className="card p-3" role="status" aria-live="polite"><div className="mb-2 text-[10px] text-muted">Running {scanProgress.type} scan for {scanProgress.repoId} · scan {scanProgress.current} / {scanProgress.count}{scanProgress.total ? ` · ${scanProgress.completed} / ${scanProgress.total} files` : ""}</div><div className="h-1.5 overflow-hidden rounded-full bg-panel2"><div className="h-full rounded-full bg-violet-500" style={{ width: `${scanProgress.total ? Math.round(scanProgress.completed / scanProgress.total * 100) : 20}%` }}/></div></div>}

      <MetricsTable metrics={comparison.metrics} repos={[analysisA, analysisB]} onRunNow={runNow}/>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <RadarCompareChart metrics={comparison.metrics} names={comparison.repos.map((item) => item.fullName)} healthAvailable={[Boolean(analysisA.healthReport), Boolean(analysisB.healthReport)]} onRunMissing={() => runScans(missingTasks.filter((task) => task.type === "health"))}/>
        <PopularityChart comparison={comparison} names={comparison.repos.map((item) => item.fullName)}/>
      </div>
      <LanguageCompareChart comparison={comparison} names={comparison.repos.map((item) => item.fullName)}/>
      <DependencyDiff dependencies={comparison.dependencies}/>
      <TechStackDiff techStack={comparison.techStack}/>
      <CompareAiSummary key={`${analysisA.id}-${analysisB.id}`} comparison={comparison}/>

      <section className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input className="input min-w-[190px] flex-1" value={saveTitle} onChange={(event) => setSaveTitle(event.target.value)} aria-label="Saved comparison title" placeholder="Comparison title"/>
          <Button variant="secondary" onClick={() => exportComparison("md")}><Download size={13}/>Export Markdown</Button>
          <Button variant="secondary" onClick={() => exportComparison("json")}><Download size={13}/>Export JSON</Button>
          <Button variant="secondary" onClick={copyComparisonLink}><Link2 size={13}/>Copy link</Button>
          <Button onClick={saveCurrentComparison} disabled={saveBusy}><Save size={13}/>{saveBusy ? "Saving..." : "Save comparison to history"}</Button>
        </div>
      </section>
    </>}

    <section className="card">
      <div className="card-header"><div><h2 className="card-title m-0">Saved comparisons</h2><p className="mb-0 mt-1 text-[9px] text-muted">{savedComparisons.length} saved</p></div></div>
      {savedComparisons.length ? <div className="grid gap-2 p-3 sm:grid-cols-2">
        {savedComparisons.map((saved) => <article key={saved.id} className="flex min-w-0 items-center gap-3 rounded-lg border border-line p-3">
          <div className="min-w-0 flex-1"><h3 className="m-0 truncate text-[10px] font-semibold">{saved.title}</h3><p className="mb-0 mt-1 truncate text-[9px] text-muted">{saved.repoA} vs {saved.repoB} · {new Date(saved.createdAt).toLocaleDateString()}</p></div>
          <Button variant="secondary" size="sm" onClick={() => openSavedComparison(saved)}>Open</Button>
          <button className="icon-btn !h-7 !w-7 text-muted hover:text-rose-400" aria-label={`Delete saved comparison ${saved.title}`} onClick={() => setPendingDelete(saved)}><Trash2 size={12}/></button>
        </article>)}
      </div> : <p className="m-0 p-4 text-[10px] text-muted">Saved comparisons will appear here.</p>}
    </section>

    <ConfirmModal open={Boolean(pendingDelete)} title="Delete saved comparison?" description={`This will remove “${pendingDelete?.title || "this comparison"}” from comparison history. The repository analyses will remain saved.`} onCancel={() => setPendingDelete(null)} onConfirm={removeSavedComparison}/>
  </div>;
}

class CompareErrorBoundary extends Component {
  state = { hasError: false, attempt: 0 };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  reload = () => this.setState((state) => ({ hasError: false, attempt: state.attempt + 1 }));

  render() {
    if (this.state.hasError) return <div className="card p-5"><EmptyState title="The comparison could not be displayed" description="Reload the page to try again." action={<Button variant="secondary" onClick={this.reload}>Reload</Button>}/></div>;
    return <div key={this.state.attempt}><ComparePageContent/></div>;
  }
}

export default function ComparePage() {
  return <CompareErrorBoundary/>;
}
