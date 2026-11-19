import { useState } from 'react'
import { BrainCircuit, Clipboard, LoaderCircle, WandSparkles } from 'lucide-react'
import api from '../services/api'
import { readLatestAnalysis, saveLatestAnalysis } from '../utils/repoStorage'

export default function InsightsPage() {
  const [analysis, setAnalysis] = useState(readLatestAnalysis())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const insights = analysis?.insights || []

  const generateInsights = async () => {
    if (!analysis) return
    setLoading(true)
    setError('')
    setFeedback('')
    try {
      const { data } = await api.post('/ai/insights', {
        repo: analysis.repo,
        summary: analysis.summary
      })
      const next = { ...analysis, insights: data.insights }
      saveLatestAnalysis(next)
      setAnalysis(next)
      setFeedback('Insights generated from the latest repository analysis.')
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to generate insights right now.')
    } finally {
      setLoading(false)
    }
  }

  const copyInsight = async (item) => {
    try {
      await navigator.clipboard.writeText(`${item.title}\n\n${item.body}`)
      setFeedback(`Copied “${item.title}”.`)
      setError('')
    } catch {
      setError('Clipboard access is unavailable. Select and copy the insight manually.')
      setFeedback('')
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <div className="eyebrow">AI INSIGHTS / TERMINAL ASSISTANT</div>
          <h1>Project guidance and risk signals</h1>
          <p className="page-description">{analysis ? `Repository context: ${analysis.repo.fullName}` : 'Generate grounded insights from a repository analysis.'}</p>
        </div>
        <button className="button-primary" type="button" onClick={generateInsights} disabled={!analysis || loading}>
          {loading ? <LoaderCircle size={15} className="spinner" /> : <WandSparkles size={15} />}
          {loading ? 'Analyzing...' : 'Generate insights'}
        </button>
      </section>

      {error && <div className="form-error" role="alert">{error}</div>}
      {feedback && <div className="form-success" role="status">{feedback}</div>}

      {analysis && insights.length ? (
        <section className="insight-terminal" aria-label="Repository AI insights">
          <div className="terminal-toolbar">
            <span className="terminal-lights" aria-hidden="true"><i /><i /><i /></span>
            <span>reposence://insights/{analysis.repo.repo}</span>
            <span className="terminal-state">CONTEXT LOADED</span>
          </div>
          <div className="insight-list">
            {insights.map((item, index) => (
              <article key={`${item.title}-${index}`} className="insight-item">
                <div className="insight-badge"><BrainCircuit size={15} /></div>
                <div className="insight-copy">
                  <span className="terminal-prompt">INSIGHT_{String(index + 1).padStart(2, '0')}</span>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </div>
                <button className="icon-button copy-insight" type="button" aria-label={`Copy ${item.title}`} onClick={() => copyInsight(item)}><Clipboard size={15} /></button>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="panel empty-state-panel">
          <div className="placeholder-symbol"><BrainCircuit size={23} /></div>
          <h2>{analysis ? 'No AI recommendations yet' : 'Analyze a repository to begin'}</h2>
          <p>{analysis ? 'Generate insights to review architecture, maintenance, and documentation signals.' : 'The assistant uses repository analysis data; no sample or fabricated responses are shown.'}</p>
        </section>
      )}
    </div>
  )
}
