import { Component, useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowDownToLine, Copy, Diff, ExternalLink, RotateCcw, Sparkles, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button, EmptyState, Skeleton } from "../../common";
import { useCopyToClipboard } from "../../../hooks";
import { aiService } from "../../../services/aiService";
import { historyService } from "../../../services/historyService";
import { sanitizeSensitiveContent } from "../../../utils/securityScanner";
import {
  AI_ACTIONS,
  buildCacheKey,
  detectTestFramework,
  getAiOutputFileName,
  prepareFileContext,
  readAiPreferences,
  saveAiPreferences,
  saveLastAiAction
} from "../../../utils/aiActions";
import AiDiffView from "./AiDiffView";
import AiHistoryList from "./AiHistoryList";
import AiOptionsPopover from "./AiOptionsPopover";
import AiResultTabs from "./AiResultTabs";
import AiResultView from "./AiResultView";

function downloadResult(fileName, text, mimeType) {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function actionFor(id) {
  return AI_ACTIONS.find((action) => action.id === id) || AI_ACTIONS[0];
}

function AiResultDrawerContent({ open, onClose, analysisId, repository, request, onOpenAsTab }) {
  const [activeTab, setActiveTab] = useState("result");
  const [preferences, setPreferences] = useState(readAiPreferences);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(request || null);
  const [currentResult, setCurrentResult] = useState(null);
  const [originalContext, setOriginalContext] = useState("");
  const [streamText, setStreamText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [cached, setCached] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [rateLimitUntil, setRateLimitUntil] = useState(0);
  const [rateSeconds, setRateSeconds] = useState(0);
  const [saveWarning, setSaveWarning] = useState("");
  const { copy: copyToClipboard, copied } = useCopyToClipboard();
  const drawerRef = useRef(null);
  const closeRef = useRef(null);
  const generationRef = useRef(null);
  const generationSequenceRef = useRef(0);
  const currentRequestRef = useRef(request);
  currentRequestRef.current = currentRequest;

  const handleClose = useCallback(() => {
    generationSequenceRef.current += 1;
    generationRef.current?.abort();
    generationRef.current = null;
    setGenerating(false);
    onClose();
  }, [onClose]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      setHistory(await historyService.getAiActionCache(analysisId));
    } catch (loadError) {
      setHistoryError(loadError.message || "Could not load AI action history.");
    } finally {
      setHistoryLoading(false);
    }
  }, [analysisId]);

  const runAction = useCallback(async (nextRequest, options = {}) => {
    if (!nextRequest?.filePath || typeof nextRequest.content !== "string") return;
    const sequence = ++generationSequenceRef.current;
    generationRef.current?.abort();
    generationRef.current = null;
    const actionId = options.actionId || nextRequest.actionId || "explain";
    const action = actionFor(actionId);
    const savedPreferences = readAiPreferences();
    const level = options.level || nextRequest.level || savedPreferences.level || preferences.level;
    const language = options.language || nextRequest.language || savedPreferences.language || preferences.language;
    const safeContext = prepareFileContext(nextRequest.content);
    const key = buildCacheKey({ filePath: nextRequest.filePath, action, level, language, content: nextRequest.content });
    const resolvedRequest = { ...nextRequest, actionId: action.id, level, language, canRegenerate: true };
    currentRequestRef.current = resolvedRequest;
    setCurrentRequest(resolvedRequest);
    setOriginalContext(safeContext.text);
    setActiveTab("result");
    setError("");
    setSaveWarning("");
    setShowDiff(false);
    setRateLimitUntil(0);

    if (!options.ignoreCache) {
      try {
        const existing = await historyService.getAiActionCache(analysisId);
        if (sequence !== generationSequenceRef.current) return;
        const match = existing.find((item) => item.key === key);
        if (match) {
          setCurrentResult(match);
          setStreamText(match.output);
          setCached(true);
          setGenerating(false);
          setPreferences((current) => ({ ...current, level: match.level, language: match.language }));
          return;
        }
      } catch (cacheError) {
        if (sequence !== generationSequenceRef.current) return;
        setError(cacheError.message || "Could not read the saved AI result cache.");
        setGenerating(false);
        return;
      }
    }

    const controller = new AbortController();
    generationRef.current = controller;
    setCurrentResult(null);
    setCached(false);
    setStreamText("");
    setGenerating(true);
    setRateLimitUntil(0);
    try {
      setPreferences(saveAiPreferences({ ...preferences, level, language }));
    } catch (storageError) {
      setSaveWarning(storageError.message || "AI preferences could not be saved.");
    }
    try {
      saveLastAiAction(action.id);
    } catch (storageError) {
      setSaveWarning(storageError.message || "The last-used AI action could not be saved.");
    }

    try {
      const response = await aiService.runFileAction({
        analysisId,
        action: action.id,
        level,
        language,
        filePath: nextRequest.filePath,
        fileLanguage: nextRequest.fileLanguage || "text",
        content: safeContext.text,
        repoContext: nextRequest.repoContext || {
          fullName: repository.fullName,
          language: repository.language,
          frameworks: repository.frameworks,
          dependencies: repository.dependencies
        },
        signal: controller.signal,
        onChunk: (chunk) => {
          if (generationSequenceRef.current === sequence && generationRef.current === controller) setStreamText((current) => current + chunk);
        }
      });
      if (controller.signal.aborted || generationSequenceRef.current !== sequence || generationRef.current !== controller) return;
      const output = sanitizeSensitiveContent(String(response.output || ""));
      const record = {
        key,
        filePath: nextRequest.filePath,
        action: action.id,
        level,
        language,
        outputType: response.outputType || action.outputType,
        fileLanguage: nextRequest.fileLanguage || "text",
        framework: response.framework || (action.id === "tests" ? detectTestFramework(repository.dependencies, nextRequest.fileLanguage) : ""),
        output,
        createdAt: new Date().toISOString()
      };
      setCurrentResult(record);
      setStreamText(output);
      setCached(false);
      try {
        const saved = await historyService.saveAiActionResult(analysisId, record);
        setHistory(saved);
      } catch (storageError) {
        setSaveWarning(storageError.message || "The result is visible but could not be cached.");
      }
    } catch (runError) {
      if (controller.signal.aborted || runError.name === "AbortError" || runError.code === "ERR_CANCELED") {
        if (generationRef.current === controller) {
          generationRef.current = null;
          setGenerating(false);
        }
        return;
      }
      if (generationSequenceRef.current !== sequence) return;
      setError(runError.message || "Could not complete this AI action.");
      if (runError.code === "AI_RATE_LIMIT") {
        setRateLimitUntil(Date.now() + Number(runError.retryAfterMs || 0));
      }
    } finally {
      if (generationRef.current === controller) {
        generationRef.current = null;
        setGenerating(false);
      }
    }
  }, [analysisId, preferences, repository]);

  useEffect(() => {
    if (open && request?.requestId) runAction(request);
  }, [open, request?.requestId]);

  useEffect(() => {
    if (!open) return undefined;
    loadHistory();
    const previousFocus = document.activeElement;
    closeRef.current?.focus();
    const handleKeys = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = [...drawerRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => {
      window.removeEventListener("keydown", handleKeys);
      previousFocus?.focus?.();
    };
  }, [open, loadHistory, handleClose]);

  useEffect(() => {
    if (!rateLimitUntil) {
      setRateSeconds(0);
      return undefined;
    }
    const update = () => {
      const seconds = Math.max(0, Math.ceil((rateLimitUntil - Date.now()) / 1000));
      setRateSeconds(seconds);
      if (!seconds) setRateLimitUntil(0);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [rateLimitUntil]);

  useEffect(() => () => {
    generationSequenceRef.current += 1;
    generationRef.current?.abort();
  }, []);

  const stopGeneration = () => {
    generationSequenceRef.current += 1;
    generationRef.current?.abort();
    generationRef.current = null;
    setGenerating(false);
    toast("AI generation stopped");
  };

  const retry = () => {
    if (currentRequestRef.current) runAction(currentRequestRef.current, { ignoreCache: true });
  };

  const handlePreferencesChange = (next) => {
    try {
      setPreferences(saveAiPreferences(next));
    } catch (storageError) {
      toast.error(storageError.message || "Could not save AI preferences.");
    }
  };

  const openHistoryItem = (item) => {
    generationSequenceRef.current += 1;
    generationRef.current?.abort();
    generationRef.current = null;
    setCurrentResult(item);
    setCurrentRequest({
      filePath: item.filePath,
      actionId: item.action,
      fileLanguage: item.fileLanguage || "text",
      content: "",
      level: item.level,
      language: item.language,
      canRegenerate: false
    });
    setOriginalContext("");
    setStreamText(item.output);
    setCached(true);
    setError("");
    setShowDiff(false);
    setActiveTab("result");
  };

  const deleteHistoryItem = async (key) => {
    try {
      setHistory(await historyService.removeAiActionResult(analysisId, key));
      if (currentResult?.key === key) {
        setCurrentResult(null);
        setStreamText("");
      }
    } catch (deleteError) {
      toast.error(deleteError.message || "Could not delete the saved result.");
    }
  };

  const clearHistory = async () => {
    try {
      setHistory(await historyService.clearAiActionCache(analysisId));
      setCurrentResult(null);
      setStreamText("");
      setCached(false);
      toast.success("AI action history cleared");
    } catch (clearError) {
      toast.error(clearError.message || "Could not clear AI action history.");
    }
  };

  const copyResult = async () => {
    const text = currentResult?.output || streamText;
    if (!text) return;
    try {
      await copyToClipboard(text);
      toast.success("AI result copied");
    } catch {
      toast.error("Clipboard access is unavailable.");
    }
  };

  const downloadCurrentResult = () => {
    if (!currentResult) return;
    const markdown = currentResult.outputType === "markdown";
    const fileName = markdown
      ? `${currentResult.filePath.split("/").pop() || "result"}.ai.md`
      : getAiOutputFileName(currentResult.filePath, currentResult.action);
    downloadResult(fileName, currentResult.output, markdown ? "text/markdown" : "text/plain");
  };

  if (!open) return null;
  const action = actionFor(currentResult?.action || currentRequest?.actionId);
  const visibleOutput = generating ? streamText : currentResult?.output || streamText;
  const hasCodeDiff = currentResult?.outputType === "code" && Boolean(currentResult.output);
  const showRateLimit = error && (rateSeconds > 0 || /AI action limit/i.test(error));
  const testFramework = currentResult?.framework || (currentResult?.action === "tests"
    ? detectTestFramework(repository.dependencies, currentResult.fileLanguage)
    : "");

  return <div className="ai-drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && handleClose()}>
    <aside ref={drawerRef} className="ai-result-drawer" role="dialog" aria-modal="true" aria-labelledby="ai-result-title" aria-describedby="ai-result-disclaimer">
      <header className="ai-drawer-header">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><span className="feature-icon !h-7 !w-7"><Sparkles size={14}/></span><h2 id="ai-result-title" className="m-0 truncate text-sm font-semibold">{action.label}</h2></div>
          <p className="m-0 mt-1 truncate text-[9px] text-muted">{currentResult?.filePath || currentRequest?.filePath || "Current file"}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {currentResult && <><span className="tag">{currentResult.level}</span><span className="tag">{currentResult.language}</span>{testFramework && currentResult.action === "tests" && <span className="tag">Tests · {testFramework}</span>}</>}
            {cached && <span className="tag tag-success">Result from cache</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="secondary" size="sm" onClick={retry} disabled={generating || !currentRequest?.canRegenerate} title="Refresh (ignore cache)" aria-label="Refresh AI result and ignore cache"><RotateCcw size={12}/><span className="hidden sm:inline">Re-run</span></Button>
          <button ref={closeRef} type="button" className="icon-btn !h-8 !w-8" onClick={handleClose} aria-label="Close AI result drawer"><X size={15}/></button>
        </div>
      </header>

      <AiResultTabs active={activeTab} onChange={setActiveTab}/>
      <div className="ai-drawer-body">
        {activeTab === "history"
          ? <AiHistoryList items={history} loading={historyLoading} error={historyError} onOpen={openHistoryItem} onDelete={deleteHistoryItem} onClear={clearHistory}/>
          : <div className="grid gap-3">
            {error && <div className={`ai-action-error ${showRateLimit ? "rate-limit" : ""}`} role="alert">
              <AlertCircle size={15}/><div className="min-w-0 flex-1"><strong>{showRateLimit ? "AI request limit reached" : "Could not generate a result"}</strong><p>{showRateLimit ? rateSeconds ? `Please wait ${rateSeconds} seconds before retrying.` : "You can retry now." : error}</p></div>
              <Button variant="secondary" size="sm" onClick={retry} disabled={generating || rateSeconds > 0}>Retry</Button>
            </div>}
            {saveWarning && <p className="m-0 rounded-lg border border-amber-500/30 p-2 text-[9px] text-amber-300" role="status">{saveWarning}</p>}
            {generating && <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel2 p-3" role="status" aria-live="polite">
              <div className="flex min-w-0 flex-1 items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-violet-400"/><span className="text-[10px] text-muted">{streamText ? "Generating response…" : "Preparing a masked file context…"}</span></div>
              <Button variant="secondary" size="sm" onClick={stopGeneration} aria-label="Stop generating AI result"><X size={12}/>Stop</Button>
            </div>}
            {generating && !streamText && <div className="grid gap-3"><Skeleton className="w-full"/><Skeleton className="w-4/5"/><Skeleton className="w-2/3"/></div>}
            {visibleOutput
              ? <div className="grid gap-3">
                {showDiff && hasCodeDiff && <AiDiffView original={originalContext} result={currentResult.output}/>}
                {!showDiff && <AiResultView output={visibleOutput} outputType={currentResult?.outputType || action.outputType} fileLanguage={currentResult?.fileLanguage || currentRequest?.fileLanguage}/>}
              </div>
              : !generating && !error && <EmptyState icon={Sparkles} title="Ready to inspect this file" description="Choose an AI action from the file toolbar to generate an advisory result."/>}
            {currentResult && hasCodeDiff && <button type="button" className="ai-diff-toggle" onClick={() => setShowDiff((value) => !value)} aria-pressed={showDiff}><Diff size={13}/>{showDiff ? "Show generated code" : "Compare original and result"}</button>}
          </div>}
      </div>

      <footer className="ai-drawer-footer">
        <p id="ai-result-disclaimer" className="m-0 text-[9px] leading-5 text-muted">AI output may be incomplete or incorrect. Review before using. Not a security audit.</p>
        {activeTab === "result" && <div className="relative flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={copyResult} disabled={!visibleOutput}><Copy size={12}/>{copied ? "Copied" : "Copy all"}</Button>
          <Button variant="secondary" size="sm" onClick={downloadCurrentResult} disabled={!currentResult}><ArrowDownToLine size={12}/>Download</Button>
          <Button variant="secondary" size="sm" onClick={() => currentResult && onOpenAsTab?.(currentResult)} disabled={!currentResult}><ExternalLink size={12}/>Open as new tab</Button>
          <Button variant="secondary" size="sm" onClick={() => setOptionsOpen((value) => !value)} disabled={!currentRequest?.canRegenerate}>Regenerate with options</Button>
          <AiOptionsPopover
            open={optionsOpen}
            preferences={preferences}
            onChange={handlePreferencesChange}
            onClose={() => setOptionsOpen(false)}
            onApply={() => {
              setOptionsOpen(false);
              if (currentRequest?.canRegenerate) runAction(currentRequest, { ignoreCache: true, level: preferences.level, language: preferences.language });
            }}
          />
        </div>}
      </footer>
    </aside>
  </div>;
}

class AiDrawerErrorBoundary extends Component {
  state = { hasError: false, attempt: 0 };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  reload = () => this.setState((state) => ({ hasError: false, attempt: state.attempt + 1 }));

  render() {
    if (this.state.hasError) {
      return <div className="ai-drawer-backdrop"><aside className="ai-result-drawer p-5"><EmptyState title="AI result drawer unavailable" description="Reload the drawer to try again." action={<Button variant="secondary" onClick={this.reload}>Reload</Button>}/></aside></div>;
    }
    return <div key={this.state.attempt}>{this.props.children}</div>;
  }
}

export default function AiResultDrawer(props) {
  return <AiDrawerErrorBoundary><AiResultDrawerContent {...props}/></AiDrawerErrorBoundary>;
}
