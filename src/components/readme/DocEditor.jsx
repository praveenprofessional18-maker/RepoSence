import MarkdownEditor from "./MarkdownEditor";

export default function DocEditor({ value, onChange, textareaRef, onScroll, onFormat, outputType = "markdown" }) {
  return <div className="doc-editor-surface">
    <div className="doc-editor-toolbar" aria-label="Formatting toolbar">
      {[
        ["bold", "Bold", "B"],
        ["italic", "Italic", "I"],
        ["heading", "Heading", "H"],
        ["list", "List", "•"],
        ["code", "Code block", "</>"],
        ["link", "Link", "↗"],
        ["table", "Table", "▦"],
        ["checklist", "Checklist", "☑"],
        ["badge", "Insert badge", "◇"],
        ["section", "Insert section template", "+§"]
      ].map(([command, label, glyph]) => <button key={command} type="button" className="doc-format-button" disabled={outputType === "text"} aria-label={label} title={label} onClick={() => onFormat(command)}>{glyph}</button>)}
    </div>
    <MarkdownEditor
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onScroll={onScroll}
      ariaLabel={outputType === "text" ? "Plain text document editor" : "Documentation Markdown editor"}
      spellCheck={outputType !== "text"}
    />
  </div>;
}
