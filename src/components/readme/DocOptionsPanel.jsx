import { OUTPUT_LANGUAGES } from "../../utils/aiActions";
import { getDocType } from "../../utils/docTypes";

const LICENSES = ["MIT", "Apache-2.0", "GPL-3.0", "BSD-3-Clause", "Unlicense"];

export default function DocOptionsPanel({ type, options, onChange, onReset }) {
  const definition = getDocType(type);
  const update = (key, value) => onChange({ ...options, [key]: value });

  return <section className="doc-options-panel" aria-label="Document options">
    <div className="flex items-center justify-between"><h3>Options</h3><button type="button" className="doc-text-button" onClick={onReset}>Reset to defaults</button></div>
    {definition.supportsTone && <label className="doc-option-field">Tone
      <select className="select" value={options.tone} onChange={(event) => update("tone", event.target.value)} aria-label="Document tone">
        {["Professional", "Friendly", "Minimal", "Detailed", "Beginner-friendly"].map((tone) => <option key={tone}>{tone}</option>)}
      </select>
    </label>}
    {definition.supportsLanguage && <label className="doc-option-field">Output language
      <select className="select" value={options.language} onChange={(event) => update("language", event.target.value)} aria-label="Document output language">
        {OUTPUT_LANGUAGES.map((language) => <option value={language.id} key={language.id}>{language.label} · {language.nativeLabel}</option>)}
      </select>
    </label>}
    {type === "readme" && <label className="doc-option-field">Badge style
      <select className="select" value={options.badgeStyle} onChange={(event) => update("badgeStyle", event.target.value)} aria-label="Badge style">
        <option value="flat">Flat</option><option value="for-the-badge">For the badge</option><option value="none">None</option>
      </select>
    </label>}
    {definition.supportsTone && <div className="doc-option-toggles">
      <label><input type="checkbox" checked={options.includeEmojis} onChange={(event) => update("includeEmojis", event.target.checked)}/>Include emojis</label>
      <label><input type="checkbox" checked={options.includeToc} onChange={(event) => update("includeToc", event.target.checked)}/>Include table of contents</label>
    </div>}
    {type === "gitignore" && <p className="doc-legal-note">Stack templates are detected from repository metadata; enable or disable them in the Sections list below.</p>}
    {type === "license" && <div className="doc-license-options">
      <label className="doc-option-field">License identifier
        <select className="select" value={options.license} onChange={(event) => update("license", event.target.value)} aria-label="License identifier">
          {LICENSES.map((license) => <option key={license}>{license}</option>)}
        </select>
      </label>
      <label className="doc-option-field">Copyright year<input className="input" inputMode="numeric" value={options.year} onChange={(event) => update("year", event.target.value)}/></label>
      <label className="doc-option-field">Copyright holder<input className="input" value={options.holder} onChange={(event) => update("holder", event.target.value)}/></label>
      <p className="doc-legal-note">The complete standard text is generated locally. Choosing a license is the owner’s decision; this is not legal advice. Review the terms before publishing.</p>
    </div>}
  </section>;
}
