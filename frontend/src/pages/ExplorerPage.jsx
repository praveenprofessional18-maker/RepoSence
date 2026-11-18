import { useState } from 'react'
import { FileCode2, Folder, Search } from 'lucide-react'
import { fetchRepositoryContents, parseGitHubRepository } from '../services/githubRepository'
import './ExplorerPage.css'

export default function ExplorerPage() {
  const [repositoryInput, setRepositoryInput] = useState('')
  const [repository, setRepository] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [entryType, setEntryType] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const loadRepository = async (event) => {
    event.preventDefault()
    let parsedRepository
    try {
      parsedRepository = parseGitHubRepository(repositoryInput)
    } catch (validationError) {
      setError(validationError.message)
      return
    }

    setIsLoading(true)
    setError('')
    try {
      setRepository(await fetchRepositoryContents(parsedRepository))
    } catch (requestError) {
      setError(requestError.message || 'Unable to load this repository.')
    } finally {
      setIsLoading(false)
    }
  }

  const visibleEntries = (repository?.entries || []).filter((entry) => {
    const matchesSearch = `${entry.name} ${entry.path}`.toLowerCase().includes(searchTerm.trim().toLowerCase())
    const matchesType = entryType === 'all' || (entryType === 'folders' ? entry.type === 'dir' : entry.type === 'file')
    return matchesSearch && matchesType
  })

  return (
    <div className="page-stack">
      <header>
        <div className="eyebrow">REPOSITORY BROWSER</div>
        <h1>Structure explorer</h1>
        <p className="page-description">Browse the root files and folders of a public GitHub repository.</p>
      </header>

      <section className="panel explorer-panel" aria-labelledby="explorer-title">
        <div className="panel-heading">
          <div>
            <h2 id="explorer-title">Choose a repository</h2>
            <p>Use a GitHub URL or the owner/repository format.</p>
          </div>
          <Search size={18} aria-hidden="true" />
        </div>
        <form className="explorer-form" onSubmit={loadRepository}>
          <label htmlFor="explorer-repository">GitHub repository</label>
          <div className="explorer-input-row">
            <input id="explorer-repository" value={repositoryInput} onChange={(event) => setRepositoryInput(event.target.value)} placeholder="octocat/hello-world" required />
            <button className="button-primary" type="submit" disabled={isLoading}>{isLoading ? 'Loading…' : 'Browse'}</button>
          </div>
        </form>

        {isLoading && <p className="explorer-status" role="status">Loading repository structure…</p>}
        {error && <p className="explorer-error" role="alert">{error}</p>}

        {repository && !isLoading && (
          <div className="explorer-results">
            <div className="explorer-repository-heading">
              <div>
                <h2>{repository.fullName}</h2>
                {repository.description && <p>{repository.description}</p>}
              </div>
              <span>{repository.entries.length} root entries</span>
            </div>
            <div className="explorer-filters">
              <label>
                <span>Search entries</span>
                <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Filter by name or path" />
              </label>
              <label>
                <span>Show</span>
                <select value={entryType} onChange={(event) => setEntryType(event.target.value)}>
                  <option value="all">All entries</option>
                  <option value="folders">Folders</option>
                  <option value="files">Files</option>
                </select>
              </label>
            </div>
            <ul className="explorer-entry-list">
              {visibleEntries.map((entry) => (
                <li key={entry.path}>
                  {entry.type === 'dir' ? <Folder size={16} aria-hidden="true" /> : <FileCode2 size={16} aria-hidden="true" />}
                  <span>{entry.name}</span>
                  <small>{entry.type === 'dir' ? 'Folder' : 'File'}</small>
                </li>
              ))}
            </ul>
            {!visibleEntries.length && <p className="explorer-empty-filter">No entries match the current filters.</p>}
          </div>
        )}
      </section>
    </div>
  )
}
