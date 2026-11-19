import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import toast from "react-hot-toast";
import { Button, EmptyState, Skeleton } from "../../common";
import { repoService } from "../../../services/repoService";
import GraphCanvas from "./GraphCanvas";
import GraphLegend from "./GraphLegend";
import GraphToolbar from "./GraphToolbar";
import NodeDetailsPanel from "./NodeDetailsPanel";

const folderPalette = ["#8b5cf6", "#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#14b8a6", "#06b6d4"];
const fileTypeColors = { js: "#f0c419", jsx: "#61dafb", ts: "#3178c6", tsx: "#527fff", vue: "#42b883", css: "#8b5cf6", json: "#e5a84b", file: "#71717a" };

function flattenTree(nodes, base = "", result = []) {
  for (const node of nodes || []) {
    const path = node.path || (base ? `${base}/${node.name}` : node.name);
    if (node.type === "folder") flattenTree(node.children, path, result);
    else result.push({ ...node, path });
  }
  return result;
}

function getFileType(path) {
  const extension = path.split(".").pop()?.toLowerCase();
  return fileTypeColors[extension] ? extension : "file";
}

function countDescendants(node) {
  return (node.children || []).reduce((counts, child) => {
    if (child.type === "folder") {
      const nested = countDescendants(child);
      counts.files += nested.files;
      counts.folders += nested.folders + 1;
    } else {
      counts.files += 1;
    }
    return counts;
  }, { files: 0, folders: 0 });
}

function countTreeNodes(nodes) {
  return (nodes || []).reduce((count, node) => count + 1 + (node.type === "folder" ? countTreeNodes(node.children) : 0), 0);
}

function createFolderGraph(tree, repository, collapsed) {
  const nodes = [];
  const edges = [];
  const rootId = `folder-root:${repository.id}`;
  const allItems = [];
  const visit = (items, parentPath = "") => {
    for (const item of items || []) {
      const path = item.path || (parentPath ? `${parentPath}/${item.name}` : item.name);
      allItems.push({ ...item, path });
      if (item.type === "folder") visit(item.children, path);
    }
  };
  visit(tree);

  const fileCount = allItems.filter((item) => item.type !== "folder").length;
  const folderCount = allItems.filter((item) => item.type === "folder").length;
  nodes.push({
    id: rootId,
    type: "folderNode",
    position: { x: 0, y: 0 },
    data: { kind: "folder", root: true, label: repository.fullName, path: "", folder: "", fileCount, folderCount, color: "#8b5cf6" }
  });

  const addItem = (item, parentId, depth, parentPath = "") => {
    const isFolder = item.type === "folder";
    const path = item.path || (parentPath ? `${parentPath}/${item.name}` : item.name);
    const counts = isFolder ? countDescendants(item) : { files: 0, folders: 0 };
    const nodeId = `${isFolder ? "folder" : "file"}:${path}`;
    nodes.push({
      id: nodeId,
      type: isFolder ? "folderNode" : "fileNode",
      position: { x: 0, y: 0 },
      data: {
        kind: isFolder ? "folder" : "file",
        label: item.name,
        path,
        folder: path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "",
        fileType: isFolder ? "folder" : getFileType(path),
        type: isFolder ? "folder" : getFileType(path),
        size: item.size || 0,
        fileCount: counts.files,
        folderCount: counts.folders,
        depth
      }
    });
    edges.push({ id: `${parentId}->${nodeId}`, source: parentId, target: nodeId });
    if (isFolder && !collapsed) {
      for (const child of item.children || []) addItem(child, nodeId, depth + 1, path);
    }
  };

  for (const item of tree || []) addItem(item, rootId, 0);
  return { nodes, edges, collapsed, fileCount, folderCount };
}

function getTopFolder(path) {
  return path.split("/")[0] || "(root)";
}

function hashColor(value) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return folderPalette[hash % folderPalette.length];
}

function getNodeColor(node, colorBy) {
  if (colorBy === "type") return fileTypeColors[node.type] || (node.type === "folder" ? "#d97706" : fileTypeColors.file);
  return hashColor(getTopFolder(node.path || node.folder || ""));
}

