import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Bookmark, CalendarDays, ChevronDown, ChevronRight, Copy, Download, ExternalLink, Eye, FileCode2, FileJson, FileText, Folder, FolderOpen, GitBranch, GitCompare, GitFork, HardDrive, HeartPulse, Lightbulb, LoaderCircle, MessageCircle, Network, RefreshCw, Scale, ShieldAlert, Sparkles, Star, Trash2, X } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import toast from "react-hot-toast";
import { historyService } from "../services/historyService";
import { aiService } from "../services/aiService";
import { repoService } from "../services/repoService";
import { sanitizeSensitiveContent } from "../utils/securityScanner";
import { AI_ACTIONS, AI_MAX_FILE_BYTES, AI_MAX_FILE_CHARS, readAiPreferences, readLastAiAction, saveAiPreferences, saveLastAiAction } from "../utils/aiActions";
import { confirmDocumentNavigation } from "../utils/docStudioGuard";
import { getDocType } from "../utils/docTypes";
import { Button, ConfirmModal, EmptyState, ErrorState, SearchInput, Skeleton, TechBadge } from "../components/common";
import CodePreview from "../components/analysis/CodePreview";
import AiActionMenu from "../components/analysis/ai/AiActionMenu";
import AiResultDrawer from "../components/analysis/ai/AiResultDrawer";
import AiResultView from "../components/analysis/ai/AiResultView";
import RepositoryChat from "../components/analysis/RepositoryChat";
import HealthSkeleton from "../components/analysis/health/HealthSkeleton";

const tabItems = [{ key:"",label:"Structure",icon:Folder },{ key:"stack",label:"Technology stack",icon:GitBranch },{ key:"insights",label:"AI insights",icon:Sparkles },{ key:"chat",label:"Chat",icon:MessageCircle },{ key:"graph",label:"Graph",icon:Network },{ key:"health",label:"Health",icon:HeartPulse },{ key:"readme",label:"Docs",icon:FileText }];
const GraphTab = lazy(() => import("../components/analysis/graph/GraphTab"));
const HealthTab = lazy(() => import("../components/analysis/health/HealthTab"));
const DocStudioTab = lazy(() => import("../components/readme/DocStudioTab"));
const palette = ["#8b5cf6","#6366f1","#22c55e","#f59e0b","#ec4899","#14b8a6"];
const BOOKMARKS_KEY = "reposense_bookmarks";

class GraphErrorBoundary extends Component {
  state = { hasError: false, attempt: 0 };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  retry = () => this.setState((state) => ({ hasError: false, attempt: state.attempt + 1 }));

  render() {
    if (this.state.hasError) {
      return <div className="card p-5"><EmptyState title="The graph could not be displayed" description="Reload the graph to try again." action={<Button variant="secondary" onClick={this.retry}>Reload graph</Button>}/></div>;
    }
    return <div key={this.state.attempt}>{this.props.children}</div>;
  }
}

class HealthErrorBoundary extends Component {
  state = { hasError: false, attempt: 0 };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  retry = () => this.setState((state) => ({ hasError: false, attempt: state.attempt + 1 }));

  render() {
    if (this.state.hasError) {
      return <div className="card p-5"><EmptyState title="The health dashboard could not be displayed" description="Reload the report to try again." action={<Button variant="secondary" onClick={this.retry}>Reload</Button>}/></div>;
    }
    return <div key={this.state.attempt}>{this.props.children}</div>;
  }
}

class DocStudioErrorBoundary extends Component {
  state = { hasError: false, attempt: 0 };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  retry = () => this.setState((state) => ({ hasError: false, attempt: state.attempt + 1 }));

  render() {
    if (this.state.hasError) {
      return <div className="card p-5"><EmptyState title="The Documentation Studio could not be displayed" description="Reload the document workspace to try again." action={<Button variant="secondary" onClick={this.retry}>Reload</Button>}/></div>;
    }
    return <div key={this.state.attempt}>{this.props.children}</div>;
  }
}

function GraphSkeleton() {
  return <div className="grid gap-4" aria-label="Loading graph">
    <Skeleton className="h-28 w-full"/>
    <Skeleton className="h-20 w-full"/>
    <Skeleton className="h-[520px] w-full"/>
  </div>;
}

function readBookmarks() {
  try {
    const bookmarks = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]");
    return Array.isArray(bookmarks) ? bookmarks : [];
  } catch {
    return [];
  }
}

function relativeTime(value) {
  if (!value) return "Unknown";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Unknown";
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60]
  ];
  const [unit, size] = units.find(([, unitSize]) => Math.abs(seconds) >= unitSize) || ["second", 1];
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(Math.round(seconds / size), unit);
}

