import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, CircleStop, FileCode2, LoaderCircle, MessageCircle, RotateCcw, Send, Sparkles, Trash2, User } from "lucide-react";
import toast from "react-hot-toast";
import { Button, CopyButton, Skeleton } from "../common";
import { aiService } from "../../services/aiService";

const suggestedQuestions = [
  "Where is authentication handled?",
  "Explain the folder structure",
  "How do I run this project?"
];

function getStorageKey(analysisId) {
  return `reposense_chat_${analysisId}`;
}

function createMessageId() {
  return globalThis.crypto?.randomUUID?.() || `message-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getCodeText(children) {
  const nodes = Array.isArray(children) ? children : [children];
  return nodes.map((node) => {
    if (node && typeof node === "object" && node.props) {
      return Array.isArray(node.props.children)
        ? node.props.children.join("")
        : String(node.props.children ?? "");
    }
    return String(node ?? "");
  }).join("").replace(/\n$/, "");
}

function ChatMarkdown({ markdown }) {
  return <div className="prose chat-markdown">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        pre({ children }) {
          const codeNode = Array.isArray(children) ? children[0] : children;
          const code = getCodeText(children);
          const language = codeNode?.props?.className?.replace("language-", "") || "code";
          return <div className="overflow-hidden rounded-lg border border-line bg-[var(--bg)]">
            <div className="flex items-center justify-between border-b border-line px-3 py-2 text-[9px] text-muted"><span>{language}</span><CopyButton value={code} /></div>
            <pre className="m-0 overflow-x-auto p-3 font-mono text-[11px] leading-5 text-main"><code>{code}</code></pre>
          </div>;
        }
      }}
    >
      {markdown}
    </ReactMarkdown>
  </div>;
}

function readMessages(analysisId) {
  const serialized = localStorage.getItem(getStorageKey(analysisId));
  if (!serialized) return [];
  const messages = JSON.parse(serialized);
  if (!Array.isArray(messages)) throw new Error("Saved chat history has an invalid format.");
  return messages.filter((message) =>
    message &&
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string"
  );
}

export default function RepositoryChat({ analysisId, repo, contextFiles }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const messagesRef = useRef([]);
  const generationRef = useRef(null);
  const scrollRef = useRef(null);
  const availablePaths = useMemo(() => new Set(contextFiles.map((file) => file.path)), [contextFiles]);
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");

  const commitMessages = (update, persist = true) => {
    const next = typeof update === "function" ? update(messagesRef.current) : update;
    messagesRef.current = next;
    setMessages(next);
    if (!persist) return;
    try {
      localStorage.setItem(getStorageKey(analysisId), JSON.stringify(next));
    } catch (error) {
      toast.error(`Could not save chat history. ${error.message}`);
    }
  };

  useEffect(() => {
    setHistoryLoading(true);
    try {
      const saved = readMessages(analysisId);
      messagesRef.current = saved;
      setMessages(saved);
    } catch (error) {
      messagesRef.current = [];
      setMessages([]);
      toast.error(error.message || "Could not load chat history.");
    } finally {
      setHistoryLoading(false);
    }
    return () => {
      generationRef.current?.controller.abort();
      generationRef.current = null;
    };
  }, [analysisId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const stopGeneration = () => {
    const generation = generationRef.current;
    if (!generation) return;
    generation.controller.abort();
    generationRef.current = null;
    setGenerating(false);
    commitMessages((current) => current.map((message) =>
      message.id === generation.messageId ? { ...message, status: "stopped" } : message
    ));
    toast("Response generation stopped");
  };

  const generateResponse = async (prompt, { regenerate = false } = {}) => {
    if (!prompt.trim() || generationRef.current) return;
    const controller = new AbortController();
    const messageId = createMessageId();
    const priorMessages = messagesRef.current;
    const baseMessages = regenerate && priorMessages.at(-1)?.role === "assistant"
      ? priorMessages.slice(0, -1)
      : priorMessages;
    const userMessage = { id: createMessageId(), role: "user", content: prompt.trim(), createdAt: new Date().toISOString() };
    const assistantMessage = { id: messageId, role: "assistant", content: "", citations: [], createdAt: new Date().toISOString(), status: "generating" };
    const nextMessages = [...(regenerate ? baseMessages : [...baseMessages, userMessage]), assistantMessage];
    const generation = { controller, messageId };
    generationRef.current = generation;
    setGenerating(true);
    commitMessages(nextMessages);

    try {
      const history = nextMessages
        .filter((message) => message.id !== messageId)
        .map(({ role, content }) => ({ role, content }));
      const result = await aiService.chatWithRepo({
        analysisId,
        messages: history,
        contextFiles,
        signal: controller.signal
      });
      if (generationRef.current !== generation) return;
      if (!result || typeof result.answer !== "string") {
        throw new Error("The repository assistant returned an invalid response.");
      }

      const answer = result.answer;
      for (let index = 0; index < answer.length; index += 8) {
        if (generationRef.current !== generation) return;
        const partial = answer.slice(0, index + 8);
        commitMessages((current) => current.map((message) =>
          message.id === messageId ? { ...message, content: partial } : message
        ), false);
        await new Promise((resolve) => window.setTimeout(resolve, 14));
      }
      if (generationRef.current !== generation) return;
      const citations = (Array.isArray(result.citations) ? result.citations : [])
        .map((citation) => typeof citation === "string" ? { path: citation } : citation)
        .filter((citation) => citation && availablePaths.has(citation.path));
      commitMessages((current) => current.map((message) =>
        message.id === messageId ? { ...message, content: answer, citations, status: "complete" } : message
      ));
    } catch (error) {
      if (controller.signal.aborted) return;
      commitMessages((current) => current.map((message) =>
        message.id === messageId
          ? { ...message, content: "I couldn't complete that response. Please try again.", status: "error" }
          : message
      ));
      toast.error(error.message || "Could not get a repository answer.");
    } finally {
      if (generationRef.current === generation) {
        generationRef.current = null;
        setGenerating(false);
      }
    }
  };

  const sendMessage = (event) => {
    event?.preventDefault();
    const prompt = input.trim();
    if (!prompt || generating) return;
    setInput("");
    generateResponse(prompt);
  };

  const clearChat = () => {
    if (generating) stopGeneration();
    commitMessages([]);
    toast.success("Chat history cleared");
  };

  const openCitation = (path) => {
    navigate(`/analysis/${analysisId}?file=${encodeURIComponent(path)}`);
  };

  return <section className="card flex min-h-[480px] flex-col overflow-hidden" aria-label={`Chat about ${repo.fullName}`}>
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="feature-icon"><MessageCircle size={16}/></span>
        <div className="min-w-0">
          <h2 className="m-0 truncate text-sm font-semibold">Chat with {repo.name}</h2>
          <p className="m-0 mt-1 text-[10px] text-muted">Ask questions about the saved repository analysis.</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {generating
          ? <Button variant="secondary" size="sm" onClick={stopGeneration}><CircleStop size={13}/>Stop</Button>
          : <Button variant="secondary" size="sm" onClick={() => lastUserMessage && generateResponse(lastUserMessage.content, { regenerate: true })} disabled={!lastUserMessage}><RotateCcw size={13}/>Regenerate</Button>}
        <Button variant="secondary" size="sm" onClick={clearChat} disabled={historyLoading || (!messages.length && !generating)} aria-label="Clear chat history"><Trash2 size={13}/><span className="hidden sm:inline">Clear</span></Button>
      </div>
    </header>

    <div className="min-h-[300px] max-h-[570px] flex-1 overflow-y-auto" ref={scrollRef} aria-live="polite" aria-label="Chat messages" aria-busy={generating}>
      {historyLoading ? <div className="grid gap-3 p-5"><Skeleton className="w-3/4"/><Skeleton className="ml-auto w-2/3"/><Skeleton className="w-1/2"/></div>
        : messages.length === 0 ? <div className="flex min-h-[300px] flex-col items-center justify-center px-5 py-10 text-center">
          <span className="empty-icon"><Sparkles size={20}/></span>
          <h3>Ask about this repository</h3>
          <p>Answers are based on the saved analysis and are advisory.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestedQuestions.map((question) => <button key={question} className="example-chip" onClick={() => generateResponse(question)} disabled={generating}>{question}</button>)}
          </div>
        </div>
        : <div className="grid gap-5 p-4 sm:p-6">
          {messages.map((message) => <article className={`flex gap-3 rounded-xl p-3 sm:p-4 ${message.role === "user" ? "bg-panel2" : ""}`} key={message.id}>
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${message.role === "assistant" ? "bg-violet-500/10 text-violet-400" : "bg-panel text-muted"}`} aria-hidden="true">
              {message.role === "assistant" ? <Bot size={15}/> : <User size={15}/>}
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-[10px] font-semibold">{message.role === "assistant" ? "RepoSense" : "You"}</div>
              {message.content
                ? <ChatMarkdown markdown={message.content}/>
                : message.status === "generating"
                  ? <div className="flex items-center gap-2 py-2 text-[11px] text-muted"><LoaderCircle size={13} className="animate-spin"/>Reading repository context…</div>
                  : null}
              {message.status === "generating" && message.content && <span className="ml-1 inline-block h-2 w-2 animate-pulse rounded-full bg-violet-400" aria-label="Response is still generating"/>}
              {message.citations?.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Cited files">
                <span className="text-[9px] text-muted">Sources</span>
                {message.citations.map((citation) => <button key={citation.path} className="tag hover:text-main" onClick={() => openCitation(citation.path)} title={`Open ${citation.path} in Structure`}><FileCode2 size={11}/>{citation.label || citation.path}</button>)}
              </div>}
            </div>
          </article>)}
        </div>}
    </div>

    {messages.length > 0 && !historyLoading && <div className="flex gap-2 overflow-x-auto border-t border-line px-4 py-3">
      {suggestedQuestions.map((question) => <button key={question} className="example-chip" onClick={() => generateResponse(question)} disabled={generating}>{question}</button>)}
    </div>}
    <form className="grid grid-cols-[1fr_auto] items-end gap-2 border-t border-line p-3 sm:p-4" onSubmit={sendMessage}>
      <label className="sr-only" htmlFor={`chat-input-${analysisId}`}>Ask a question about {repo.fullName}</label>
      <textarea
        id={`chat-input-${analysisId}`}
        className="input min-h-[52px] max-h-40 resize-y py-2.5"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
          }
        }}
        placeholder="Ask a question about this repository…"
        rows={2}
        disabled={generating || historyLoading}
      />
      <Button type={generating ? "button" : "submit"} onClick={generating ? stopGeneration : undefined} disabled={!generating && !input.trim()} aria-label={generating ? "Stop generating response" : "Send message"}>
        {generating ? <CircleStop size={15}/> : <Send size={15}/>}
      </Button>
      <p className="col-span-2 m-0 flex items-center gap-1.5 text-[9px] text-muted"><Sparkles size={11}/>AI output may be incomplete. Verify important details against the source files.</p>
    </form>
  </section>;
}
