import { Handle, Position } from "reactflow";
import { Folder, FolderTree } from "lucide-react";

export default function FolderNode({ data, selected }) {
  const Icon = data.root ? FolderTree : Folder;
  const targetPosition = data.direction === "LR" ? Position.Left : Position.Top;
  const sourcePosition = data.direction === "LR" ? Position.Right : Position.Bottom;
  return <div
    className={`min-w-[190px] rounded-lg border bg-panel p-3 shadow-lg transition-opacity ${selected || data.match ? "ring-2 ring-violet-500" : ""} ${data.dimmed ? "opacity-25" : "opacity-100"}`}
    style={{ borderColor: data.color }}
    title={data.path || data.label}
  >
    <Handle type="target" position={targetPosition} className="!h-2 !w-2 !border-0 !bg-violet-400"/>
    <div className="flex items-center gap-2">
      <Icon size={16} className="shrink-0" style={{ color: data.color }}/>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] font-semibold">{data.label}</div>
        <div className="mt-1 text-[9px] text-muted">{data.fileCount || 0} files · {data.folderCount || 0} folders</div>
      </div>
    </div>
    <Handle type="source" position={sourcePosition} className="!h-2 !w-2 !border-0 !bg-indigo-400"/>
  </div>;
}
