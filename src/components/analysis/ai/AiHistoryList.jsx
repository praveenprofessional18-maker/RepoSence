import { useState } from "react";
import { Clock3, Trash2 } from "lucide-react";
import { Button, ConfirmModal, EmptyState } from "../../common";
import { AI_ACTIONS } from "../../../utils/aiActions";

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown time" : date.toLocaleString();
}

export default function AiHistoryList({ items, loading, error, onOpen, onDelete, onClear }) {
  const [confirmClear, setConfirmClear] = useState(false);
  return <div className="grid gap-3">
    <div className="flex items-center justify-between gap-3">
      <div><h3 className="m-0 text-xs font-semibold">Recent file actions</h3><p className="mb-0 mt-1 text-[9px] text-muted">Saved results are scoped to this analysis.</p></div>
      <Button variant="secondary" size="sm" onClick={() => setConfirmClear(true)} disabled={loading || !items.length} aria-label="Clear all AI action history"><Trash2 size={12}/>Clear all</Button>
    </div>
    {loading ? <div className="grid gap-2"><div className="skeleton h-12 w-full"/><div className="skeleton h-12 w-4/5"/></div>
      : error ? <div className="rounded-lg border border-rose-500/30 p-3 text-[10px] text-rose-300" role="alert">{error}</div>
        : !items.length ? <EmptyState title="No AI actions yet" description="Generated results for this repository will appear here."/>
          : <ul className="m-0 grid list-none gap-2 p-0">
            {items.map((item) => {
              const action = AI_ACTIONS.find((entry) => entry.id === item.action) || AI_ACTIONS[0];
              return <li key={item.key} className="ai-history-item">
                <button type="button" onClick={() => onOpen(item)} className="min-w-0 flex-1 text-left" aria-label={`Open ${action.label} result for ${item.filePath}`}>
                  <strong className="block truncate text-[10px]">{action.label} · {item.filePath}</strong>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[9px] text-muted"><span>{item.level}</span><span>{item.language}</span><span><Clock3 size={10} className="mr-1 inline"/>{formatTime(item.createdAt || item.updatedAt)}</span></span>
                </button>
                <button type="button" className="icon-btn !h-7 !w-7 text-rose-400" onClick={() => onDelete(item.key)} aria-label={`Delete ${action.label} history for ${item.filePath}`}><Trash2 size={12}/></button>
              </li>;
            })}
          </ul>}
    <ConfirmModal open={confirmClear} title="Clear AI action history?" description="This removes the saved AI results for this analysis from this browser." confirmText="Clear history" onCancel={() => setConfirmClear(false)} onConfirm={() => { onClear(); setConfirmClear(false); }}/>
  </div>;
}
