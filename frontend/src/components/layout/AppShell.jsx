import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Activity, Bot, ChevronDown, Code2, FileCode2, FileText, FolderTree, History, LayoutDashboard, Moon, Search, Settings, Sun, GitBranch } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const navItems = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/analyze', label: 'Analyze repository', icon: Search },
  { to: '/explorer', label: 'Structure explorer', icon: FolderTree },
  { to: '/technologies', label: 'Technology stack', icon: Code2 },
  { to: '/insights', label: 'AI insights', icon: Bot },
  { to: '/readme', label: 'README generator', icon: FileText },
  { to: '/history', label: 'Analysis history', icon: History }
]

export default function AppShell() {
  const { theme, toggleTheme } = useTheme()
  const { pathname } = useLocation()
  const currentPage = navItems.find(({ to }) => to === pathname)?.label || 'Repository intelligence'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><GitBranch size={20}/></span><span>Repo<span className="brand-accent">Sense</span></span></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list" aria-label="Workspace navigation">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/dashboard'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={17}/><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-link nav-button" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}
            <span>Switch to {theme === 'dark' ? 'light' : 'dark'} mode</span>
          </button>
          <div className="profile-mini"><div className="avatar">RS</div><div><strong>Developer</strong><small>Workspace</small></div><ChevronDown size={15}/></div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-sep">/</span><strong>{currentPage}</strong></div>
          <div className="top-actions"><span className="status-dot"/> <span className="status-text">All systems operational</span><button className="icon-button" aria-label="Settings"><Settings size={18}/></button></div>
        </header>
        <div className="page-content"><Outlet /></div>
      </main>
    </div>
  )
}

