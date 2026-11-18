import { useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { buildReadmeMarkdown, validateReadmeInput } from '../utils/readmeBuilder'
import './ReadmePage.css'

export default function ReadmePage() {
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [technologies, setTechnologies] = useState('')
  const [features, setFeatures] = useState('')
  const [validationMessage, setValidationMessage] = useState('')
  const [isValidated, setIsValidated] = useState(false)
  const markdown = useMemo(() => buildReadmeMarkdown({
    projectName: projectName || 'Project',
    description,
    technologies,
    features
  }), [projectName, description, technologies, features])

  const updateField = (setter) => (event) => {
    setter(event.target.value)
    setIsValidated(false)
    setValidationMessage('')
  }

  const validateDraft = (event) => {
    event.preventDefault()
    const message = validateReadmeInput({ projectName, description })
    setValidationMessage(message || 'README draft is ready to export.')
    setIsValidated(!message)
  }

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
          <form className="readme-fields" noValidate onSubmit={validateDraft}>
            <label htmlFor="readme-project-name">Project name</label>
            <input id="readme-project-name" value={projectName} onChange={updateField(setProjectName)} placeholder="My project" required />
            <label htmlFor="readme-description">Description</label>
            <textarea id="readme-description" value={description} onChange={updateField(setDescription)} placeholder="What does this project do?" rows={5} required />
            <label htmlFor="readme-technologies">Tech stack <span>(comma-separated)</span></label>
            <input id="readme-technologies" value={technologies} onChange={updateField(setTechnologies)} placeholder="React, Vite, Node.js" />
            <label htmlFor="readme-features">Features <span>(one per line)</span></label>
            <textarea id="readme-features" value={features} onChange={updateField(setFeatures)} placeholder={'Repository analysis\nTechnology insights'} rows={4} />
            <button className="button-primary" type="submit">Validate README</button>
            {validationMessage && <p className={isValidated ? 'readme-validation-success' : 'readme-validation-error'} role={isValidated ? 'status' : 'alert'}>{validationMessage}</p>}
          </form>
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
