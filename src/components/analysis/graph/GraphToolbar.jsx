import { Download, FileJson, Maximize, RotateCcw } from "lucide-react";
import { Button, SearchInput } from "../../common";

export default function GraphToolbar({
  mode,
  onModeChange,
  colorBy,
  onColorByChange,
  search,
  onSearchChange,
  fileType,
  onFileTypeChange,
  hideIsolated,
  onHideIsolatedChange,
  dependencyOnly,
  onDependencyOnlyChange,
  direction,
  onDirectionChange,
  onReset,
  onExportPng,
  onExportJson,
  onToggleFullscreen
}) {
  return <div className="card mb-4 p-3">
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-lg border border-line bg-panel2 p-1" role="group" aria-label="Graph view">
        {["import", "folder"].map((item) => <button
          key={item}
          type="button"
          className={`rounded-md px-3 py-1.5 text-[10px] font-medium capitalize transition-colors ${mode === item ? "bg-panel text-main shadow-sm" : "text-muted hover:text-main"}`}
          aria-pressed={mode === item}
          onClick={() => onModeChange(item)}
        >
          {item === "import" ? "Import view" : "Folder view"}
        </button>)}
      </div>
      <div className="min-w-[190px] flex-1">
        <SearchInput value={search} onChange={onSearchChange} placeholder="Search graph nodes..." />
      </div>
      <label className="flex items-center gap-2 text-[10px] text-muted">
        File type
        <select className="select" value={fileType} onChange={(event) => onFileTypeChange(event.target.value)} aria-label="Filter by file type">
          <option value="">All</option>
          {["js", "jsx", "ts", "tsx", "vue", "css", "json"].map((type) => <option value={type} key={type}>{type.toUpperCase()}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2 text-[10px] text-muted">
        <input type="checkbox" className="accent-violet-500" checked={hideIsolated} onChange={(event) => onHideIsolatedChange(event.target.checked)} />
        Hide isolated files
      </label>
      <label className="flex items-center gap-2 text-[10px] text-muted">
        <input type="checkbox" className="accent-violet-500" checked={dependencyOnly} onChange={(event) => onDependencyOnlyChange(event.target.checked)} />
        Only selected dependencies
      </label>
      <label className="flex items-center gap-2 text-[10px] text-muted">
        Direction
        <select className="select" value={direction} onChange={(event) => onDirectionChange(event.target.value)} aria-label="Layout direction">
          <option value="TB">Top to bottom</option>
          <option value="LR">Left to right</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-[10px] text-muted">
        Color by
        <select className="select" value={colorBy} onChange={(event) => onColorByChange(event.target.value)} aria-label="Color graph nodes by">
          <option value="folder">Folder</option>
          <option value="type">File type</option>
        </select>
      </label>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
      <Button variant="secondary" size="sm" onClick={onReset} aria-label="Reset graph view"><RotateCcw size={13}/>Reset view</Button>
      <Button variant="secondary" size="sm" onClick={onToggleFullscreen} aria-label="Toggle graph fullscreen"><Maximize size={13}/>Fullscreen</Button>
      <Button variant="secondary" size="sm" onClick={onExportPng} aria-label="Export graph as PNG"><Download size={13}/>PNG</Button>
      <Button variant="secondary" size="sm" onClick={onExportJson} aria-label="Export graph data as JSON"><FileJson size={13}/>JSON</Button>
    </div>
  </div>;
}
