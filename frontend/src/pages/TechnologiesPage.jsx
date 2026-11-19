import { Code2 } from 'lucide-react'
import { readLatestAnalysis } from '../utils/repoStorage'

export default function TechnologiesPage() {
  const analysis = readLatestAnalysis()
  const languages = analysis?.summary?.languages || []

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <div className="eyebrow">TECHNOLOGY STACK</div>
          <h1>Languages and stack usage</h1>
        </div>
      </section>

      {analysis ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{analysis.repo.fullName}</h2>
              <p>Detected languages based on repository content.</p>
            </div>
            <span className="subtle-pill">{languages.length} languages</span>
          </div>

          <div className="tag-list">
            {languages.length ? languages.map(([name, bytes]) => (
              <div className="tech-pill" key={name}>
                <span className="tech-icon"><Code2 size={12} /></span>
                <span>{name}</span>
                <small>{bytes.toLocaleString()} bytes</small>
              </div>
            )) : <div className="empty-state">No language data available.</div>}
          </div>
        </section>
      ) : (
        <section className="panel empty-state-panel">
          <div className="placeholder-symbol">✦</div>
          <h2>No stack detected</h2>
          <p>Run a repository analysis to surface the technologies this project uses.</p>
        </section>
      )}
    </div>
  )
}
