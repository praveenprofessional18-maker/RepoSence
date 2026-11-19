import { History } from 'lucide-react'
import { readHistory } from '../utils/repoStorage'

export default function HistoryPage() {
  const items = readHistory()

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <div className="eyebrow">ANALYSIS HISTORY</div>
          <h1>Previous repository scans</h1>
        </div>
      </section>

      <section className="panel">
        {items.length ? (
          <div className="history-list">
            {items.map((item) => (
              <div key={`${item.fullName}-${item.analyzedAt}`} className="history-item">
                <span className="history-icon"><History size={15} /></span>
                <div>
                  <strong>{item.fullName}</strong>
                  <small>{new Date(item.analyzedAt).toLocaleString()}</small>
                </div>
                <a href={item.url} target="_blank" rel="noreferrer">Open repo</a>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No repository analyses have been recorded yet.</div>
        )}
      </section>
    </div>
  )
}
