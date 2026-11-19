import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowRight, Eye, GitFork, Github, GitPullRequest, Scale, Star } from "lucide-react";
import toast from "react-hot-toast";
import { repoService } from "../services/repoService";
import { Button, Input, Spinner, TechBadge } from "../components/common";

const examples = ["vercel/next.js", "facebook/react", "expressjs/express", "octocat/hello-world"];
const steps = ["Validating repository", "Fetching metadata", "Reading file tree", "Detecting tech stack", "Generating AI insights"];
const urlPattern = /^https?:\/\/(?:www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?$/i;

export default function Analyzer() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [url, setUrl] = useState(params.get("url") || "");
  const [repo, setRepo] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(-1);
  useEffect(() => { const query = params.get("url"); if (query) setUrl(query); }, [params]);
  const validate = (value) => {
    if (!value.trim()) return "Paste a GitHub repository URL to continue.";
    if (!/^https?:\/\//i.test(value)) return "Include https:// at the beginning of the URL.";
    if (!urlPattern.test(value.trim())) return "Use the format github.com/owner/repository. Only public repositories are supported.";
    return "";
  };
  const analyze = async (event) => {
    event.preventDefault();
    const invalid = validate(url);
    if (invalid) { setError(invalid); return; }
    setError(""); setLoading(true); setRepo(null); setStep(0);
    const timer = setInterval(() => setStep((current) => Math.min(current + 1, steps.length - 1)), 350);
    try {
      const result = await repoService.analyze(url.trim());
      clearInterval(timer); setStep(steps.length); setRepo(result); toast.success("Repository analysis is ready");
    } catch (e) { clearInterval(timer); setLoading(false); setStep(-1); setError(e.message || "Could not analyze this repository."); toast.error(e.message || "Analysis failed"); return; }
    setLoading(false);
  };
  const onChange = (value) => { setUrl(value); setError(validate(value)); setRepo(null); };
  return <div><div className="page-heading"><div><h1>Repository analyzer</h1><p>Get a clear first look at any public GitHub repository.</p></div></div>
    <section className="card analyzer-card"><div className="card-content p-6 sm:p-8"><div className="mb-2 flex items-center gap-2"><span className="feature-icon"><Github size={17}/></span><h2 className="text-sm font-semibold">Start with a repository URL</h2></div><p className="text-xs leading-6 text-muted">We’ll map the codebase, identify its stack, and generate helpful AI insights. Only public repositories are supported.</p>
      <form className="analyzer-input" onSubmit={analyze} noValidate><Input value={url} onChange={(e)=>onChange(e.target.value)} placeholder="https://github.com/owner/repository" aria-label="GitHub repository URL" error={error}/><Button type="submit" disabled={loading}>{loading ? <Spinner label="Analyzing" /> : <>Analyze repository <ArrowRight size={14}/></>}</Button></form>
      <div className="examples"><span>Try an example:</span>{examples.map((item)=><button type="button" className="example-chip" key={item} onClick={()=>onChange(`https://github.com/${item}`)}>{item}</button>)}</div>
      {loading && <div className="mt-7 border-t border-line pt-5"><div className="mb-3 text-xs font-semibold">Analyzing repository</div><div className="progress-steps">{steps.map((label,index)=><div className={`progress-step ${index <= step ? "done" : ""}`} key={label}><span className="progress-dot">{index < step ? "✓" : index === step ? <span className="animate-pulse">•</span> : index+1}</span>{label}</div>)}</div></div>}
      {repo && !loading && <div className="mt-7 border-t border-line pt-6"><div className="repo-meta"><div className="repo-meta-avatar"><Github size={23}/></div><div className="min-w-0 flex-1"><h3 className="m-0 text-base font-semibold">{repo.fullName}</h3><p className="mt-1 text-xs text-muted">{repo.description}</p></div><span className="tag tag-success">Ready</span></div><div className="meta-stats"><span><Star size={13}/>{repo.stars.toLocaleString()} stars</span><span><GitFork size={13}/>{repo.forks.toLocaleString()} forks</span><span><Eye size={13}/>{repo.watchers.toLocaleString()} watchers</span><span><GitPullRequest size={13}/>{repo.issues} open issues</span></div><div className="meta-grid"><div><small>License</small><strong><Scale size={12} className="mr-1 inline"/>{repo.license}</strong></div><div><small>Default branch</small><strong>{repo.branch}</strong></div><div><small>Primary language</small><strong>{repo.language}</strong></div><div><small>Last updated</small><strong>{new Date(repo.updatedAt).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}</strong></div></div><div className="mt-4 flex flex-wrap gap-2">{repo.topics.map((topic)=><TechBadge key={topic}>{topic}</TechBadge>)}</div><div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-5"><p className="m-0 flex items-center gap-2 text-[10px] text-muted"><AlertCircle size={13}/>AI output is advisory and should be verified.</p><Button onClick={()=>navigate(`/analysis/${repo.id}`)}>Open analysis <ArrowRight size={14}/></Button></div></div>}
    </div></section>
  </div>;
}
