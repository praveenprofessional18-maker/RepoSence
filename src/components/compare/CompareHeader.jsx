import { ExternalLink, GitFork, GitPullRequest, Star, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { TechBadge } from "../common";

function formatNumber(value) {
  return Number.isFinite(value) ? value.toLocaleString() : "—";
}

function RepoCard({ repository, slot }) {
  return <article className="card min-w-0 p-4 sm:p-5">
    <div className="flex items-start gap-3">
      {repository.avatar
        ? <img src={repository.avatar} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover"/>
        : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-panel2 text-sm font-semibold text-violet-400">{repository.fullName.slice(0, 1).toUpperCase()}</span>}
      <div className="min-w-0 flex-1">
        <span className="text-[9px] uppercase tracking-wide text-muted">Repo {slot}</span>
        <h2 className="m-0 truncate text-sm font-semibold">{repository.fullName}</h2>
        <p className="mb-0 mt-1 line-clamp-2 text-[10px] leading-5 text-muted">{repository.description}</p>
      </div>
    </div>
    <div className="my-4 flex flex-wrap gap-2">
      <TechBadge><Star size={11}/>{formatNumber(repository.stars)} stars</TechBadge>
      <TechBadge><GitFork size={11}/>{formatNumber(repository.forks)} forks</TechBadge>
      <TechBadge><Eye size={11}/>{formatNumber(repository.watchers)} watchers</TechBadge>
      <TechBadge><GitPullRequest size={11}/>{formatNumber(repository.issues)} issues</TechBadge>
      <TechBadge>{repository.language || "Unknown"}</TechBadge>
      <TechBadge>Updated {repository.updatedAt ? new Date(repository.updatedAt).toLocaleDateString() : "unknown"}</TechBadge>
    </div>
    <div className="flex flex-wrap gap-2">
      <Link className="btn btn-secondary btn-sm" to={`/analysis/${encodeURIComponent(repository.id)}`}>Open analysis</Link>
      {repository.url && <a className="btn btn-ghost btn-sm" href={repository.url} target="_blank" rel="noreferrer"><ExternalLink size={12}/>Open on GitHub</a>}
    </div>
  </article>;
}

export default function CompareHeader({ repos }) {
  return <section className="grid min-w-0 gap-3 md:grid-cols-2" aria-label="Compared repositories">
    {repos.map((repository, index) => <RepoCard key={repository.id} repository={repository} slot={index === 0 ? "A" : "B"}/>)}
  </section>;
}
