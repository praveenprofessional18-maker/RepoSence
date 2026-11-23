import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Grid2X2, List } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { historyService } from "../services/historyService";
import { ConfirmModal, EmptyState, ErrorState, SearchInput, Skeleton } from "../components/common";
import RepoCard from "../components/history/RepoCard";

export default function History() {
  const {user}=useAuth();
  const navigate=useNavigate();
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [query,setQuery]=useState("");
  const [language,setLanguage]=useState("All languages");
  const [range,setRange]=useState("Any time");
  const [sort,setSort]=useState("newest");
  const [view,setView]=useState("grid");
  const [page,setPage]=useState(1);
  const [pending,setPending]=useState(null);
  const [selectedIds,setSelectedIds]=useState([]);
  const pageSize=6;
  const load=()=>{setLoading(true);historyService.list().then(setItems).catch((e)=>setError(e.message)).finally(()=>setLoading(false));};
  useEffect(()=>{
    let active=true;
    setItems([]);
    setSelectedIds([]);
    setPage(1);
    setLoading(true);
    setError("");
    historyService.list().then((nextItems)=>{if(active)setItems(nextItems);}).catch((e)=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[user?.id]);
  const filtered=useMemo(()=>{
    const now=Date.now();
    const list=items.filter((repo)=>{
      const matchesName=repo.fullName.toLowerCase().includes(query.toLowerCase());
      const matchesLanguage=language==="All languages"||repo.language===language;
      const age=now-new Date(repo.analyzedAt).getTime();
      const matchesRange=range==="Any time"||(range==="Past week"&&age<=7*86400000)||(range==="Past month"&&age<=30*86400000);
      return matchesName&&matchesLanguage&&matchesRange;
    });
    return list.sort((a,b)=>sort==="name"?a.fullName.localeCompare(b.fullName):sort==="oldest"?new Date(a.analyzedAt)-new Date(b.analyzedAt):new Date(b.analyzedAt)-new Date(a.analyzedAt));
  },[items,query,language,range,sort]);
  const remove=async()=>{
    if(!pending)return;
    try { await historyService.remove(pending.id);setItems((current)=>current.filter((item)=>item.id!==pending.id));setSelectedIds((current)=>current.filter((id)=>id!==pending.id));toast.success("Analysis deleted");setPending(null); }
    catch(e){toast.error(e.message||"Unable to delete analysis");}
  };
  const toggleCompare=(id)=>{
    if(selectedIds.includes(id)){setSelectedIds((current)=>current.filter((item)=>item!==id));return;}
    if(selectedIds.length>=2){toast.error("Choose no more than two repositories to compare.");return;}
    setSelectedIds((current)=>[...current,id]);
  };
  const compareSelected=()=>{
    if(selectedIds.length!==2)return;
    navigate(`/compare?a=${encodeURIComponent(selectedIds[0])}&b=${encodeURIComponent(selectedIds[1])}`);
  };
  const languages=["All languages",...new Set(items.map((item)=>item.language))];
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize));
  const current=filtered.slice((page-1)*pageSize,page*pageSize);
  return <div><div className="page-heading"><div><h1>Analysis history</h1><p>Pick up where you left off across your repositories.</p></div><Link to="/analyze" className="btn btn-primary">New analysis</Link></div>
    <div className="mb-4 flex flex-wrap items-center gap-2"><div className="w-full sm:max-w-[260px]"><SearchInput value={query} onChange={(value)=>{setQuery(value);setPage(1);}} placeholder="Search repositories..."/></div><select className="select" value={language} onChange={(e)=>{setLanguage(e.target.value);setPage(1);}} aria-label="Filter by language">{languages.map((item)=><option key={item}>{item}</option>)}</select><select className="select" value={range} onChange={(e)=>{setRange(e.target.value);setPage(1);}} aria-label="Filter by date"><option>Any time</option><option>Past week</option><option>Past month</option></select><select className="select" value={sort} onChange={(e)=>setSort(e.target.value)} aria-label="Sort history"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A–Z</option></select><div className="ml-auto flex gap-1"><button className={`icon-btn ${view==="grid"?"text-violet-400":""}`} aria-label="Grid view" onClick={()=>setView("grid")}><Grid2X2 size={15}/></button><button className={`icon-btn ${view==="list"?"text-violet-400":""}`} aria-label="List view" onClick={()=>setView("list")}><List size={16}/></button></div></div>
    {loading?<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map((n)=><div className="card p-5" key={n}><Skeleton className="mb-4 w-1/2"/><Skeleton className="mb-3 w-full"/><Skeleton className="w-2/3"/></div>)}</div>:error?<ErrorState message={error} onRetry={load}/>:filtered.length===0?<div className="card"><EmptyState title={items.length?"No matching analyses":"No analyses yet"} description={items.length?"Try adjusting your search or filters.":"Analyze a public GitHub repository and it will appear here."} action={<Link to="/analyze" className="btn btn-primary">Analyze a repository</Link>}/></div>:<><div className={view==="grid"?"grid gap-3 sm:grid-cols-2 lg:grid-cols-3":"grid gap-2"}>{current.map((repo)=><RepoCard key={repo.id} repo={repo} view={view} selectedForCompare={selectedIds.includes(repo.id)} onToggleCompare={()=>toggleCompare(repo.id)} onDelete={()=>setPending(repo)}/>)}</div><div className="pagination"><button aria-label="Previous page" disabled={page===1} onClick={()=>setPage(page-1)}>‹</button>{Array.from({length:pages},(_,i)=><button key={i} className={page===i+1?"active":""} onClick={()=>setPage(i+1)}>{i+1}</button>)}<button aria-label="Next page" disabled={page===pages} onClick={()=>setPage(page+1)}>›</button></div><p className="text-center text-[10px] text-muted">Showing {current.length} of {filtered.length} analyses</p></>}
    <ConfirmModal open={!!pending} title="Delete this analysis?" description={`This will remove ${pending?.fullName || "this repository"} from your analysis history. This action cannot be undone.`} onCancel={()=>setPending(null)} onConfirm={remove}/>
    {selectedIds.length>0&&<div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-line bg-panel p-2.5 shadow-xl" role="region" aria-label="Repository comparison selection"><span className="pl-2 text-[10px] text-muted">{selectedIds.length} selected</span><button className="btn btn-primary btn-sm" onClick={compareSelected} disabled={selectedIds.length!==2} aria-label={`Compare selected (${selectedIds.length})`}>Compare selected ({selectedIds.length})</button><button className="btn btn-ghost btn-sm" onClick={()=>setSelectedIds([])}>Clear</button></div>}
  </div>;
}