function downloadExport(filename, content, mimeType) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function markdownSummary(repo, includeGeneratedDocs = false) {
  const latestDocuments = (repo.generatedDocuments || []).filter((document, index, all) =>
    all.findIndex((item) => item.type === document.type) === index
  );
  return [
    `# ${repo.fullName}`,
    "",
    repo.description || "No description provided.",
    "",
    `- Primary language: ${repo.language || "Unknown"}`,
    `- License: ${repo.license || "Not specified"}`,
    `- Default branch: ${repo.branch || "Unknown"}`,
    `- Stars: ${repo.stars ?? 0}`,
    `- Forks: ${repo.forks ?? 0}`,
    "",
    "## Topics",
    "",
    (repo.topics || []).length ? repo.topics.map((topic) => `- ${topic}`).join("\n") : "No topics listed.",
    "",
    "## Technology",
    "",
    (repo.frameworks || []).length ? repo.frameworks.map((framework) => `- ${framework}`).join("\n") : "No frameworks detected.",
    ...(Number.isFinite(repo.healthReport?.overallScore) ? [
      "",
      "## Code health",
      "",
      `- Heuristic score: ${repo.healthReport.overallScore}/100 (grade ${repo.healthReport.grade})`,
      "- This score is an estimate based on repository structure and sampled files, not a full code audit."
    ] : []),
    ...(repo.securityReport ? [
      "",
      "## Security heuristic scan",
      "",
      `- Safety score: ${repo.securityReport.riskScore}/100 (${repo.securityReport.riskLevel} risk)`,
      `- Critical/high findings: ${(repo.securityReport.summary?.critical || 0) + (repo.securityReport.summary?.high || 0)}`,
      `- Scanned files: ${repo.securityReport.scannedFiles || 0}; skipped: ${repo.securityReport.skippedFiles || 0}`,
      "- This heuristic scan is not a full security audit. Findings contain masked samples only."
    ] : []),
    ...(includeGeneratedDocs && latestDocuments.length ? [
      "",
      "## Generated documents",
      "",
      ...latestDocuments.flatMap((document) => [
        `### ${getDocType(document.type).filename}`,
        "",
        sanitizeSensitiveContent(document.output || ""),
        ""
      ])
    ] : []),
    "",
    "AI output is advisory."
  ].join("\n");
}

function containsMatch(node, query) {
  return node.name.toLowerCase().includes(query.toLowerCase()) || (node.children || []).some((child) => containsMatch(child, query));
}

const BINARY_FILE_EXTENSION = /\.(?:png|jpe?g|gif|webp|ico|pdf|zip|gz|tgz|rar|7z|woff2?|ttf|otf|mp[34]|mov|avi|exe|dll|so|dylib|class|jar|wasm|sqlite|db)$/i;

function isBinaryContent(content) {
  const text = String(content || "");
  if (text.includes("\0")) return true;
  const sample = text.slice(0, 2048);
  if (!sample.length) return false;
  let controls = 0;
  for (const character of sample) {
    const code = character.charCodeAt(0);
    if (code < 9 || (code > 13 && code < 32)) controls += 1;
  }
  return controls / sample.length > 0.05;
}

function fileLanguage(path, fallback = "") {
  const extension = String(path || "").split(".").pop().toLowerCase();
  const languages = {
    js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "jsx",
    ts: "typescript", mts: "typescript", cts: "typescript", tsx: "tsx",
    py: "python", json: "json", md: "markdown", mdx: "markdown",
    html: "html", htm: "html", css: "css", scss: "css", yaml: "yaml", yml: "yaml",
    sh: "shell", sql: "sql", java: "java", go: "go", rs: "rust"
  };
  return languages[extension] || fallback || extension || "text";
}

