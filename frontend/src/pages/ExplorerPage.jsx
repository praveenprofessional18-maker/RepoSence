import { useMemo, useState } from 'react'
import { FileCode2, FileText, Folder, FolderOpen, Search } from 'lucide-react'
import { readLatestAnalysis } from '../utils/repoStorage'

function formatBytes(bytes = 0) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ExplorerPage() {
  const analysis = readLatestAnalysis()
  const files = analysis?.summary?.tree || []
  const [query, setQuery] = useState('')
  const [selectedPath, setSelectedPath] = useState('')
  const visibleFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return normalizedQuery
      ? files.filter((item) => `${item.path} ${item.type}`.toLowerCase().includes(normalizedQuery))
      : files
  }, [files, query])
  const selectedFile = files.find((item) => item.path === selectedPath)

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <div className="eyebrow">STRUCTURE EXPLORER / FILE MANAGER</div>
          <h1>Repository file system</h1>
          <p className="page-description">Browse top-level entries returned by the repository analysis.</p>
        </div>
      </section>

      {analysis ? (
        <section className="explorer-window">
          <div className="terminal-toolbar">
            <span className="terminal-lights" aria-hidden="true"><i /><i /><i /></span>
            <span>{analysis.repo.fullName}</span>
            <span className="terminal-state">{analysis.summary.defaultBranch}</span>
          </div>
          <div className="explorer-toolbar">
            <div className="explorer-breadcrumb"><Folder size={14} /><span>root</span><span className="crumb-sep">/</span><strong>{analysis.repo.repo}</strong></div>
            <label className="explorer-search">
              <Search size={15} />
              <span className="sr-only">Search repository entries</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files and folders" />
            </label>
          </div>
          <div className="explorer-columns">
            <div className="explorer-list" role="list" aria-label="Repository entries">
              <div className="explorer-list-heading"><span>NAME</span><span>TYPE</span><span>SIZE</span></div>
              {visibleFiles.length ? visibleFiles.map((item) => (
                <button className={`explorer-entry ${selectedPath === item.path ? 'selected' : ''}`} type="button" key={`${item.path}-${item.type}`} onClick={() => setSelectedPath(item.path)}>
                  <span className="explorer-entry-name">
                    {item.type === 'dir' ? (selectedPath === item.path ? <FolderOpen size={16} /> : <Folder size={16} />) : <FileCode2 size={16} />}
                    <strong>{item.name}</strong>
                  </span>
                  <span>{item.type}</span>
                  <span>{formatBytes(item.size)}</span>
                </button>
              )) : <p className="empty-state explorer-empty">No entries match “{query}”.</p>}
            </div>
            <aside className="explorer-detail">
              {selectedFile ? (
                <>
                  <div className="explorer-detail-icon">{selectedFile.type === 'dir' ? <FolderOpen size={22} /> : <FileText size={22} />}</div>
                  <span className="terminal-prompt">SELECTED ENTRY</span>
                  <h2>{selectedFile.name}</h2>
                  <dl>
                    <div><dt>Path</dt><dd>{selectedFile.path}</dd></div>
                    <div><dt>Type</dt><dd>{selectedFile.type}</dd></div>
                    <div><dt>Size</dt><dd>{formatBytes(selectedFile.size)}</dd></div>
                  </dl>
                  <p className="explorer-note">Content previews are not provided by the current analysis API.</p>
                </>
              ) : (
                <div className="explorer-detail-empty"><FolderOpen size={23} /><span>Select an entry to inspect its details.</span></div>
              )}
            </aside>
          </div>
        </section>
      ) : (
        <section className="panel empty-state-panel">
          <div className="placeholder-symbol">✦</div>
          <h2>Analyze a repository first</h2>
          <p>Once you inspect a GitHub project, its available file and folder entries will appear here.</p>
        </section>
      )}
    </div>
  )
}
