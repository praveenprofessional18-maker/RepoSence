import { useState } from 'react'
import { ArrowUpRight, Copy, GitBranch, LoaderCircle, Search, X } from 'lucide-react'
import api from '../services/api'
import { validateRepositoryInput } from '../utils/repositoryUrl'

export default function AnalyzePage() {
  const [repoUrl, setRepoUrl] = useState('')
  const [branch, setBranch] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [copyMessage, setCopyMessage] = useState('')

  const copyRepositoryLink = async () => {
    try {
      await navigator.clipboard.writeText(analysis.repo.url)
      setCopyMessage('Repository link copied.')
    } catch {
      setCopyMessage('Clipboard access is unavailable. Use the GitHub link instead.')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validationError = validateRepositoryInput(repoUrl)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await api.post('/analyze', {
        repoUrl: repoUrl.trim(),
        branch: branch.trim() || undefined
      })
      setAnalysis(response.data)
      setCopyMessage('')
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || 'Unable to analyze this repository.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="page-stack">
      <div>
        <div className="eyebrow">REPOSITORY ANALYSIS</div>
        <h1>Analyze a GitHub repository</h1>
        <p className="page-description">Enter a public repository to inspect its structure, languages, and project metadata.</p>
      </div>

      <section className="panel analyze-panel" aria-labelledby="analyze-title">
        <div className="panel-heading">
          <div>
            <h2 id="analyze-title">Repository details</h2>
            <p>Choose a repository and, optionally, a branch to inspect.</p>
          </div>
          <Search size={18} className="panel-heading-icon" aria-hidden="true" />
        </div>

        <form id="repository-analysis-form" className="analyze-form" onSubmit={handleSubmit}>
          <label htmlFor="repository-url">GitHub repository</label>
          <input
            id="repository-url"
            name="repository"
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
            placeholder="https://github.com/owner/repository"
            autoComplete="url"
            required
          />
          <label htmlFor="repository-branch">Branch <span>(optional)</span></label>
          <input
            id="repository-branch"
            name="branch"
            value={branch}
            onChange={(event) => setBranch(event.target.value)}
            placeholder="main"
            autoComplete="off"
          />
          <button className="button-primary analyze-submit" type="submit" disabled={isLoading}>
            {isLoading ? <LoaderCircle size={16} className="spinner" /> : <GitBranch size={16} />}
            {isLoading ? 'Analyzing repository…' : 'Analyze repository'}
          </button>
        </form>

        {isLoading && <p className="analyze-loading" role="status" aria-live="polite">Checking repository details and languages…</p>}
        {error && (
          <div className="analyze-error" role="alert">
            <p>{error}</p>
            <button className="button-secondary" type="submit" form="repository-analysis-form" disabled={isLoading}>Try again</button>
          </div>
        )}

        {analysis && (
          <article className="analysis-result">
            <div className="analysis-result-heading">
              <div>
                <div className="eyebrow">ANALYSIS COMPLETE</div>
                <h2>{analysis.repo.fullName}</h2>
              </div>
              <a href={analysis.repo.url} target="_blank" rel="noreferrer" aria-label={`Open ${analysis.repo.fullName} on GitHub`}>
                <ArrowUpRight size={17} />
              </a>
            </div>
            <p>{analysis.repo.description}</p>
            <div className="analysis-result-actions">
              <button className="button-secondary" type="button" onClick={copyRepositoryLink}><Copy size={14} /> Copy GitHub link</button>
              <button className="button-secondary" type="button" onClick={() => { setAnalysis(null); setCopyMessage('') }}><X size={14} /> Clear result</button>
            </div>
            {copyMessage && <p className="analysis-copy-message">{copyMessage}</p>}
            <dl className="analysis-summary">
              <div><dt>Stars</dt><dd>{analysis.summary.stars}</dd></div>
              <div><dt>Forks</dt><dd>{analysis.summary.forks}</dd></div>
              <div><dt>Open issues</dt><dd>{analysis.summary.openIssues}</dd></div>
              <div><dt>Default branch</dt><dd>{analysis.summary.defaultBranch}</dd></div>
            </dl>
          </article>
        )}
      </section>
    </div>
  )
}
