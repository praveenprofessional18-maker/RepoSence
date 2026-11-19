import { useState } from "react";
import { ChevronDown, EyeOff, FileText, GitPullRequest, History, Network, Plug, Rocket, Scale } from "lucide-react";
import { DOC_TYPES, getDocType } from "../../utils/docTypes";

const icons = { FileText, Rocket, GitPullRequest, Network, EyeOff, Plug, History, Scale };

export default function DocTypeSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = getDocType(value);
  const SelectedIcon = icons[selected.icon] || FileText;

  return <div className="doc-type-selector">
    <button type="button" className="btn btn-secondary btn-sm" aria-haspopup="listbox" aria-expanded={open} aria-label="Choose document type" onClick={() => setOpen((current) => !current)}>
      <SelectedIcon size={14}/>{selected.label}<ChevronDown size={13}/>
    </button>
    {open && <div className="doc-type-menu" role="listbox" aria-label="Document types">
      {DOC_TYPES.map((type) => {
        const Icon = icons[type.icon] || FileText;
        return <button type="button" role="option" aria-selected={value === type.id} key={type.id} onClick={() => { onChange(type.id); setOpen(false); }}>
          <Icon size={14}/><span><strong>{type.label}</strong><small>{type.description}</small></span>
        </button>;
      })}
    </div>}
  </div>;
}
