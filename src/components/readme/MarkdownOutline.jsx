import { useMemo } from "react";
import { extractHeadings } from "../../utils/docBuilder";

export default function MarkdownOutline({ markdown, onSelect }) {
  const headings = useMemo(() => extractHeadings(markdown), [markdown]);
  return <aside className="doc-outline" aria-label="Document outline">
    <h3>Outline</h3>
    {headings.length ? headings.map((heading, index) => <button type="button" key={`${heading.slug}-${index}`} className={`doc-outline-item level-${heading.level}`} onClick={() => onSelect(heading)} title={heading.text}>{heading.text}</button>) : <p className="text-[10px] text-muted">Add headings to build an outline.</p>}
  </aside>;
}
