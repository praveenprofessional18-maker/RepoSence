import { useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { buildReadmeMarkdown } from '../utils/readmeBuilder'
import './ReadmePage.css'

export default function ReadmePage() {
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const markdown = useMemo(() => buildReadmeMarkdown({ projectName: projectName || 'Project', description }), [projectName, description])

  return (
    <div className="page-stack">
      <header className="readme-page-heading">
        <div className="eyebrow">DOCUMENTATION WORKSPACE</div>
        <h1>README generator</h1>
        <p className="page-description">Draft a clear project introduction and preview the Markdown as you write.</p>
      </header>

      <div className="readme-layout">
        <section className="panel readme-editor" aria-labelledby="readme-editor-title">
          <div className="panel-heading">
            <div>
              <h2 id="readme-editor-title">Project details</h2>
              <p>Start with a name and a short description.</p>
            </div>
            <FileText size={18} aria-hidden="true" />
          </div>
          <div className="readme-fields">
            <label htmlFor="readme-project-name">Project name</label>
            <input id="readme-project-name" value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="My project" />
            <label htmlFor="readme-description">Description</label>
            <textarea id="readme-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What does this project do?" rows={5} />
          </div>
        </section>

        <section className="panel readme-preview" aria-labelledby="readme-preview-title">
          <div className="panel-heading">
            <div>
              <h2 id="readme-preview-title">Markdown preview</h2>
              <p>README.md</p>
            </div>
          </div>
          <pre>{markdown}</pre>
        </section>
      </div>
    </div>
  )
}
