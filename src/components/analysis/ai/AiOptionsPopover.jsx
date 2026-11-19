import { EXPLAIN_LEVELS, OUTPUT_LANGUAGES } from "../../../utils/aiActions";
import { X } from "lucide-react";

export default function AiOptionsPopover({ open, preferences, onChange, onClose, onApply }) {
  if (!open) return null;
  return <section className="ai-options-popover" role="dialog" aria-label="AI action options">
    <div className="mb-3 flex items-center justify-between">
      <strong className="text-[11px]">AI preferences</strong>
      <button type="button" className="icon-btn !h-6 !w-6" onClick={onClose} aria-label="Close AI preferences"><X size={12}/></button>
    </div>
    <label className="mb-3 block text-[10px] text-muted">
      Explanation level
      <select className="select mt-1 w-full" value={preferences.level} onChange={(event) => onChange({ ...preferences, level: event.target.value })} aria-label="Explanation level">
        {EXPLAIN_LEVELS.map((level) => <option value={level.id} key={level.id}>{level.label} — {level.description}</option>)}
      </select>
    </label>
    <label className="mb-3 block text-[10px] text-muted">
      Output language
      <select className="select mt-1 w-full" value={preferences.language} onChange={(event) => onChange({ ...preferences, language: event.target.value })} aria-label="AI output language">
        {OUTPUT_LANGUAGES.map((language) => <option value={language.id} key={language.id}>{language.label} · {language.nativeLabel}</option>)}
      </select>
    </label>
    {onApply && <button type="button" className="btn btn-primary btn-sm w-full justify-center" onClick={onApply}>Apply and regenerate</button>}
  </section>;
}
