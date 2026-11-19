import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
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

const languages = { javascript, jsx, typescript, tsx, json, markdown, html: markup, css, python, yaml };
Object.entries(languages).forEach(([name, language]) => SyntaxHighlighter.registerLanguage(name, language));

const languageByExt = { js:"javascript",jsx:"jsx",ts:"typescript",tsx:"tsx",json:"json",md:"markdown",html:"html",css:"css",py:"python",yml:"yaml",yaml:"yaml" };

export default function CodePreview({ fileName, code, highlightLine = null }) {
  const extension = fileName.split(".").pop();
  return <div className="code-block"><SyntaxHighlighter language={languageByExt[extension] || "plain"} style={vscDarkPlus} showLineNumbers wrapLines lineProps={(lineNumber) => ({
    style: lineNumber === highlightLine ? { background: "rgba(139,92,246,.2)", display: "block" } : { display: "block" }
  })} customStyle={{background:"transparent",fontSize:"11px",margin:0}}>{code}</SyntaxHighlighter></div>;
}
