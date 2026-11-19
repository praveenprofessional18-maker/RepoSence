import { Handle, Position } from "reactflow";
import { Braces, Code2, File, FileJson, FileText } from "lucide-react";

const icons = {
  js: Code2,
  jsx: Braces,
  ts: Code2,
  tsx: Braces,
  json: FileJson,
  vue: FileText
};

export default function FileNode({ data, selected }) {
  const Icon = icons[data.fileType] || File;
  const targetPosition = data.direction === "LR" ? Position.Left : Position.Top;
  const sourcePosition = data.direction === "LR" ? Position.Right : Position.Bottom;
  return <div
    className={`min-w-[190px] rounded-lg border bg-panel p-3 shadow-lg transition-opacity ${selected || data.match ? "ring-2 ring-violet-500" : ""} ${data.dimmed ? "opacity-25" : "opacity-100"}`}
    style={{ borderColor: data.color }}
    title={data.path}
  >
    <Handle type="target" position={targetPosition} className="!h-2 !w-2 !border-0 !bg-violet-400"/>
    <div className="flex items-start gap-2">
      <Icon size={15} className="mt-0.5 shrink-0" style={{ color: data.color }}/>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] font-semibold">{data.label}</div>
        <div className="mt-1 truncate font-mono text-[9px] text-muted">{data.folder || "repository root"}</div>
      </div>
      <span className="rounded border border-line bg-panel2 px-1.5 py-0.5 text-[8px] uppercase text-muted">{data.fileType || "file"}</span>
    </div>
    <div className="mt-2 flex gap-1.5">
      <span className="tag !px-1.5 !py-0.5">↑ {data.importedByCount || 0}</span>
      <span className="tag !px-1.5 !py-0.5">↓ {data.importsCount || 0}</span>
    </div>
    <Handle type="source" position={sourcePosition} className="!h-2 !w-2 !border-0 !bg-indigo-400"/>
  </div>;
}