function TreeNode({ node, base, selected, onSelect, onContextMenu, query }) {
  const [open, setOpen] = useState(true);
  const path = base ? `${base}/${node.name}` : node.name;
  const isFolder = node.type === "folder";
  if (query && !containsMatch(node, query)) return null;
  const Icon = isFolder ? (open ? FolderOpen : Folder) : node.name.endsWith(".json") ? FileJson : node.name.endsWith(".md") ? FileText : FileCode2;
  const showFileMenu = (event) => {
    if (isFolder) return;
    event.preventDefault();
    event.stopPropagation();
    onContextMenu?.({ path, x: event.clientX, y: event.clientY });
  };
  return <div><button className={`tree-row ${selected === path ? "selected" : ""}`} onClick={() => isFolder ? setOpen(!open) : onSelect(path)} onContextMenu={showFileMenu} onKeyDown={(event) => {
    if (!isFolder && (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) {
      event.preventDefault();
      const bounds = event.currentTarget.getBoundingClientRect();
      onContextMenu?.({ path, x: bounds.left, y: bounds.bottom });
    }
  }} aria-expanded={isFolder ? open : undefined} aria-haspopup={!isFolder ? "menu" : undefined}>{isFolder ? open ? <ChevronDown size={12}/> : <ChevronRight size={12}/> : <span className="w-3"/>}<Icon size={13} className={isFolder ? "text-violet-400" : ""}/>{node.name}</button>{isFolder && open && <div className="tree-children">{node.children?.map((child)=><TreeNode key={`${path}/${child.name}`} node={child} base={path} selected={selected} onSelect={onSelect} onContextMenu={onContextMenu} query={query}/>)}</div>}</div>;
}

function flattenFiles(nodes, base = "", result = []) {
  for (const node of nodes || []) {
    const path = node.path || (base ? `${base}/${node.name}` : node.name);
    if (node.type === "folder") flattenFiles(node.children, path, result);
    else result.push({ ...node, path });
  }
  return result;
}

function countFolders(nodes) {
  return (nodes || []).reduce((count, node) => count + (node.type === "folder" ? 1 + countFolders(node.children) : 0), 0);
}

function StructureTab({ repo }) {
  const location = useLocation();
  const files = useMemo(() => flattenFiles(repo.tree), [repo.tree]);
  const [selected, setSelected] = useState(() => files[0]?.path || files[0]?.name || "");
  const [query, setQuery] = useState("");
  const [code, setCode] = useState("");
  const [fileLoading, setFileLoading] = useState(Boolean(selected));
  const [fileError, setFileError] = useState("");
  const [preferences, setPreferences] = useState(readAiPreferences);
  const [drawerRequest, setDrawerRequest] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [aiTabs, setAiTabs] = useState([]);
  const [activeAiTab, setActiveAiTab] = useState("");
  const requestSequence = useRef(0);
  const selectedFile = files.find((file) => (file.path || file.name) === selected);
  const requestedLine = Number(new URLSearchParams(location.search).get("line"));

  const getFileContent = useCallback(async (path) => {
    const entry = files.find((file) => (file.path || file.name) === path);
    if (!entry) throw new Error("This file is not present in the saved analysis tree.");
    const cached = repo.files?.[path];
    if (typeof cached === "string") return sanitizeSensitiveContent(cached);
    const contents = await repoService.getFile(repo.owner, repo.name, path, entry.size);
    return sanitizeSensitiveContent(contents);
  }, [files, repo.files, repo.name, repo.owner]);

  useEffect(() => {
    const requestedPath = new URLSearchParams(location.search).get("file");
    if (requestedPath && files.some((file) => (file.path || file.name) === requestedPath)) {
      setSelected(requestedPath);
      setActiveAiTab("");
    }
  }, [files, location.search]);

  useEffect(() => {
    if (!selected) {
      setCode("");
      setFileError("");
      return undefined;
    }

    let active = true;
    setFileError("");
    setCode("");
    setFileLoading(true);
    getFileContent(selected)
      .then((contents) => { if (active) setCode(contents); })
      .catch((error) => {
        if (active) {
          setFileError(error.message || "Unable to preview this file.");
          toast.error(error.message || "Unable to preview this file.");
        }
      })
      .finally(() => { if (active) setFileLoading(false); });
    return () => { active = false; };
  }, [repo.id, getFileContent, selected]);

  const actionDisabledReason = !selected
    ? "Select a file first."
    : selectedFile && Number(selectedFile.size) > AI_MAX_FILE_BYTES
      ? `AI actions are limited to files up to ${Math.floor(AI_MAX_FILE_BYTES / 1024)} KB.`
      : selectedFile && BINARY_FILE_EXTENSION.test(selectedFile.path || selectedFile.name)
        ? "AI actions are unavailable for binary files."
        : fileError && /too large|binary/i.test(fileError)
          ? "AI actions are unavailable for files that are too large or binary."
        : isBinaryContent(code)
          ? "AI actions are unavailable for binary file contents."
          : fileLoading ? "Wait for the file preview to finish loading."
            : "";
  const aiDisabled = Boolean(actionDisabledReason);

  const startAiAction = useCallback(async (actionId, filePath = selected) => {
    const entry = files.find((file) => (file.path || file.name) === filePath);
    if (!entry) {
      toast.error("Select a file in the repository tree first.");
      return;
    }
    if (Number(entry.size) > AI_MAX_FILE_BYTES || BINARY_FILE_EXTENSION.test(entry.path || entry.name)) {
      toast.error(Number(entry.size) > AI_MAX_FILE_BYTES
        ? `AI actions are limited to files up to ${Math.floor(AI_MAX_FILE_BYTES / 1024)} KB.`
        : "AI actions are unavailable for binary files.");
      setContextMenu(null);
      return;
    }
    setContextMenu(null);
    setSelected(filePath);
    setActiveAiTab("");
    try {
      const content = filePath === selected && !fileLoading ? code : await getFileContent(filePath);
      if (isBinaryContent(content)) {
        toast.error("AI actions are unavailable for binary file contents.");
        return;
      }
      const safeContent = sanitizeSensitiveContent(content);
      const requestId = `${Date.now()}-${++requestSequence.current}`;
      setDrawerRequest({
        requestId,
        actionId,
        filePath,
        fileLanguage: fileLanguage(filePath, repo.language),
        content: safeContent,
        repoContext: {
          fullName: repo.fullName,
          language: repo.language,
          frameworks: repo.frameworks,
          dependencies: repo.dependencies
        }
      });
      setDrawerOpen(true);
      saveLastAiAction(actionId);
    } catch (error) {
      toast.error(error.message || "Could not load this file for an AI action.");
    }
  }, [code, fileLoading, files, getFileContent, repo.dependencies, repo.frameworks, repo.fullName, repo.language, selected]);

  const updateAiPreferences = (next) => {
    try {
      setPreferences(saveAiPreferences(next));
    } catch (error) {
      toast.error(error.message || "Could not save AI preferences.");
    }
  };

  useEffect(() => {
    const available = Boolean(selected && !aiDisabled);
    const announceAvailability = (enabled) => window.dispatchEvent(new CustomEvent("reposense:ai-actions-available", { detail: { enabled } }));
    const onCommandAction = (event) => {
      if (AI_ACTIONS.some((action) => action.id === event.detail)) startAiAction(event.detail, selected);
    };
    window.addEventListener("reposense:ai-file-action", onCommandAction);
    announceAvailability(available);
    return () => {
      window.removeEventListener("reposense:ai-file-action", onCommandAction);
      announceAvailability(false);
    };
  }, [selected, aiDisabled, startAiAction]);

  useEffect(() => {
    const onShortcut = (event) => {
      const target = event.target;
      const isTyping = target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (isTyping || !(event.ctrlKey || event.metaKey) || !event.shiftKey || event.key.toLowerCase() !== "e") return;
      event.preventDefault();
      const actionId = readLastAiAction();
      startAiAction(actionId);
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [startAiAction]);

  useEffect(() => {
    if (!contextMenu) return undefined;
    const closeMenu = () => setContextMenu(null);
    const closeOnEscape = (event) => { if (event.key === "Escape") closeMenu(); };
    window.addEventListener("pointerdown", closeMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [contextMenu]);

  const openAiResultAsTab = (result) => {
    const id = `ai-${Date.now()}-${aiTabs.length}`;
    setAiTabs((current) => [...current, {
      id,
      filePath: result.filePath,
      action: result.action,
      output: sanitizeSensitiveContent(result.output),
      outputType: result.outputType,
      fileLanguage: result.fileLanguage
    }]);
    setActiveAiTab(id);
    setDrawerOpen(false);
  };

  const activeTab = aiTabs.find((tab) => tab.id === activeAiTab);
  const contextMenuPosition = contextMenu
    ? {
      left: Number.isFinite(contextMenu.x) ? Math.max(8, Math.min(contextMenu.x, window.innerWidth - 250)) : 8,
      top: Number.isFinite(contextMenu.y) ? Math.max(8, Math.min(contextMenu.y, window.innerHeight - 300)) : 8
    }
    : null;
  const counts = repo.fileCount != null
    ? { files: repo.fileCount, folders: repo.folderCount || 0 }
    : { files: files.length, folders: countFolders(repo.tree) };
  return <>
    <div className="card tree-layout">
      <aside className="tree-pane">
        <div className="tree-search"><SearchInput value={query} onChange={setQuery} placeholder="Filter files..." /></div>
        <div className="tree-list">{repo.tree?.map((node)=><TreeNode key={node.path || node.name} node={node} base="" selected={selected} onSelect={(path) => { setSelected(path); setActiveAiTab(""); }} onContextMenu={setContextMenu} query={query}/>)}</div>
        <div className="border-t border-line px-3 py-2 text-[9px] text-muted">{counts.files} files · {counts.folders} folders</div>
      </aside>
      <section className="file-preview">
        <div className="file-toolbar">
          <div className="min-w-0 truncate text-[10px] text-muted">{activeTab ? activeTab.filePath : selected || "Select a file"}{selectedFile && !activeTab && <span className="ml-2">· {code ? code.split("\n").length : 0} lines · {selectedFile.size || new TextEncoder().encode(code).length} bytes</span>}</div>
          <AiActionMenu
            disabled={aiDisabled}
            disabledReason={actionDisabledReason}
            onAction={(actionId) => startAiAction(actionId)}
            preferences={preferences}
            onPreferencesChange={updateAiPreferences}
            trimNotice={code.length > AI_MAX_FILE_CHARS && !aiDisabled ? `File will be trimmed to ${AI_MAX_FILE_CHARS.toLocaleString()} characters before sending.` : ""}
          />
        </div>
        {aiTabs.length > 0 && <div className="ai-open-tabs" role="tablist" aria-label="Open file and AI result tabs">
          <button type="button" className={!activeTab ? "active" : ""} role="tab" aria-selected={!activeTab} onClick={() => setActiveAiTab("")}>{selected || "Source"}</button>
          {aiTabs.map((tab) => {
            const label = AI_ACTIONS.find((action) => action.id === tab.action)?.label || "Result";
            return <span className={`ai-open-tab ${tab.id === activeAiTab ? "active" : ""}`} key={tab.id}>
              <button type="button" role="tab" aria-selected={tab.id === activeAiTab} onClick={() => setActiveAiTab(tab.id)}><span className="ai-tab-badge">AI: {label.replace("Generate unit tests", "Tests")}</span><span className="truncate">{tab.filePath.split("/").pop()}</span></button>
              <button type="button" className="ai-tab-close" aria-label={`Close AI result tab for ${tab.filePath}`} onClick={() => { setAiTabs((current) => current.filter((entry) => entry.id !== tab.id)); if (activeAiTab === tab.id) setActiveAiTab(""); }}>×</button>
            </span>;
          })}
        </div>}
        {activeTab
          ? <div className="ai-virtual-tab-content"><div className="mb-2 flex items-center gap-2"><span className="tag tag-success">AI: {AI_ACTIONS.find((action) => action.id === activeTab.action)?.label || "Result"}</span><span className="truncate text-[9px] text-muted">{activeTab.filePath}</span><span className="ml-auto text-[9px] text-muted">Read only</span></div><AiResultView output={activeTab.output} outputType={activeTab.outputType} fileLanguage={activeTab.fileLanguage}/></div>
          : fileLoading ? <div className="grid gap-3 p-5"><Skeleton className="w-full"/><Skeleton className="w-4/5"/><Skeleton className="w-3/5"/></div>
            : fileError ? <div className="empty-state"><span className="empty-icon"><FileText size={20}/></span><h3>Preview unavailable</h3><p>{fileError}</p></div>
              : selected ? <CodePreview fileName={selected} code={code} highlightLine={Number.isInteger(requestedLine) && requestedLine > 0 ? requestedLine : null}/>
                : <div className="empty-state"><span className="empty-icon"><FileText size={20}/></span><h3>Select a file</h3><p>Choose a file in the repository tree to preview its contents.</p></div>}
      </section>
    </div>
    {contextMenu && <div className="ai-tree-context-menu" role="menu" aria-label={`AI actions for ${contextMenu.path}`} style={contextMenuPosition} onPointerDown={(event) => event.stopPropagation()}>
      <strong className="block truncate px-3 py-2 text-[9px] text-muted">{contextMenu.path}</strong>
      {AI_ACTIONS.map((action) => <button type="button" role="menuitem" className="ai-action-option" key={action.id} onClick={() => startAiAction(action.id, contextMenu.path)}>{action.label}<small>{action.description}</small></button>)}
    </div>}
    <section className="card mt-4"><div className="card-header"><span className="card-title flex items-center gap-2"><Lightbulb size={14} className="text-amber-400"/>Code quality recommendations</span><span className="tag">{repo.recommendations?.length || 0} suggestions</span></div><div className="card-content grid gap-3 md:grid-cols-2">{(repo.recommendations || []).map((item,index)=><div className="flex items-start gap-2 text-[11px] leading-6 text-muted" key={index}><span className={`tag ${item.severity==="critical"?"tag-danger":item.severity==="warning"?"tag-warning":""}`}>{item.severity}</span><span>{item.text}</span></div>)}</div></section>
    <AiResultDrawer
      open={drawerOpen}
      request={drawerRequest}
      analysisId={repo.id}
      repository={repo}
      onClose={() => setDrawerOpen(false)}
      onOpenAsTab={openAiResultAsTab}
    />
  </>;
}

function StackTab({ repo }) {
  const [filter, setFilter] = useState("");
  const deps = repo.dependencies.filter((item)=>item.name.toLowerCase().includes(filter.toLowerCase()));
  const langData = Object.entries(repo.languages).map(([name,value])=>({name,value}));
  const dependencyData = [{name:"Production",value:repo.dependencies.filter((item)=>item.type==="prod").length},{name:"Development",value:repo.dependencies.filter((item)=>item.type==="dev").length}];
  return <div className="grid gap-4 lg:grid-cols-2"><section className="card"><div className="card-header"><span className="card-title">Languages</span><span className="tag">{langData.length} detected</span></div><div className="card-content"><div className="flex items-center gap-5"><div className="h-[180px] w-[180px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={langData} dataKey="value" nameKey="name" innerRadius={51} outerRadius={75} paddingAngle={3}>{langData.map((item,index)=><Cell key={item.name} fill={palette[index%palette.length]}/>)}</Pie><Tooltip contentStyle={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,fontSize:10}}/></PieChart></ResponsiveContainer></div><div className="flex-1">{langData.map((item,index)=><div className="language-row" key={item.name}><span>{item.name}</span><div className="language-track"><div className="language-fill" style={{width:`${item.value}%`,background:palette[index%palette.length]}}/></div><span className="text-right text-muted">{item.value}%</span></div>)}</div></div></div></section>
    <section className="card"><div className="card-header"><span className="card-title">Frameworks & libraries</span></div><div className="card-content flex flex-wrap gap-2">{repo.frameworks.map((item)=><TechBadge key={item}>{item}</TechBadge>)}</div><div className="card-header border-t border-line"><span className="card-title">Dependency split</span></div><div className="card-content flex items-center gap-4"><div className="h-[140px] w-[140px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dependencyData} dataKey="value" nameKey="name" innerRadius={39} outerRadius={61} paddingAngle={4}>{dependencyData.map((item,index)=><Cell key={item.name} fill={palette[index]}/>)}</Pie><Tooltip contentStyle={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,fontSize:10}}/></PieChart></ResponsiveContainer></div><div className="grid gap-3 text-[10px]">{dependencyData.map((item,index)=><div className="flex items-center gap-2" key={item.name}><i className="h-2 w-2 rounded-full" style={{background:palette[index]}}/>{item.name}<span className="text-muted">{item.value} packages</span></div>)}</div></div></section>
    <section className="card lg:col-span-2"><div className="card-header"><span className="card-title">Dependencies</span><span className="tag">{repo.dependencies.length} packages</span></div><div className="p-3"><SearchInput value={filter} onChange={setFilter} placeholder="Filter dependencies..." /></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Package</th><th>Version</th><th>Type</th></tr></thead><tbody>{deps.map((item)=><tr key={item.name}><td className="font-medium">{item.name}</td><td className="font-mono text-muted">{item.version}</td><td><span className="tag">{item.type === "dev" ? "Development" : "Production"}</span></td></tr>)}</tbody></table>{deps.length===0&&<p className="p-6 text-center text-xs text-muted">No dependencies match your search.</p>}</div></section>
  </div>;
}

function InsightsTab({ repo }) {
  const [open, setOpen] = useState(0);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState(repo.summary);
  const regenerate = async () => {
    setBusy(true);
    try { const result = await aiService.codeQuality(repo); setSummary(repo.summary); toast.success(`Insights refreshed · score ${result.score}/100`); }
    catch (error) { toast.error(error.message || "Could not refresh insights"); }
    finally { setBusy(false); }
  };
  return <div className="grid gap-4 lg:grid-cols-[1.4fr_.8fr]"><div className="grid gap-4"><section className="card"><div className="card-header"><span className="card-title flex items-center gap-2"><Sparkles size={14} className="text-violet-400"/>Project summary</span><Button variant="secondary" size="sm" onClick={regenerate} disabled={busy}>{busy?<LoaderCircle size={13} className="animate-spin"/>:<RefreshCw size={13}/>}Regenerate</Button></div><div className="card-content"><p className="m-0 text-xs leading-7 text-muted">{summary}</p></div></section><section className="card"><div className="card-header"><span className="card-title">Architecture overview</span></div><div className="card-content"><p className="m-0 text-xs leading-7 text-muted">{repo.architecture}</p></div></section><section className="card"><div className="card-header"><span className="card-title">Key modules explained</span></div><div className="card-content divide-y divide-line">{repo.modules.map((module,index)=><div key={module.title}><button className="flex w-full items-center justify-between py-3 text-left text-xs font-medium" aria-expanded={open===index} onClick={()=>setOpen(open===index?-1:index)}>{module.title}<ChevronDown size={14} className={`transition-transform ${open===index?"rotate-180":""}`}/></button>{open===index&&<p className="pb-3 text-[11px] leading-6 text-muted">{module.body}</p>}</div>)}</div></section></div>
    <aside className="grid content-start gap-4"><section className="card"><div className="card-header"><span className="card-title">Code quality score</span><span className="tag tag-success">Good</span></div><div className="card-content"><div className="flex items-end gap-2"><span className="text-4xl font-semibold tracking-tight">{repo.quality}</span><span className="mb-1 text-xs text-muted">/ 100</span></div><div className="language-track mt-4"><div className="language-fill" style={{width:`${repo.quality}%`}}/></div><p className="mb-0 mt-3 text-[10px] leading-5 text-muted">An advisory signal based on visible code patterns and repository metadata.</p></div></section><section className="card"><div className="card-header"><span className="card-title">Recommendations</span></div><div className="card-content grid gap-3">{repo.recommendations.map((item,index)=><div className="rounded-lg border border-line p-3" key={index}><span className={`tag ${item.severity==="critical"?"tag-danger":item.severity==="warning"?"tag-warning":""}`}>{item.severity}</span><p className="mb-0 mt-2 text-[10px] leading-5 text-muted">{item.text}</p></div>)}</div></section><p className="m-0 flex gap-2 text-[10px] leading-5 text-muted"><Lightbulb size={13} className="mt-0.5 shrink-0 text-amber-400"/>AI output is advisory and may be incomplete. Verify findings before acting on them.</p></aside></div>;
}

function ReadmeTab({ repo, onRepositoryUpdated }) {
  return <DocStudioErrorBoundary key={repo.id}><Suspense fallback={<div className="grid gap-3"><Skeleton className="h-12 w-full"/><Skeleton className="h-28 w-full"/><Skeleton className="h-[470px] w-full"/></div>}><DocStudioTab repo={repo} onRepositoryUpdated={onRepositoryUpdated}/></Suspense></DocStudioErrorBoundary>;
}

export default function Workspace() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const guardedNavigate = (to) => {
    if (confirmDocumentNavigation()) navigate(to);
  };
  const [repo, setRepo] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [includeDocumentsInExport, setIncludeDocumentsInExport] = useState(false);
  useEffect(() => { let active=true; setLoading(true); historyService.get(id).then((value)=>{if(active)setRepo(value);}).catch((e)=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);}); return ()=>{active=false;}; },[id]);
  useEffect(() => {
    if (repo) setBookmarked(readBookmarks().includes(repo.id));
  }, [repo?.id]);
  const tab = useMemo(()=>location.pathname.split("/").filter(Boolean)[2] || "",[location.pathname]);
  const chatContextFiles = useMemo(() => repo
    ? flattenFiles(repo.tree).slice(0, 250).map(({ path, size }) => ({
      path,
      size,
      content: typeof repo.files?.[path] === "string" ? repo.files[path].slice(0, 12000) : ""
    }))
    : [], [repo?.tree, repo?.files]);
  const toggleBookmark = () => {
    const bookmarks = readBookmarks();
    const next = bookmarks.includes(repo.id)
      ? bookmarks.filter((bookmark) => bookmark !== repo.id)
      : [...bookmarks, repo.id];
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
      setBookmarked(next.includes(repo.id));
      toast.success(next.includes(repo.id) ? "Repository bookmarked" : "Bookmark removed");
    } catch (storageError) {
      toast.error(`Could not save this bookmark. ${storageError.message}`);
    }
  };
  const reanalyze = async () => {
    setReanalyzing(true);
    try {
      const updated = await repoService.analyze(repo.url || `https://github.com/${repo.owner}/${repo.name}`);
      setRepo(updated);
      toast.success("Repository analysis refreshed");
    } catch (analysisError) {
      toast.error(analysisError.message || "Could not re-analyze this repository");
    } finally {
      setReanalyzing(false);
    }
  };
  const deleteAnalysis = async () => {
    if (!confirmDocumentNavigation()) return;
    try {
      await historyService.remove(repo.id);
      toast.success("Analysis deleted");
      setShowDelete(false);
      guardedNavigate("/history");
    } catch (deleteError) {
      toast.error(deleteError.message || "Could not delete this analysis");
    }
  };
  if (loading) return <div><div className="workspace-header"><div className="w-full"><Skeleton className="mb-3 h-5 w-2/5"/><Skeleton className="mb-2 h-7 w-1/2"/><Skeleton className="h-4 w-3/4"/></div><Skeleton className="h-9 w-36"/></div><div className="grid gap-4"><Skeleton className="h-12 w-full"/><Skeleton className="h-64 w-full"/><Skeleton className="h-48 w-full"/></div></div>;
  if (error) return <ErrorState message={error} onRetry={()=>window.location.reload()}/>;
  if (!repo) return <EmptyState title="Analysis not found" description="This repository may have been removed from your history." action={<Button onClick={()=>navigate("/history")}>Back to history</Button>}/>;
  const content = tab==="stack" ? <StackTab repo={repo}/> : tab==="insights" ? <InsightsTab repo={repo}/> : tab==="chat" ? <RepositoryChat key={id} analysisId={id} repo={repo} contextFiles={chatContextFiles}/> : tab==="graph" ? <GraphErrorBoundary key={id}><Suspense fallback={<GraphSkeleton/>}><GraphTab analysisId={id} repository={repo}/></Suspense></GraphErrorBoundary> : tab==="health" ? <HealthErrorBoundary key={id}><Suspense fallback={<HealthSkeleton/>}><HealthTab analysisId={id} repository={repo} onReport={(healthReport)=>setRepo((current)=>current?{...current,healthReport}:current)} onSecurityReport={async (securityReport)=>{setRepo((current)=>current?{...current,securityReport}:current);try{setRepo(await historyService.get(id));}catch(readError){toast.error(readError.message||"Security report was saved, but the updated analysis could not be reloaded.");}}}/></Suspense></HealthErrorBoundary> : tab==="readme" ? <ReadmeTab repo={repo} onRepositoryUpdated={(documentFields)=>setRepo((current)=>current?{...current,...documentFields}:current)}/> : <StructureTab repo={repo}/>;
  const sizeLabel = repo.size >= 1024 ? `${(repo.size / 1024).toFixed(1)} MB` : `${repo.size || 0} KB`;
  const metadataStats = [
    { label: "Stars", value: (repo.stars || 0).toLocaleString(), icon: Star },
    { label: "Forks", value: (repo.forks || 0).toLocaleString(), icon: GitFork },
    { label: "Watchers", value: (repo.watchers || 0).toLocaleString(), icon: Eye },
    { label: "Open issues", value: (repo.issues || 0).toLocaleString(), icon: GitBranch },
    { label: "License", value: repo.license || "Not specified", icon: Scale },
    { label: "Primary language", value: repo.language || "Unknown", icon: FileCode2 },
    { label: "Repository size", value: sizeLabel, icon: HardDrive },
    { label: "Updated", value: relativeTime(repo.updatedAt), icon: RefreshCw },
    { label: "Created", value: repo.createdAt ? new Date(repo.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Unknown", icon: CalendarDays }
  ];
  return <div>
    <div className="workspace-header items-start">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2 text-[10px] text-muted"><Link to="/history" className="hover:text-main">History</Link><ChevronRight size={12}/><span>Analysis</span></div>
        <div className="flex items-start gap-3">
          <a href={repo.ownerUrl || `https://github.com/${repo.owner}`} target="_blank" rel="noreferrer" aria-label={`Open ${repo.owner} on GitHub`} className="mt-1 shrink-0">
            {repo.ownerAvatar ? <img src={repo.ownerAvatar} alt={`${repo.owner} avatar`} className="h-10 w-10 rounded-xl border border-line object-cover"/> : <span className="repo-meta-avatar h-10 w-10 rounded-xl"><GitBranch size={18}/></span>}
          </a>
          <div className="min-w-0">
            <h1 className="m-0 truncate text-xl font-semibold tracking-tight">{repo.fullName}</h1>
            <p className="mt-1 text-[11px] text-muted">{repo.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="tag"><GitBranch size={12}/>{repo.branch || "Unknown branch"}</span>
              {Number.isFinite(repo.healthReport?.overallScore) && <span className="tag" title={`Heuristic health score: ${repo.healthReport.overallScore}/100`}>
                <i className={`h-1.5 w-1.5 rounded-full ${repo.healthReport.overallScore >= 80 ? "bg-emerald-400" : repo.healthReport.overallScore >= 50 ? "bg-amber-400" : "bg-rose-400"}`}/>
                Health {repo.healthReport.overallScore}
              </span>}
              {repo.securityReport && <span className={`tag ${repo.securityReport.riskLevel === "critical" || repo.securityReport.riskLevel === "high" ? "tag-danger" : repo.securityReport.riskLevel === "medium" ? "tag-warning" : "tag-success"}`} title={`Security safety score: ${repo.securityReport.riskScore}/100`}>
                <ShieldAlert size={12}/>Security {repo.securityReport.riskScore}
              </span>}
              {(repo.topics || []).map((topic) => <TechBadge key={topic}>{topic}</TechBadge>)}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <a className="btn btn-secondary btn-sm" href={repo.url || `https://github.com/${repo.fullName}`} target="_blank" rel="noreferrer"><ExternalLink size={13}/>Open on GitHub</a>
        <Button variant="secondary" size="sm" onClick={()=>guardedNavigate(`/compare?a=${encodeURIComponent(repo.id)}`)}><GitCompare size={13}/>Compare with...</Button>
        <Button variant="secondary" size="sm" onClick={reanalyze} disabled={reanalyzing}>{reanalyzing ? <LoaderCircle size={13} className="animate-spin"/> : <RefreshCw size={13}/>}Re-analyze</Button>
        <Button variant="secondary" size="sm" onClick={toggleBookmark} aria-pressed={bookmarked}><Bookmark size={13} fill={bookmarked ? "currentColor" : "none"}/>{bookmarked ? "Bookmarked" : "Bookmark"}</Button>
        <div className="relative">
          <Button variant="secondary" size="sm" onClick={()=>setExportOpen((open)=>!open)} aria-haspopup="menu" aria-expanded={exportOpen}>Export <ChevronDown size={13}/></Button>
          {exportOpen && <div className="absolute right-0 z-20 mt-2 grid min-w-40 gap-1 rounded-lg border border-line bg-panel p-1 shadow-xl" role="menu">
            <button className="side-link" role="menuitem" onClick={()=>{downloadExport(`${repo.name}-analysis.json`,JSON.stringify(repo,null,2),"application/json");setExportOpen(false);toast.success("JSON export downloaded");}}><Download size={14}/>Download JSON</button>
            <label className="side-link cursor-pointer"><input type="checkbox" checked={includeDocumentsInExport} onChange={(event)=>setIncludeDocumentsInExport(event.target.checked)} aria-label="Include generated documents in Markdown summary"/>Include generated docs</label>
            <button className="side-link" role="menuitem" onClick={()=>{downloadExport(`${repo.name}-summary.md`,markdownSummary(repo,includeDocumentsInExport),"text/markdown");setExportOpen(false);toast.success("Markdown summary downloaded");}}><Download size={14}/>Markdown summary</button>
          </div>}
        </div>
        <Button variant="danger" size="sm" onClick={()=>setShowDelete(true)}><Trash2 size={13}/>Delete</Button>
      </div>
    </div>
    <div className="mb-4 flex flex-wrap gap-2">{metadataStats.map(({label,value,icon:Icon})=><span className="tag" key={label} title={label}><Icon size={12}/><span className="text-muted">{label}</span><strong className="text-main">{value}</strong></span>)}</div>
    <nav className="workspace-tabs" aria-label="Analysis tabs">{tabItems.map(({key,label,icon:Icon})=><button key={key} className={`workspace-tab ${tab===key?"active":""}`} onClick={()=>guardedNavigate(`/analysis/${id}${key?`/${key}`:""}`)}><Icon size={14}/>{label}</button>)}</nav>
    {content}
    <ConfirmModal open={showDelete} title="Delete this analysis?" description={`This will remove ${repo.fullName} from your analysis history. This action cannot be undone.`} onCancel={()=>setShowDelete(false)} onConfirm={deleteAnalysis}/>
  </div>;
}
