import { useMemo, useState } from 'react'
import { ArrowRight, BrainCircuit, FileText, GitBranch, LoaderCircle, Plus, Sparkles } from 'lucide-react'
import api from '../services/api'
import { pushHistory, readLatestAnalysis, saveLatestAnalysis } from '../utils/repoStorage'

const defaultRepo = 'https://github.com/vercel/next.js'

export default function AnalyzePage() {
  const [repoUrl, setRepoUrl] = useState(defaultRepo)
  const [branch, setBranch] = useState('')
  const [result, setResult] = useState(readLatestAnalysis())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionBusy, setActionBusy] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionMessage, setActionMessage] = useState('')

  const summaryCards = useMemo(() => {
    if (!result?.summary) return []
    return [
      { label: 'Repository', value: result.repo.fullName, note: 'Project identity', icon: GitBranch },
      { label: 'Stars', value: String(result.summary.stars), note: 'GitHub popularity', icon: Sparkles },
      { label: 'Forks', value: String(result.summary.forks), note: 'Community activity', icon: Plus },
      { label: 'Open issues', value: String(result.summary.openIssues), note: 'Maintenance health', icon: FileText }
    ]
  }, [result])

  const handleAnalyze = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data } = await api.post('/analyze', { repoUrl, branch })
      const payload = {
        ...data,
        analyzedAt: new Date().toISOString()
      }
      pushHistory({
        fullName: data.repo.fullName,
        url: data.repo.url,
        analyzedAt: payload.analyzedAt
      })
      saveLatestAnalysis(payload)
      setResult(payload)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to analyze this repository right now.')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateInsights = async () => {
    if (!result) return
    setActionBusy('insights')
    setActionError('')
    setActionMessage('')
    try {
      const { data } = await api.post('/ai/insights', {
        repo: result.repo,
        summary: result.summary
      })
      const next = { ...result, insights: data.insights }
      saveLatestAnalysis(next)
      setResult(next)
      setActionMessage('Insights generated.')
    } catch (err) {
      setActionError(err.response?.data?.error || 'Unable to generate insights right now.')
    } finally {
      setActionBusy('')
    }
  }

  const handleGenerateReadme = async () => {
    if (!result) return
    setActionBusy('readme')
    setActionError('')
    setActionMessage('')
    try {
      const { data } = await api.post('/readme', {
        repo: result.repo,
        summary: result.summary
      })
      const next = { ...result, readme: data.markdown }
      saveLatestAnalysis(next)
      setResult(next)
      setActionMessage('README draft generated.')
    } catch (err) {
      setActionError(err.response?.data?.error || 'Unable to generate the README right now.')
    } finally {
      setActionBusy('')
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <div className="eyebrow">REPOSITORY ANALYZER</div>
          <h1>Inspect a GitHub project in seconds.</h1>
        </div>
      </section>

      <section className="panel">
        <form className="form-grid" onSubmit={handleAnalyze}>
          <label className="field-group">
            <span>Repository URL</span>
            <input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/owner/repository" />
          </label>
          <label className="field-group small-field">
            <span>Branch (optional)</span>
            <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" />
          </label>
          <button className="button-primary form-submit" type="submit" disabled={loading}>
            {loading ? <><LoaderCircle size={16} className="spinner" /> Analyzing...</> : <>Analyze repository <ArrowRight size={16} /></> }
          </button>
        </form>
        {error && <div className="form-error">{error}</div>}
      </section>

      {result && (
        <>
          <section className="metric-grid">
            {summaryCards.map(({ label, value, note, icon: Icon }) => (
              <article className="metric-card" key={label}>
                <div className="metric-top">
                  <span>{label}</span>
                  <span className="metric-icon"><Icon size={16} /></span>
                </div>
                <div className="metric-value metric-compact">{value}</div>
                <div className="metric-note">{note}</div>
              </article>
            ))}
          </section>

          <section className="content-grid">
            <article className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Repository summary</h2>
                  <p>{result.repo.description}</p>
                </div>
                <span className="subtle-pill">{result.summary.defaultBranch}</span>
              </div>
              <div className="info-grid">
                <div><strong>Owner</strong><span>{result.repo.owner}</span></div>
                <div><strong>Default branch</strong><span>{result.summary.defaultBranch}</span></div>
                <div><strong>License</strong><span>{result.summary.license}</span></div>
                <div><strong>Last updated</strong><span>{new Date(result.summary.updatedAt).toLocaleDateString()}</span></div>
              </div>
            </article>

            <article className="panel quick-panel">
              <div className="panel-heading">
                <div>
                  <h2>AI actions</h2>
                  <p>Generate a quick analysis and docs draft.</p>
                </div>
              </div>
              <button className="button-secondary action-button" type="button" onClick={handleGenerateInsights} disabled={Boolean(actionBusy)}>
                {actionBusy === 'insights' ? <LoaderCircle size={16} className="spinner" /> : <BrainCircuit size={16} />}
                {actionBusy === 'insights' ? 'Generating insights...' : 'Generate insights'}
              </button>
              <button className="button-secondary action-button" type="button" onClick={handleGenerateReadme} disabled={Boolean(actionBusy)}>
                {actionBusy === 'readme' ? <LoaderCircle size={16} className="spinner" /> : <FileText size={16} />}
                {actionBusy === 'readme' ? 'Generating README...' : 'Generate README'}
              </button>
              {actionError && <p className="form-error action-feedback">{actionError}</p>}
              {actionMessage && <p className="form-success action-feedback">{actionMessage}</p>}
            </article>
          </section>

          {result.insights && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>AI insights</h2>
                  <p>Generated automatically from the repository summary.</p>
                </div>
              </div>
              <div className="insight-list">
                {result.insights.map((item) => (
                  <div key={item.title} className="insight-item">
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {result.readme && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>README preview</h2>
                  <p>Draft content generated from the repository metadata.</p>
                </div>
              </div>
              <pre className="markdown-preview">{result.readme}</pre>
            </section>
          )}
        </>
      )}
    </div>
  )
}
