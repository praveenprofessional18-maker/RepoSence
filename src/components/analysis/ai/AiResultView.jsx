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
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import { useTheme } from "../../../context/ThemeContext";
import { CopyButton } from "../../common";

const languages = { javascript, jsx, typescript, tsx, json, markdown, python, css };
Object.entries(languages).forEach(([name, language]) => SyntaxHighlighter.registerLanguage(name, language));

function codeText(children) {
  const extract = (node) => {
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(extract).join("");
    if (node?.props?.children !== undefined) return extract(node.props.children);
    return "";
  };
  return extract(children).replace(/\n$/, "");
}

function MarkdownOutput({ output }) {
  const { theme } = useTheme();
  const codeStyle = theme === "dark" ? vscDarkPlus : vs;
  return <div className="prose ai-markdown-output">
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
      pre({ children }) {
        const source = codeText(children);
        const codeNode = React.Children.toArray(children)[0];
        const language = codeNode?.props?.className?.replace("language-", "") || "text";
        return <div className="overflow-hidden rounded-lg border border-line bg-panel2">
          <div className="flex items-center justify-between border-b border-line px-3 py-2 text-[9px] text-muted"><span>{language}</span><CopyButton value={source}/></div>
          <SyntaxHighlighter language={languages[language] ? language : undefined} style={codeStyle} customStyle={{ margin: 0, background: "transparent", fontSize: "10px" }}>{source}</SyntaxHighlighter>
        </div>;
      }
    }}>{output}</ReactMarkdown>
  </div>;
}

export default function AiResultView({ output = "", outputType = "markdown", fileLanguage = "javascript" }) {
  const { theme } = useTheme();
  const language = /python/i.test(fileLanguage) ? "python"
    : /typescript|tsx/i.test(fileLanguage) ? "typescript"
      : /jsx/i.test(fileLanguage) ? "jsx"
        : /javascript|js/i.test(fileLanguage) ? "javascript"
          : /json/i.test(fileLanguage) ? "json"
            : /css/i.test(fileLanguage) ? "css" : "text";
  if (outputType === "markdown") return <MarkdownOutput output={output}/>;
  return <div className="ai-code-output">
    <SyntaxHighlighter language={language === "text" ? undefined : language} style={theme === "dark" ? vscDarkPlus : vs} showLineNumbers wrapLongLines customStyle={{ margin: 0, background: "transparent", fontSize: "10px" }}>{output}</SyntaxHighlighter>
  </div>;
}
