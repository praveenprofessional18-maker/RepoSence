import { ExternalLink, FileCode2, Folder, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../common";

function formatSize(bytes) {
  if (!bytes) return "Unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NodeDetailsPanel({ node, graphData, repository, analysisId, onClose }) {
  const navigate = useNavigate();
  if (!node) return null;

  const isFile = node.kind !== "folder";
  const path = node.path || "";
  const imports = graphData.edges.filter((edge) => edge.source === path);
  const importedBy = graphData.edges.filter((edge) => edge.target === path);
  const nodeByPath = new Map(graphData.nodes.map((item) => [item.path, item]));
  const externalPackages = graphData.externalPackages.filter((item) => item.usedBy.includes(path));
  const githubUrl = repository.url
    ? `${repository.url.replace(/\/$/, "")}/blob/${(repository.branch || "main").split("/").map(encodeURIComponent).join("/")}/${path.split("/").map(encodeURIComponent).join("/")}`
    : "";
  const openInStructure = () => navigate(`/analysis/${analysisId}?file=${encodeURIComponent(path)}`);

  return <aside className="fixed inset-x-0 bottom-0 z-20 max-h-[55vh] overflow-y-auto rounded-t-2xl border border-line bg-panel p-4 shadow-2xl lg:static lg:max-h-[600px] lg:rounded-xl" aria-label="Selected graph node details">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        {isFile ? <FileCode2 size={16} className="mt-0.5 shrink-0 text-violet-400"/> : <Folder size={16} className="mt-0.5 shrink-0 text-amber-400"/>}
        <div className="min-w-0">
          <h3 className="m-0 truncate text-xs font-semibold">{node.label || path || repository.fullName}</h3>
          <p className="mb-0 mt-1 break-all font-mono text-[9px] leading-5 text-muted">{path || repository.fullName}</p>
        </div>
      </div>
      <button className="icon-btn !h-7 !w-7" onClick={onClose} aria-label="Close node details"><X size={14}/></button>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-lg border border-line bg-panel2 p-3"><span className="text-[9px] text-muted">Size</span><strong className="mt-1 block text-[11px]">{isFile ? formatSize(node.size) : `${node.fileCount || 0} files`}</strong></div>
      <div className="rounded-lg border border-line bg-panel2 p-3"><span className="text-[9px] text-muted">Type</span><strong className="mt-1 block text-[11px] uppercase">{isFile ? node.type || "file" : "folder"}</strong></div>
      {isFile && <>
        <div className="rounded-lg border border-line bg-panel2 p-3"><span className="text-[9px] text-muted">Imports</span><strong className="mt-1 block text-[11px]">{node.importsCount ?? imports.length}</strong></div>
        <div className="rounded-lg border border-line bg-panel2 p-3"><span className="text-[9px] text-muted">Imported by</span><strong className="mt-1 block text-[11px]">{node.importedByCount ?? importedBy.length}</strong></div>
      </>}
    </div>
    {isFile && <div className="mt-4 grid gap-4">
      <section>
        <h4 className="mb-2 text-[10px] font-semibold">Imports ({imports.length})</h4>
        {imports.length ? <ul className="m-0 grid gap-1 pl-4 text-[9px] text-muted">{imports.map((edge) => <li key={edge.id}>{nodeByPath.get(edge.target)?.path || edge.target}</li>)}</ul> : <p className="m-0 text-[9px] text-muted">No internal imports found.</p>}
      </section>
      <section>
        <h4 className="mb-2 text-[10px] font-semibold">Imported by ({importedBy.length})</h4>
        {importedBy.length ? <ul className="m-0 grid gap-1 pl-4 text-[9px] text-muted">{importedBy.map((edge) => <li key={edge.id}>{nodeByPath.get(edge.source)?.path || edge.source}</li>)}</ul> : <p className="m-0 text-[9px] text-muted">No files import this module.</p>}
      </section>
      <section>
        <h4 className="mb-2 text-[10px] font-semibold">External packages ({externalPackages.length})</h4>
        {externalPackages.length ? <div className="flex flex-wrap gap-1.5">{externalPackages.map((item) => <span className="tag" key={item.name}>{item.name}</span>)}</div> : <p className="m-0 text-[9px] text-muted">No external packages found.</p>}
      </section>
    </div>}
    <div className="mt-5 grid gap-2">
      <Button onClick={openInStructure} disabled={!isFile}><FileCode2 size={13}/>Open in Structure tab</Button>
      {isFile && githubUrl && <a className="btn btn-secondary btn-sm" href={githubUrl} target="_blank" rel="noreferrer"><ExternalLink size={13}/>Open on GitHub</a>}
    </div>
  </aside>;
}
