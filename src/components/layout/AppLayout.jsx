import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Activity, Bug, ChevronDown, EyeOff, FileText, FlaskConical, GitCompare, GitPullRequest, Github, History, LayoutDashboard, LogOut, Menu, MessageSquare, Network, Plug, Rocket, Scale, Search, Settings, Sparkles, Wand2, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { ThemeToggle } from "../common";
import { AI_ACTIONS } from "../../utils/aiActions";
import { DOC_TYPES } from "../../utils/docTypes";
import { confirmDocumentNavigation } from "../../utils/docStudioGuard";

const links = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/analyze", label: "New analysis", icon: Sparkles },
  { to: "/history", label: "History", icon: History },
  { to: "/compare", label: "Compare", icon: GitCompare }
];
const baseCommands = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/analyze", label: "New analysis", icon: Sparkles },
  { to: "/history", label: "Analysis history", icon: History },
  { to: "/compare", label: "Compare repositories", icon: GitCompare },
  { to: "/profile", label: "Settings", icon: Settings }
];
const aiIconByName = { Sparkles, MessageSquare, Wand2, FlaskConical, Bug };
const aiCommandTitle = {
  explain: "Explain current file",
  comments: "Add comments to current file",
  refactor: "Suggest refactor for current file",
  tests: "Generate tests for current file",
  bugs: "Find bugs in current file"
};
const docIconByName = { FileText, Rocket, GitPullRequest, Network, EyeOff, Plug, History, Scale };
const commands = [
  ...baseCommands,
  ...DOC_TYPES.map((type) => ({
    documentType: type.id,
    label: `Generate ${type.label}`,
    icon: docIconByName[type.icon] || FileText
  })),
  ...AI_ACTIONS.map((action) => ({
    action: action.id,
    label: `AI: ${aiCommandTitle[action.id] || action.label}`,
    icon: aiIconByName[action.icon] || Sparkles
  }))
];

function Sidebar({ mobileOpen, close }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return <><div className={`sidebar-scrim ${mobileOpen ? "show" : ""}`} onClick={close} /><aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
    <Link to="/dashboard" className="brand"><span className="brand-mark"><Github size={17} /></span>Repo<span>Sense</span></Link>
    <div className="workspace-label">WORKSPACE</div>
    <nav className="side-nav">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={close} className={({ isActive }) => `side-link ${isActive ? "active" : ""}`}><Icon size={17} />{label}</NavLink>)}</nav>
    <div className="side-bottom"><div className="side-note"><div className="flex items-center gap-2 text-xs font-semibold"><Activity size={14} className="text-emerald-400" /> All systems operational</div><p>Analyzing public repositories only.</p></div><button className="side-link" onClick={() => navigate("/profile")}><Settings size={17} />Settings</button><button className="profile-mini" onClick={() => navigate("/profile")}><div className="avatar">{(user?.name || "G").slice(0, 1)}</div><span className="min-w-0 flex-1 text-left"><strong>{user?.name || "Guest"}</strong><small>{user?.email || "Guest workspace"}</small></span><ChevronDown size={15} /></button><button className="side-logout" onClick={() => { logout(); navigate("/"); }}><LogOut size={15} />Sign out</button></div>
  </aside></>;
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [aiActionsAvailable, setAiActionsAvailable] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const activeAnalysisId = location.pathname.match(/^\/analysis\/([^/]+)/)?.[1];
  const commandInput = useRef(null);
  const titles = { "/dashboard": "Overview", "/analyze": "New analysis", "/history": "Analysis history", "/compare": "Compare repositories", "/profile": "Settings" };
  const title = titles[location.pathname] || "Analysis workspace";
  const filteredCommands = useMemo(() => commands.filter((command) =>
    (!command.action || aiActionsAvailable) &&
    (!command.documentType || activeAnalysisId) &&
    command.label.toLowerCase().includes(commandQuery.trim().toLowerCase())
  ), [commandQuery, aiActionsAvailable, activeAnalysisId]);

  const runCommand = (command) => {
    if (command.action) {
      window.dispatchEvent(new CustomEvent("reposense:ai-file-action", { detail: command.action }));
    } else if (command.documentType && activeAnalysisId) {
      if (confirmDocumentNavigation()) {
        navigate(`/analysis/${activeAnalysisId}/readme?type=${encodeURIComponent(command.documentType)}`);
      }
    } else {
      if (confirmDocumentNavigation()) navigate(command.to);
    }
    setCommandOpen(false);
  };

  const guardInternalLink = (event) => {
    const anchor = event.target.closest?.("a[href]");
    if (!anchor || anchor.target && anchor.target !== "_self" || event.defaultPrevented) return;
    let destination;
    try {
      destination = new URL(anchor.href, window.location.href);
    } catch {
      return;
    }
    if (destination.origin !== window.location.origin) return;
    if (!confirmDocumentNavigation()) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  useEffect(() => {
    const updateAiActions = (event) => setAiActionsAvailable(Boolean(event.detail?.enabled));
    window.addEventListener("reposense:ai-actions-available", updateAiActions);
    return () => window.removeEventListener("reposense:ai-actions-available", updateAiActions);
  }, []);

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (commandOpen) commandInput.current?.focus();
    else setCommandQuery("");
  }, [commandOpen]);

  return <div className="app-shell" onClickCapture={guardInternalLink}>
    <Sidebar mobileOpen={mobileOpen} close={() => setMobileOpen(false)}/>
    <div className="app-main">
      <header className="topbar">
        <button className="icon-btn md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open menu"><Menu size={19}/></button>
        <div className="topbar-title">{title}</div>
        <div className="topbar-actions">
          <button type="button" className="topbar-search" aria-label="Open command palette" onClick={() => setCommandOpen(true)}><Search size={15}/><span>Search pages and actions...</span><kbd>Ctrl K</kbd></button>
          <ThemeToggle/>
          <button className="avatar top-avatar" aria-label="Open profile" onClick={() => navigate("/profile")}>{mobileOpen ? <X size={16}/> : "A"}</button>
        </div>
      </header>
      <main className="page-content"><Outlet/></main>
      <footer className="app-footer">RepoSense <span>·</span> Insights for your codebase <span className="ml-auto">AI output is advisory</span></footer>
    </div>
    {commandOpen && <div className="modal-backdrop command-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setCommandOpen(false)}>
      <section className="command-modal" role="dialog" aria-modal="true" aria-labelledby="command-title">
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search size={15} className="text-muted"/>
          <span id="command-title" className="sr-only">Command palette</span>
          <input ref={commandInput} value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} onKeyDown={(event) => {
            if (event.key === "Enter" && filteredCommands[0]) runCommand(filteredCommands[0]);
          }} placeholder="Search pages and actions..." aria-label="Search commands"/>
          <kbd>ESC</kbd>
        </div>
        <div className="p-2" role="listbox" aria-label="Commands">
          {filteredCommands.map(({ to, action, label, icon: Icon }) => <button key={action || to} role="option" className="command-option" onClick={() => runCommand({ to, action })}><Icon size={15}/>{label}</button>)}
          {!filteredCommands.length && <p className="m-0 p-4 text-center text-[10px] text-muted">No commands match.</p>}
        </div>
      </section>
    </div>}
  </div>;
}

function Link({ to, ...props }) {
  return <NavLink to={to} {...props} />;
}
