import { X } from "lucide-react";
import { Button } from "../common";
import DiffViewer from "./DiffViewer";

export default function ExistingReadmeCompare({ open, onClose, existing, current, onStartFromExisting }) {
  if (!open) return null;
  return <div className="doc-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="doc-compare-modal" role="dialog" aria-modal="true" aria-labelledby="existing-readme-title">
      <header><div><h2 id="existing-readme-title">Compare with current README</h2><p>Review the saved repository README against this draft.</p></div><button type="button" className="icon-btn" aria-label="Close README comparison" onClick={onClose}><X size={15}/></button></header>
      <DiffViewer before={existing} after={current} beforeLabel="Current repository README" afterLabel="Studio draft"/>
      <div className="doc-modal-actions"><Button variant="secondary" onClick={onClose}>Close</Button><Button onClick={onStartFromExisting}>Start from existing README</Button></div>
    </section>
  </div>;
}