function findCycles(graphData) {
  const adjacency = new Map(graphData.nodes.map((node) => [node.path, []]));
  for (const edge of graphData.edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    adjacency.get(edge.source).push(edge.target);
  }
  const states = new Map();
  const stack = [];
  const cycles = [];
  const signatures = new Set();
  const visit = (path) => {
    states.set(path, 1);
    stack.push(path);
    for (const target of adjacency.get(path) || []) {
      if (states.get(target) === 1) {
        const index = stack.lastIndexOf(target);
        if (index >= 0) {
          const cycle = [...stack.slice(index), target];
          const body = cycle.slice(0, -1);
          const smallestIndex = body.reduce((best, item, current) => item < body[best] ? current : best, 0);
          const signature = [...body.slice(smallestIndex), ...body.slice(0, smallestIndex)].join("->");
          if (!signatures.has(signature)) {
            signatures.add(signature);
            cycles.push(cycle);
          }
        }
      } else if (!states.has(target)) {
        visit(target);
      }
    }
    stack.pop();
    states.set(path, 2);
  };
  for (const node of graphData.nodes) {
    if (!states.has(node.path)) visit(node.path);
  }
  return cycles;
}

function getDependencyPaths(edges, selectedPath) {
  const outgoing = new Map();
  const incoming = new Map();
  for (const edge of edges) {
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
    if (!incoming.has(edge.target)) incoming.set(edge.target, []);
    outgoing.get(edge.source).push(edge.target);
    incoming.get(edge.target).push(edge.source);
  }
  const paths = new Set([selectedPath]);
  const walk = (start, adjacency) => {
    const queue = [start];
    while (queue.length) {
      for (const next of adjacency.get(queue.pop()) || []) {
        if (!paths.has(next)) {
          paths.add(next);
          queue.push(next);
        }
      }
    }
  };
  walk(selectedPath, outgoing);
  walk(selectedPath, incoming);
  return paths;
}

