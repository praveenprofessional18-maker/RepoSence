import { forwardRef } from "react";

const MarkdownEditor = forwardRef(function MarkdownEditor({
  value,
  onChange,
  ariaLabel = "README Markdown editor",
  onScroll,
  spellCheck = true
}, ref) {
  return <textarea
    ref={ref}
    className="markdown-editor"
    value={value}
    onChange={(event) => onChange(event.target.value)}
    onScroll={(event) => onScroll?.(event)}
    aria-label={ariaLabel}
    spellCheck={spellCheck}
  />;
});

export default MarkdownEditor;
