import { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import { useTheme } from "../../context/ThemeContext";
import { extractHeadings } from "../../utils/docBuilder";

[
  ["javascript", javascript],
  ["jsx", jsx],
  ["typescript", typescript],
  ["tsx", tsx],
  ["json", json],
  ["markdown", markdown],
  ["markup", markup],
  ["css", css],
  ["python", python],
  ["yaml", yaml]
].forEach(([name, language]) => SyntaxHighlighter.registerLanguage(name, language));

function relativeReferences(markdown) {
  const matches = String(markdown || "").matchAll(/!?\[[^\]]*]\(([^)\s]+)(?:\s+["'][^)]*["'])?\)/g);
  return [...new Set([...matches]
    .map((match) => match[1])
    .filter((target) => !/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(target)))];
}

export default function DocPreview({ markdown, outputType = "markdown", previewRef, onScroll }) {
  const { theme } = useTheme();
  const [previewTheme, setPreviewTheme] = useState(theme === "dark" ? "dark" : "light");
  const internalRef = useRef(null);
  const headings = useMemo(() => extractHeadings(markdown), [markdown]);
  const references = useMemo(() => relativeReferences(markdown), [markdown]);
  const codeStyle = previewTheme === "dark" ? vscDarkPlus : vs;
  const headingRenderers = Object.fromEntries([1, 2, 3, 4, 5, 6].map((level) => {
    const Tag = `h${level}`;
    return [Tag, ({ children, ...props }) => {
      const text = String(children ?? "");
      const slug = headings.find((heading) => heading.text === text)?.slug || "";
      return <Tag id={slug} data-doc-heading={slug} {...props}>{children}</Tag>;
    }];
  }));
  const content = outputType === "text"
    ? <pre className="doc-text-preview">{markdown}</pre>
    : <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
      ...headingRenderers,
      code({ inline, className, children, ...props }) {
        const language = /language-(\w+)/.exec(className || "")?.[1];
        const code = String(children);
        const isInline = typeof inline === "boolean" ? inline : !language && !code.includes("\n");
        if (isInline) return <code className={className} {...props}>{children}</code>;
        return <SyntaxHighlighter style={codeStyle} language={language} PreTag="div">{code.replace(/\n$/, "")}</SyntaxHighlighter>;
      },
      a({ href = "", children, ...props }) {
        const external = /^https?:\/\//i.test(href);
        return <a href={href} {...props} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>{children}</a>;
      }
    }}>{markdown}</ReactMarkdown>;

  const setPreviewRef = (node) => {
    internalRef.current = node;
    if (typeof previewRef === "function") previewRef(node);
    else if (previewRef) previewRef.current = node;
  };

  return <div className={`doc-preview-wrap ${previewTheme === "light" ? "doc-preview-light" : "doc-preview-dark"}`}>
    <div className="doc-preview-controls"><span>Live preview</span><button type="button" className="doc-text-button" onClick={() => setPreviewTheme((current) => current === "dark" ? "light" : "dark")} aria-label={`Switch preview to ${previewTheme === "dark" ? "light" : "dark"} theme`}>{previewTheme === "dark" ? "Dark" : "Light"} preview</button></div>
    {references.length > 0 && <div className="doc-relative-warning" role="status">Relative links or images may need adjustment after publishing: {references.slice(0, 4).join(", ")}</div>}
    <div ref={setPreviewRef} className="doc-preview-content prose" onScroll={(event) => onScroll?.(event.currentTarget)}>{content}</div>
  </div>;
}
