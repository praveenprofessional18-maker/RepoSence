export default function PlaceholderPage({ title, description }) {
  return <div className="page-stack"><div className="eyebrow">REPOSENSE WORKSPACE</div><h1>{title}</h1><p className="page-description">{description}</p><section className="panel placeholder-panel"><div className="placeholder-symbol">✦</div><h2>{title} module</h2><p>This page is part of the approved RepoSense blueprint. Its working features will be implemented in the next development phases.</p></section></div>
}
