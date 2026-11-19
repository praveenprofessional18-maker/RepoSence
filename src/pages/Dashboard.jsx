import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, ArrowRight, BarChart3, Clock3, FileText, GitCompare, GitFork, HeartPulse, Plus, Search, ShieldAlert, Sparkles } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import toast from "react-hot-toast";
import { historyService } from "../services/historyService";
import { useAuth } from "../context/AuthContext";
import { Button, EmptyState, ErrorState, Input, Skeleton } from "../components/common";
import StatCard from "../components/dashboard/StatCard";

const COLORS = ["#8b5cf6", "#6366f1", "#22c55e", "#f59e0b", "#ec4899"];
const trend = [{ date:"Feb 10",count:2 },{ date:"Feb 12",count:4 },{ date:"Feb 14",count:3 },{ date:"Feb 16",count:6 },{ date:"Feb 18",count:5 },{ date:"Feb 20",count:8 },{ date:"Feb 22",count:7 }];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [repos, setRepos] = useState([]);
  const [savedComparisonCount, setSavedComparisonCount] = useState(0);
  const [aiActionsRun, setAiActionsRun] = useState(0);
  const [documentsGenerated, setDocumentsGenerated] = useState(0);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([historyService.list(), historyService.listComparisons(), historyService.countAiActions(), historyService.countGeneratedDocuments()]).then(([items, comparisons, actionCount, documentCount]) => {
      if (active) {
        setRepos(items);
        setSavedComparisonCount(comparisons.length);
        setAiActionsRun(actionCount);
        setDocumentsGenerated(documentCount);
      }
    }).catch((e) => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const analyze = (event) => {
    event.preventDefault();
    if (!url.trim()) { toast.error("Paste a GitHub repository URL first"); return; }
    navigate(`/analyze?url=${encodeURIComponent(url.trim())}`);
  };
  const languages = Object.entries(repos.reduce((acc, repo) => { acc[repo.language] = (acc[repo.language] || 0) + 1; return acc; }, {})).map(([name,value]) => ({ name,value }));
  const scoredRepos = repos.filter((repo) => Number.isFinite(repo.healthReport?.overallScore));
  const averageHealth = scoredRepos.length
    ? Math.round(scoredRepos.reduce((sum, repo) => sum + repo.healthReport.overallScore, 0) / scoredRepos.length)
    : null;
  const securityScannedRepos = repos.filter((repo) => repo.securityReport);
  const securityAlerts = securityScannedRepos.reduce((sum, repo) => sum + (repo.securityReport.summary?.critical || 0) + (repo.securityReport.summary?.high || 0), 0);
  return <div><div className="page-heading"><div><h1>Good morning, {user?.name?.split(" ")[0] || "there"} <span className="text-xl">✦</span></h1><p>Here’s what’s happening across your repository workspace.</p></div><Link to="/analyze" className="btn btn-primary"><Plus size={15} /> New analysis</Link></div>
    <form className="repo-entry" onSubmit={analyze}><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a public GitHub repository URL to get started..." aria-label="Repository URL" /><Button type="submit"><Search size={15} />Analyze</Button></form>
    <div className="stat-grid dashboard-stat-grid">{[{label:"Total analyses",value:loading?"—":repos.length,footnote:"Repositories explored",icon:Activity},{label:"Repos saved",value:loading?"—":repos.length,footnote:"In your workspace",icon:GitFork},{label:"READMEs generated",value:loading?"—":Math.max(0,repos.length-1),footnote:"Drafts created",icon:FileText},{label:"Documents generated",value:loading?"—":documentsGenerated,footnote:"Saved in Documentation Studio",icon:FileText},{label:"Top language",value:loading?"—":languages[0]?.name||"—",footnote:"Across analyzed repos",icon:CodeIcon},{label:"Average health",value:loading?"—":averageHealth===null?"—":`${averageHealth}/100`,footnote:loading?"":`Across ${scoredRepos.length} scanned analyses`,icon:HeartPulse},{label:"Security alerts",value:loading?"—":securityAlerts,footnote:loading?"":`Critical/high across ${securityScannedRepos.length} scans`,icon:ShieldAlert},{label:"Saved comparisons",value:loading?"—":savedComparisonCount,footnote:"Pairwise reports in history",icon:GitCompare},{label:"AI actions run",value:loading?"—":aiActionsRun,footnote:"Saved file results",icon:Sparkles}].map((stat) => <StatCard key={stat.label} {...stat}/>)}</div>
    {loading ? <div className="card p-6"><Skeleton className="mb-5 w-1/3" /><Skeleton className="mb-3 w-full" /><Skeleton className="w-full" /></div> : error ? <ErrorState message={error} onRetry={() => window.location.reload()} /> : repos.length === 0 ? <div className="card"><EmptyState icon={Sparkles} title="Your workspace is ready" description="Analyze a public GitHub repository to see language trends, quality signals, and recent activity." action={<Button onClick={() => navigate("/analyze")}>Start your first analysis</Button>} /></div> : <>
      <div className="two-col mb-4"><section className="card"><div className="card-header"><span className="card-title">Analysis activity</span><span className="text-[10px] text-muted">Last 2 weeks</span></div><div className="card-content"><div className="chart-box"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{top:8,right:8,left:-20,bottom:0}}><defs><linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="date" tick={{fill:"var(--muted)",fontSize:9}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"var(--muted)",fontSize:9}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,fontSize:10}}/><Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fill="url(#activityFill)"/></AreaChart></ResponsiveContainer></div></div></section>
        <section className="card"><div className="card-header"><span className="card-title">Language mix</span><span className="text-[10px] text-muted">By repository</span></div><div className="card-content flex items-center gap-2"><div className="chart-box max-w-[190px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={languages} dataKey="value" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={4}>{languages.map((entry,index)=><Cell key={entry.name} fill={COLORS[index%COLORS.length]}/>)}</Pie><Tooltip contentStyle={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,fontSize:10}}/></PieChart></ResponsiveContainer></div><div className="grid gap-3">{languages.map((item,index)=><div className="flex items-center gap-2 text-[10px]" key={item.name}><i className="h-2 w-2 rounded-full" style={{background:COLORS[index%COLORS.length]}}/><span>{item.name}</span><span className="text-muted">{item.value}</span></div>)}</div></div></section></div>
      <section className="card"><div className="card-header"><span className="card-title">Recent analyses</span><Link to="/history" className="inline-flex items-center gap-1 text-[10px] text-violet-400">View history <ArrowRight size={12}/></Link></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Repository</th><th>Language</th><th>Analyzed</th><th>Status</th><th></th></tr></thead><tbody>{repos.slice(0,4).map(repo=><tr key={repo.id}><td><Link to={`/analysis/${repo.id}`} className="repo-link"><span className="repo-icon"><GithubIcon/></span>{repo.fullName}</Link></td><td>{repo.language}</td><td className="text-muted"><Clock3 size={12} className="mr-1 inline"/>Recently</td><td><div className="flex flex-wrap gap-1.5"><span className="tag tag-success">Completed</span>{repo.securityReport&&<span className={`tag ${repo.securityReport.riskLevel==="critical"||repo.securityReport.riskLevel==="high"?"tag-danger":repo.securityReport.riskLevel==="medium"?"tag-warning":"tag-success"}`} title={`Security safety score ${repo.securityReport.riskScore}/100`}><ShieldAlert size={11}/>Security {repo.securityReport.riskScore}</span>}</div></td><td><Link to={`/analysis/${repo.id}`} className="text-xs text-muted hover:text-violet-400">Open</Link></td></tr>)}</tbody></table></div></section>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">{[{title:"Analyze a repository",text:"Explore a new public codebase.",icon:Sparkles,to:"/analyze"},{title:"Browse your history",text:"Pick up where you left off.",icon:Clock3,to:"/history"},{title:"Generate a README",text:"Create a documentation draft.",icon:FileText,to:`/analysis/${repos[0].id}/readme`}].map(({title,text,icon:Icon,to})=><Link className="feature-card !p-4" to={to} key={title}><div className="flex items-center gap-3"><span className="feature-icon !h-8 !w-8"><Icon size={15}/></span><div><h3 className="!my-0">{title}</h3><p className="mt-1">{text}</p></div><ArrowRight size={14} className="ml-auto text-muted"/></div></Link>)}</div>
    </>}
  </div>;
}
function CodeIcon(props) { return <BarChart3 {...props} />; }
function GithubIcon() { return <GitFork size={14}/>; }
