import {
  ArrowUpRight,
  Code2,
  FileCode2,
  GitBranch,
  Plus,
  Sparkles,
  Activity
} from 'lucide-react'

import { Link } from 'react-router-dom'

const metrics = [
  {
    label: 'Repositories analyzed',
    value: '—',
    note: 'Your analysis workspace',
    icon: GitBranch
  },
  {
    label: 'Files inspected',
    value: '—',
    note: 'Across analyzed repositories',
    icon: FileCode2
  },
  {
    label: 'Technologies detected',
    value: '—',
    note: 'Languages and frameworks',
    icon: Code2
  },
  {
    label: 'Reports generated',
    value: '—',
    note: 'AI-assisted reports',
    icon: Sparkles
  }
]

export default function Dashboard() {
  return (
    <div className="page-stack">

      <section className="welcome-row">
        <div>
          <div className="eyebrow">DEVELOPER WORKSPACE</div>
          <h1>
            Repository intelligence,{' '}
            <span className="gradient-text">simplified.</span>
          </h1>
          <p>
            Understand codebases faster with structured repository
            analysis and AI-powered insights.
          </p>
        </div>

        <Link to="/analyze" className="button-primary">
          <Plus size={17} />
          Analyze repository
        </Link>
      </section>

      <section className="metric-grid">
        {metrics.map(({ label, value, note, icon: Icon }) => (
          <article className="metric-card" key={label}>
            <div className="metric-top">
              <span>{label}</span>
              <span className="metric-icon">
                <Icon size={18} />
              </span>
            </div>

            <div className="metric-value">{value}</div>
            <div className="metric-note">{note}</div>
          </article>
        ))}
      </section>

      <section className="content-grid">

        <article className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Analysis activity</h2>
              <p>Repository analysis activity will appear here.</p>
            </div>
            <span className="subtle-pill">Overview</span>
          </div>

          <div className="empty-chart">
            <div className="empty-chart-icon">
              <Activity size={25} />
            </div>

            <strong>No analysis activity yet</strong>

            <span>
              Analyze a public GitBranch repository to start building
              your workspace.
            </span>

            <Link to="/analyze" className="text-link">
              Start your first analysis
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </article>

        <article className="panel quick-panel">
          <div className="panel-heading">
            <div>
              <h2>Quick start</h2>
              <p>Get useful insights from a codebase.</p>
            </div>
          </div>

          <div className="quick-step">
            <span>01</span>
            <div>
              <strong>Connect a repository</strong>
              <p>Paste a public GitBranch repository URL.</p>
            </div>
          </div>

          <div className="quick-step">
            <span>02</span>
            <div>
              <strong>Inspect the structure</strong>
              <p>Explore folders, files and technologies.</p>
            </div>
          </div>

          <div className="quick-step">
            <span>03</span>
            <div>
              <strong>Generate AI insights</strong>
              <p>Explain architecture and create documentation.</p>
            </div>
          </div>

          <Link to="/analyze" className="button-secondary">
            Get started
            <ArrowUpRight size={16} />
          </Link>
        </article>

      </section>
    </div>
  )
}

