import { useMemo, useState } from "react";
import { Check, Edit3, GitCompare, History, Trash2, X } from "lucide-react";
import { Button, ConfirmModal, EmptyState } from "../common";
import { countWords } from "../../utils/docBuilder";
import { getDocType } from "../../utils/docTypes";
import DiffViewer from "./DiffViewer";

export default function VersionHistoryDrawer({ open, versions, onClose, onRestore, onRename, onDelete }) {
  const [selected, setSelected] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingId, setEditingId] = useState("");
  const [label, setLabel] = useState("");
  const [diffOpen, setDiffOpen] = useState(false);
  const sortedVersions = useMemo(() => [...versions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [versions]);
  const compared = selected.length === 2 ? selected.map((id) => sortedVersions.find((version) => version.id === id)).filter(Boolean) : [];

  if (!open) return null;
  return <div className="doc-drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="doc-version-drawer" role="dialog" aria-modal="true" aria-labelledby="doc-history-title">
      <header><div><h2 id="doc-history-title"><History size={16}/>Version history</h2><p>Generated and manually saved snapshots for this analysis.</p></div><button type="button" className="icon-btn" aria-label="Close version history" onClick={onClose}><X size={15}/></button></header>
      {sortedVersions.length === 0 ? <EmptyState title="No saved versions" description="Generate a document or save a version to start the history."/> : <>
        <div className="doc-version-list">{sortedVersions.map((version) => {
          const type = getDocType(version.type);
          const editing = editingId === version.id;
          return <article className="doc-version-card" key={version.id}>
            <label className="doc-version-select"><input type="checkbox" checked={selected.includes(version.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current.slice(-1), version.id] : current.filter((id) => id !== version.id))} aria-label={`Select ${version.label} for comparison`}/><span>{type.label}</span></label>
            {editing ? <div className="doc-version-rename"><input className="input" value={label} onChange={(event) => setLabel(event.target.value)} aria-label="Version name"/><button className="icon-btn" aria-label="Save version name" onClick={async () => { await onRename(version.id, label); setEditingId(""); }}><Check size={14}/></button></div> : <strong>{version.label}</strong>}
            <small>{new Date(version.createdAt).toLocaleString()} · {version.wordCount ?? countWords(version.content)} words</small>
            <div className="doc-version-actions">
              <Button size="sm" variant="secondary" onClick={() => onRestore(version)}>Restore</Button>
              <button type="button" className="icon-btn" aria-label={`Rename ${version.label}`} onClick={() => { setEditingId(version.id); setLabel(version.label); }}><Edit3 size={13}/></button>
              <button type="button" className="icon-btn text-rose-400" aria-label={`Delete ${version.label}`} onClick={() => setDeleteTarget(version)}><Trash2 size={13}/></button>
            </div>
          </article>;
        })}</div>
        {selected.length === 2 && <Button variant="secondary" size="sm" className="mt-3" onClick={() => setDiffOpen((value) => !value)}><GitCompare size={13}/>{diffOpen ? "Hide comparison" : "Compare selected versions"}</Button>}
        {diffOpen && compared.length === 2 && <DiffViewer before={compared[1].content} after={compared[0].content} beforeLabel={compared[1].label} afterLabel={compared[0].label}/>}
      </>}
    </aside>
    <ConfirmModal open={Boolean(deleteTarget)} title="Delete this document version?" description="This removes the saved snapshot from this analysis." confirmText="Delete version" onCancel={() => setDeleteTarget(null)} onConfirm={async () => { await onDelete(deleteTarget.id); setSelected((current) => current.filter((id) => id !== deleteTarget.id)); setDeleteTarget(null); }}/>
  </div>;
}
