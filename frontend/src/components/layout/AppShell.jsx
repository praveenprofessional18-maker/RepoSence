import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Activity, Bot, ChevronDown, Code2, FileCode2, FileText, FolderTree, History, LayoutDashboard, Menu, Moon, Search, Settings, Sun, GitBranch } from 'lucide-react'
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!sidebarOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sidebarOpen])

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="sidebar-backdrop" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside id="workspace-navigation" className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand"><span className="brand-mark"><GitBranch size={20}/></span><span>Repo<span className="brand-accent">Sense</span></span></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list" aria-label="Workspace navigation">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/dashboard'} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
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
        <div className="topbar-leading">
          <button className="icon-button menu-button" type="button" aria-label="Open navigation" aria-expanded={sidebarOpen} aria-controls="workspace-navigation" onClick={() => setSidebarOpen(true)}><Menu size={19}/></button>
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-sep">/</span><strong>{currentPage}</strong></div>
        </div>
          <div className="top-actions"><span className="status-dot"/> <span className="status-text">All systems operational</span><button className="icon-button" aria-label="Settings"><Settings size={18}/></button></div>
        </header>
        <div className="page-content"><Outlet /></div>
      </main>
    </div>
  )
}