function GraphInsights({ graphData }) {
  const nodes = graphData.nodes || [];
  const edges = graphData.edges || [];
  const mostImported = [...nodes].sort((a, b) => b.importedByCount - a.importedByCount).filter((node) => node.importedByCount > 0).slice(0, 5);
  const mostImports = [...nodes].sort((a, b) => b.importsCount - a.importsCount).filter((node) => node.importsCount > 0).slice(0, 5);
  const orphanCount = nodes.filter((node) => !node.importsCount && !node.importedByCount).length;
  const topPackages = [...(graphData.externalPackages || [])]
    .map((item) => ({ name: item.name, users: item.usedBy.length }))
    .sort((a, b) => b.users - a.users)
    .slice(0, 10);
  const topList = (items, metric) => items.length
    ? <ol className="m-0 grid gap-1.5 pl-4 text-[9px] text-muted">{items.map((node) => <li className="truncate" key={node.path} title={node.path}>{node.path}<strong className="ml-1 text-main">{metric(node)}</strong></li>)}</ol>
    : <p className="m-0 text-[9px] text-muted">No import relationships.</p>;

  return <section className="card mb-4">
    <div className="card-header"><span className="card-title">Graph insights</span><span className="tag">{graphData.sourceCount || nodes.length} source files</span></div>
    <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
      {[
        ["Total files", graphData.sourceCount ?? nodes.length],
        ["Import edges", edges.length],
        ["Orphan files", orphanCount],
        ["External packages", graphData.externalPackages?.length || 0]
      ].map(([label, value]) => <div className="rounded-lg border border-line bg-panel2 p-3" key={label}>
        <span className="text-[9px] text-muted">{label}</span><strong className="mt-1 block text-lg">{value}</strong>
      </div>)}
      <div className="rounded-lg border border-line bg-panel2 p-3">
        <h3 className="mb-2 mt-0 text-[10px] font-semibold">Most imported files</h3>
        {topList(mostImported, (node) => `· ${node.importedByCount} imports`)}
      </div>
      <div className="rounded-lg border border-line bg-panel2 p-3">
        <h3 className="mb-2 mt-0 text-[10px] font-semibold">Files with most imports</h3>
        {topList(mostImports, (node) => `· ${node.importsCount} imports`)}
      </div>
      <div className="rounded-lg border border-line bg-panel2 p-3">
        <h3 className="mb-1 mt-0 text-[10px] font-semibold">External packages · top 10</h3>
        {topPackages.length ? <div className="h-[110px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topPackages} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 2 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false}/>
              <XAxis type="number" hide allowDecimals={false}/>
              <YAxis type="category" dataKey="name" width={80} tick={{ fill: "var(--muted)", fontSize: 8 }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 9 }}/>
              <Bar dataKey="users" name="Files using package" fill="#8b5cf6" radius={[0, 4, 4, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div> : <p className="m-0 text-[9px] text-muted">No external packages detected.</p>}
      </div>
    </div>
  </section>;
}

export default function GraphTab({ analysisId, repository }) {
  const location = useLocation();
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [retry, setRetry] = useState(0);
  const [mode, setMode] = useState("import");
  const [colorBy, setColorBy] = useState("folder");
  const [search, setSearch] = useState("");
  const [fileType, setFileType] = useState("");
  const [hideIsolated, setHideIsolated] = useState(false);
  const [dependencyOnly, setDependencyOnly] = useState(false);
  const [direction, setDirection] = useState("TB");
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [focusPath, setFocusPath] = useState("");
  const containerRef = useRef(null);
  const controlsRef = useRef(null);
  const focusQuery = new URLSearchParams(location.search).get("focus") || "";

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setProgress({ completed: 0, total: 0 });
    repoService.getGraphData(analysisId, (nextProgress) => {
      if (active) setProgress(nextProgress);
    }).then((result) => {
      if (!active) return;
      setGraphData(result);
      if (result.noSourceFiles || result.nodes.length > 150) setMode("folder");
      else setMode("import");
    }).catch((loadError) => {
      if (active) setError(loadError.message || "Could not load repository graph data.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [analysisId, retry]);

  const treeNodeCount = useMemo(() => countTreeNodes(repository.tree || []), [repository.tree]);
  const collapseFolderGraph = treeNodeCount > 150;
  const folderGraph = useMemo(() => createFolderGraph(repository.tree || [], repository, collapseFolderGraph), [repository.id, repository.fullName, repository.tree, collapseFolderGraph]);
  const cycles = useMemo(() => graphData ? findCycles(graphData) : [], [graphData]);
  const focusRequestedNode = useMemo(() => graphData?.nodes.find((node) => node.path === focusQuery), [graphData, focusQuery]);

  useEffect(() => {
    if (!focusRequestedNode) return;
    setMode("import");
    setSelectedNodeId(focusRequestedNode.path);
    setFocusPath(focusRequestedNode.path);
  }, [focusRequestedNode]);

  const onControlsReady = useCallback((controls) => { controlsRef.current = controls; }, []);
  const selectNode = useCallback((node) => setSelectedNodeId(node.id), []);
  const onModeChange = (nextMode) => {
    setMode(nextMode);
    setSelectedNodeId(null);
    setDependencyOnly(false);
  };

  const modeGraph = useMemo(() => {
    if (mode === "folder") return folderGraph;
    return { nodes: (graphData?.nodes || []).map((node) => ({
      id: node.path,
      type: "fileNode",
      position: { x: 0, y: 0 },
      data: {
        kind: "file",
        label: node.path.split("/").pop(),
        path: node.path,
        folder: node.folder,
        fileType: node.type,
        type: node.type,
        size: node.size,
        importsCount: node.importsCount,
        importedByCount: node.importedByCount
      }
    })), edges: (graphData?.edges || []).map((edge) => ({ ...edge, data: { cycle: false } })) };
  }, [mode, folderGraph, graphData]);

  const dependencyPaths = useMemo(() => mode === "import" && dependencyOnly && selectedNodeId
    ? getDependencyPaths(graphData?.edges || [], selectedNodeId)
    : null, [mode, dependencyOnly, selectedNodeId, graphData?.edges]);

  const visibleGraph = useMemo(() => {
    const nodes = modeGraph.nodes.filter((node) => {
      if (fileType && node.data.kind === "file" && node.data.fileType !== fileType) return false;
      if (fileType && mode === "folder" && node.data.kind === "folder") {
        const containsType = folderGraph.nodes.some((candidate) =>
          candidate.data.kind === "file" &&
          candidate.data.fileType === fileType &&
          candidate.data.path.startsWith(`${node.data.path}/`)
        );
        if (!node.data.root && !containsType) return false;
      }
      if (hideIsolated && mode === "import" && node.data.kind === "file") {
        const connected = (graphData?.edges || []).some((edge) => edge.source === node.id || edge.target === node.id);
        if (!connected) return false;
      }
      if (dependencyPaths && !dependencyPaths.has(node.id.replace(/^file:/, ""))) return false;
      return true;
    });
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = modeGraph.edges
      .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
      .map((edge) => {
        const isCircular = cycles.some((cycle) => {
          for (let index = 0; index < cycle.length - 1; index += 1) {
            if (cycle[index] === edge.source && cycle[index + 1] === edge.target) return true;
          }
          return false;
        });
        return { ...edge, data: { ...edge.data, cycle: isCircular } };
      });
    const query = search.trim().toLowerCase();
    const decoratedNodes = nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        color: getNodeColor({
          path: node.data.path,
          folder: node.data.folder,
          type: node.data.kind === "folder" ? "folder" : node.data.fileType
        }, colorBy),
        match: Boolean(query && `${node.data.label} ${node.data.path || ""}`.toLowerCase().includes(query)),
        dimmed: Boolean(query && !`${node.data.label} ${node.data.path || ""}`.toLowerCase().includes(query))
      }
    }));
    return { nodes: decoratedNodes, edges };
  }, [modeGraph, mode, fileType, folderGraph.nodes, hideIsolated, graphData?.edges, dependencyPaths, cycles, search, colorBy]);

  const currentNode = useMemo(() => visibleGraph.nodes.find((node) => node.id === selectedNodeId)?.data ||
    (mode === "import" ? graphData?.nodes.find((node) => node.path === selectedNodeId) : null), [visibleGraph.nodes, selectedNodeId, mode, graphData]);
  const legendColors = useMemo(() => {
    if (colorBy === "type") {
      const types = [...new Set(visibleGraph.nodes.filter((node) => node.data.kind === "file").map((node) => node.data.fileType))];
      return types.slice(0, 6).map((type) => ({ label: type.toUpperCase(), color: fileTypeColors[type] || fileTypeColors.file }));
    }
    const folders = [...new Set(visibleGraph.nodes.map((node) => getTopFolder(node.data.path || node.data.folder || "")))];
    return folders.slice(0, 6).map((folder) => ({ label: folder, color: hashColor(folder) }));
  }, [colorBy, visibleGraph.nodes]);

  const retryGraph = () => setRetry((value) => value + 1);
  const resetView = () => controlsRef.current?.fitView();
  const exportJson = () => {
    const content = JSON.stringify({ analysisId, repository: repository.fullName, mode, graph: graphData }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${repository.name}-graph.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    toast.success("Graph data downloaded as JSON");
  };
  const exportPng = async () => {
    if (!containerRef.current) return;
    try {
      const { toPng } = await import("html-to-image");
      const backgroundColor = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#09090b";
      const dataUrl = await toPng(containerRef.current, { cacheBust: true, backgroundColor, pixelRatio: 2 });
      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = `${repository.name}-graph.png`;
      anchor.click();
      toast.success("Graph exported as PNG");
    } catch (exportError) {
      toast.error(exportError.message || "Could not export the graph as PNG.");
    }
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await containerRef.current?.requestFullscreen();
    } catch (fullscreenError) {
      toast.error(fullscreenError.message || "Fullscreen mode is not available.");
    }
  };
  const focusCycle = (cycle) => {
    setMode("import");
    setSelectedNodeId(cycle[0]);
    setFocusPath(cycle[0]);
  };

  if (loading) return <div className="grid gap-4">
    <Skeleton className="h-28 w-full"/>
    <Skeleton className="h-20 w-full"/>
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]"><Skeleton className="h-[520px] w-full"/><Skeleton className="h-[520px] w-full"/></div>
    {progress.total > 0 && <div className="card p-4" role="status">
      <div className="mb-2 flex justify-between text-[10px] text-muted"><span>Parsing {progress.completed} / {progress.total} files...</span><span>{Math.round((progress.completed / progress.total) * 100)}%</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-panel2"><div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${(progress.completed / progress.total) * 100}%` }}/></div>
    </div>}
  </div>;

  if (error) return <div className="card p-5">
    <EmptyState title="Could not load the dependency graph" description={error} action={<Button onClick={retryGraph}>Retry</Button>}/>
  </div>;

  if (!graphData) return <EmptyState title="Graph data is unavailable" description="Try reloading the saved analysis." action={<Button onClick={retryGraph}>Retry</Button>}/>;

  const fileCount = flattenTree(repository.tree || []).length;
  const nodeCount = visibleGraph.nodes.length;
  const selectedNodeForDetails = currentNode
    ? {
      ...currentNode,
      path: currentNode.path || "",
      label: currentNode.label || currentNode.path?.split("/").pop() || repository.fullName,
      kind: currentNode.kind || (currentNode.type === "folder" ? "folder" : "file")
    }
    : null;

  return <div>
    <GraphInsights graphData={graphData}/>
    {graphData.noSourceFiles && <div className="card mb-4">
      <EmptyState title="No JavaScript or TypeScript source files found" description="Import graph supports JavaScript / TypeScript projects for now. Folder view is selected so you can still explore this repository."/>
    </div>}
    {treeNodeCount > 150 && <div className="mb-4 rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 text-[10px] text-violet-300" role="status">
      This repository has {treeNodeCount} files and folders. Folder view is collapsed by directory for performance; the canvas renders only visible elements.
    </div>}
    {mode === "import" && !graphData.nodes.length && <div className="card mb-4">
      <EmptyState title="No importable source files" description="No JavaScript / TypeScript imports are available in the saved analysis. Switch to Folder view to browse the repository." action={<Button onClick={() => onModeChange("folder")}>Open Folder view</Button>}/>
    </div>}
    {cycles.length > 0 && <section className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
      <div className="mb-2 text-[11px] font-semibold text-rose-400">{cycles.length} circular dependencies found</div>
      <div className="flex flex-wrap gap-2">
        {cycles.map((cycle, index) => <button key={`${cycle.join("|")}-${index}`} className="rounded-md border border-rose-500/30 px-2 py-1 text-left font-mono text-[9px] text-muted hover:text-main" onClick={() => focusCycle(cycle)}>
          {cycle.join(" → ")}
        </button>)}
      </div>
    </section>}
    <GraphToolbar
      mode={mode}
      onModeChange={onModeChange}
      colorBy={colorBy}
      onColorByChange={setColorBy}
      search={search}
      onSearchChange={setSearch}
      fileType={fileType}
      onFileTypeChange={setFileType}
      hideIsolated={hideIsolated}
      onHideIsolatedChange={setHideIsolated}
      dependencyOnly={dependencyOnly}
      onDependencyOnlyChange={setDependencyOnly}
      direction={direction}
      onDirectionChange={setDirection}
      onReset={resetView}
      onExportPng={exportPng}
      onExportJson={exportJson}
      onToggleFullscreen={toggleFullscreen}
    />
    <div className={`grid gap-4 ${selectedNodeForDetails ? "lg:grid-cols-[minmax(0,1fr)_300px]" : "grid-cols-1"}`}>
      <div className="graph-canvas-container min-w-0" ref={containerRef}>
        {nodeCount ? <GraphCanvas
          graphNodes={visibleGraph.nodes}
          graphEdges={visibleGraph.edges}
          direction={direction}
          search={search}
          focusPath={focusPath}
          selectedNodeId={selectedNodeId}
          dependencyOnly={dependencyOnly && mode === "import"}
          onlyRenderVisibleElements={treeNodeCount > 150}
          onNodeSelect={selectNode}
          onControlsReady={onControlsReady}
        /> : <div className="card grid h-[420px] place-items-center text-center text-xs text-muted">
          <div><p className="mb-2">No graph nodes match the current filters.</p><Button variant="secondary" size="sm" onClick={() => { setFileType(""); setHideIsolated(false); setSearch(""); }}>Reset filters</Button></div>
        </div>}
      </div>
      {selectedNodeForDetails && <NodeDetailsPanel
        node={selectedNodeForDetails}
        graphData={graphData}
        repository={repository}
        analysisId={analysisId}
        onClose={() => setSelectedNodeId(null)}
      />}
    </div>
    <div className="mt-3"><GraphLegend colorBy={colorBy} colors={legendColors}/></div>
    {mode === "folder" && <p className="mt-2 text-[9px] text-muted">{fileCount} files · {folderGraph.folderCount} folders in the repository tree.</p>}
  </div>;
}
