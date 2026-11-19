import { ArrowRight, BarChart3, Braces, FolderTree, GitBranch, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <main className="public-page">
      <nav className="public-nav" aria-label="Main navigation">
        <Link to="/" className="public-brand" aria-label="RepoSence home">
          <span className="public-brand-mark"><Braces size={20} /></span>
          <span>Repo<span>Sence</span></span>
        </Link>
        <div className="public-nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <Link to="/login" className="public-login-link">Log in</Link>
          <Link to="/register" className="public-register-link">Register</Link>
          <Link to="/dashboard" className="public-nav-button">Get started <ArrowRight size={15} /></Link>
        </div>
      </nav>

      <section className="public-hero">
        <div className="public-hero-copy">
          <div className="public-eyebrow"><Sparkles size={13} /> Repository intelligence</div>
          <h1>Understand any codebase.<br /><span>Build with clarity.</span></h1>
          <p>Turn GitHub repositories into clear insights, technology maps, and project documentation in seconds.</p>
          <div className="public-hero-actions">
            <Link to="/dashboard" className="public-primary-button">Analyze a repository <ArrowRight size={17} /></Link>
            <a href="#how-it-works" className="public-secondary-button">See how it works</a>
          </div>
          <div className="public-proof"><ShieldCheck size={16} /><span>No setup required. Works with public GitHub repositories.</span></div>
        </div>

        <div className="public-hero-visual" aria-label="Repository analysis preview">
          <div className="visual-glow" />
          <div className="repo-window">
            <div className="repo-window-bar"><div><i /><i /><i /></div><span>repo-analysis</span><GitBranch size={15} /></div>
            <div className="repo-window-body">
              <aside className="repo-preview-sidebar"><div className="repo-preview-avatar">R</div><span /><span /><span /><span /></aside>
              <div className="repo-preview-main">
                <div className="repo-preview-heading"><div><small>REPOSITORY</small><strong>acme/platform</strong></div><span>Analyzed</span></div>
                <div className="repo-preview-metrics">
                  <div><small>Languages</small><strong>8</strong></div>
                  <div><small>Files</small><strong>246</strong></div>
                  <div><small>Health</small><strong>92%</strong></div>
                </div>
                <div className="repo-preview-chart">
                  {[38,64,48,82,72,92,58,78].map((height) => <span key={height} style={{ height: `${height}%` }} />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="public-feature-strip" id="features">
        <article><span><FolderTree size={19} /></span><div><strong>Explore structure</strong><p>Navigate files, folders, and project organization.</p></div></article>
        <article><span><Braces size={19} /></span><div><strong>Detect the stack</strong><p>Identify languages and technologies at a glance.</p></div></article>
        <article><span><BarChart3 size={19} /></span><div><strong>Get clear insights</strong><p>Review architecture and maintenance signals.</p></div></article>
      </section>

      <section className="public-how" id="how-it-works">
        <div className="public-eyebrow">Simple workflow</div>
        <h2>From repository to understanding</h2>
        <div className="public-steps">
          <article><b>01</b><strong>Paste a GitHub URL</strong><p>Choose any public repository and optional branch.</p></article>
          <article><b>02</b><strong>Analyze the codebase</strong><p>RepoSence gathers structure and language data.</p></article>
          <article><b>03</b><strong>Explore the results</strong><p>Use insights, charts, history, and README tools.</p></article>
        </div>
      </section>
    </main>
  )
}