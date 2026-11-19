import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronRight, LoaderCircle, PanelLeftClose, PanelLeftOpen, Sparkles, Square, WandSparkles } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Skeleton } from "../common";
import { useCopyToClipboard } from "../../hooks";
import { aiService } from "../../services/aiService";
import { historyService } from "../../services/historyService";
import { repoService } from "../../services/repoService";
import { sanitizeSensitiveContent, flattenTree } from "../../utils/securityScanner";
import { OUTPUT_LANGUAGES } from "../../utils/aiActions";
import { buildBaseDocument, countWords, detectGitignoreStacks, hashOptions } from "../../utils/docBuilder";
import { DOC_TYPES, getDefaultSections, getDocType } from "../../utils/docTypes";
import { confirmDocumentNavigation, registerDocumentLeaveGuard } from "../../utils/docStudioGuard";
import DocEditor from "./DocEditor";
import DocOptionsPanel from "./DocOptionsPanel";
import DocPreview from "./DocPreview";
import DocToolbar from "./DocToolbar";
import DocTypeSelector from "./DocTypeSelector";
import ExistingReadmeCompare from "./ExistingReadmeCompare";
import MarkdownOutline from "./MarkdownOutline";
import SectionToggleList from "./SectionToggleList";
import VersionHistoryDrawer from "./VersionHistoryDrawer";

const TONES = ["Professional", "Friendly", "Minimal", "Detailed", "Beginner-friendly"];
const MAX_DRAFT_CHARS = 100_000;

function draftStorageKey(analysisId, type) {
  return `reposense_document_draft:${encodeURIComponent(analysisId)}:${encodeURIComponent(type)}`;
}

function preferencesStorageKey(analysisId, type) {
  return `reposense_document_options:${encodeURIComponent(analysisId)}:${encodeURIComponent(type)}`;
}

function defaultOptions(repository, type) {
  return {
    tone: "Professional",
    language: "English",
    badgeStyle: "flat",
    includeEmojis: false,
    includeToc: false,
    gitignoreStacks: detectGitignoreStacks(repository),
    license: "MIT",
    year: String(new Date().getFullYear()),
    holder: repository.owner || repository.fullName || ""
  };
}

function readDocumentPreferences(analysisId, type, repository) {
  const options = defaultOptions(repository, type);
  const sections = type === "gitignore" ? { ...options.gitignoreStacks } : getDefaultSections(type);
  const order = getDocType(type).sections.map((item) => item.id);
  try {
    const saved = JSON.parse(localStorage.getItem(preferencesStorageKey(analysisId, type)) || "{}");
    const validLanguages = OUTPUT_LANGUAGES.map((item) => item.id);
    const validTones = TONES;
    const savedOrder = Array.isArray(saved.order) ? saved.order.filter((id) => order.includes(id)) : [];
    return {
      options: {
        ...options,
        ...saved.options,
        tone: validTones.includes(saved.options?.tone) ? saved.options.tone : options.tone,
        language: validLanguages.includes(saved.options?.language) ? saved.options.language : options.language,
        gitignoreStacks: { ...options.gitignoreStacks, ...saved.options?.gitignoreStacks }
      },
      sections: { ...sections, ...saved.sections },
      order: [...savedOrder, ...order.filter((id) => !savedOrder.includes(id))]
    };
  } catch {
    return { options, sections, order };
  }
}

function findReadme(repository) {
  const file = flattenTree(repository.tree || []).find((item) => /^readme(?:\..*)?$/i.test(item.path.split("/").pop()));
  return file || null;
}

function getDocumentStats(text) {
  const content = String(text || "");
  const words = countWords(content);
  return {
    words,
    characters: content.length,
    readingMinutes: Math.max(1, Math.ceil(words / 200))
  };
}

function downloadText(filename, content, mimeType) {
  const objectUrl = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function languageFromFilename(filename) {
  const extension = filename.split(".").pop().toLowerCase();
  return ({ md: "markdown", js: "javascript", jsx: "jsx", ts: "typescript", tsx: "tsx", json: "json", yml: "yaml", yaml: "yaml", css: "css", py: "python", html: "html" })[extension] || "text";
}

export default function DocStudioTab({ repo, onRepositoryUpdated }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedType = searchParams.get("type") || "readme";
  const type = DOC_TYPES.some((item) => item.id === requestedType) ? requestedType : "readme";
  const definition = getDocType(type);
  const [options, setOptions] = useState(() => defaultOptions(repo, type));
  const [sections, setSections] = useState(() => getDefaultSections(type));
  const [sectionOrder, setSectionOrder] = useState(() => definition.sections.map((item) => item.id));
  const [markdown, setMarkdown] = useState("");
  const [useEditorContentAsBase, setUseEditorContentAsBase] = useState(false);
  const [status, setStatus] = useState("Draft");
  const [dirty, setDirty] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [storageWarning, setStorageWarning] = useState("");
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [generationError, setGenerationError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [view, setView] = useState("split");
  const [fullscreen, setFullscreen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const [generatedDocuments, setGeneratedDocuments] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [existingReadme, setExistingReadme] = useState("");
  const [loadingReadme, setLoadingReadme] = useState(false);
  const [searchReadmeError, setSearchReadmeError] = useState("");
  const controllerRef = useRef(null);
  const generationSequenceRef = useRef(0);
  const editorRef = useRef(null);
  const previewRef = useRef(null);
  const draftRef = useRef(markdown);
  const autosaveToastRef = useRef(false);
  const { copy: copyToClipboard, copied } = useCopyToClipboard();
  const readmeFile = useMemo(() => findReadme(repo), [repo]);
  const documentStats = useMemo(() => getDocumentStats(markdown), [markdown]);
  const currentDraftKey = useMemo(() => draftStorageKey(repo.id, type), [repo.id, type]);
  const settingsHash = useMemo(() => hashOptions({
    type,
    options,
    sections,
    sectionOrder
  }), [type, options, sections, sectionOrder]);
  const isPlainText = definition.outputType === "text";
  const canGenerateWithAi = !isPlainText && definition.supportsTone && definition.supportsLanguage;

  draftRef.current = markdown;

  useEffect(() => {
    let active = true;
    setHydrated(false);
    setLoadingDocs(true);
    setGenerationError("");
    setDirty(false);

    const savedPreferences = readDocumentPreferences(repo.id, type, repo);
    setOptions(savedPreferences.options);
    setSections(savedPreferences.sections);
    setSectionOrder(savedPreferences.order);

    let restoredDraft = "";
    try {
      restoredDraft = localStorage.getItem(draftStorageKey(repo.id, type)) || "";
    } catch (error) {
      setStorageWarning(`Draft storage is unavailable. ${error.message}`);
    }

    const initialDraft = restoredDraft
      ? sanitizeSensitiveContent(restoredDraft).slice(0, MAX_DRAFT_CHARS)
      : buildBaseDocument({
        type,
        analysis: repo,
        sections: savedPreferences.sections,
        options: { ...savedPreferences.options, sectionOrder: savedPreferences.order }
      });
    setMarkdown(initialDraft);
    setUseEditorContentAsBase(Boolean(restoredDraft));
    setStatus(restoredDraft ? "Edited" : "Draft");
    setHydrated(true);

    Promise.all([
      historyService.getGeneratedDocuments(repo.id),
      historyService.getDocumentVersions(repo.id)
    ]).then(([documents, savedVersions]) => {
      if (!active) return;
      setGeneratedDocuments(documents);
      setVersions(savedVersions);
      if (restoredDraft) return;

      const savedHash = hashOptions({
        type,
        options: savedPreferences.options,
        sections: savedPreferences.sections,
        sectionOrder: savedPreferences.order
      });
      const matchingCache = documents.find((item) => item.type === type && item.optionsHash === savedHash);
      if (matchingCache) {
        const safeOutput = sanitizeSensitiveContent(matchingCache.output).slice(0, MAX_DRAFT_CHARS);
        setMarkdown(safeOutput);
        setUseEditorContentAsBase(matchingCache.mode === "ai");
        setStatus(matchingCache.mode === "ai" ? "AI generated" : "Draft");
        setDirty(false);
      }
    }).catch((error) => {
      if (active) setGenerationError(error.message || "Could not load saved documents.");
    }).finally(() => {
      if (active) setLoadingDocs(false);
    });

    return () => {
      active = false;
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, [repo.id, type]);

  useEffect(() => {
    if (!hydrated) return undefined;
    try {
      localStorage.setItem(preferencesStorageKey(repo.id, type), JSON.stringify({ options, sections, order: sectionOrder }));
    } catch (error) {
      setStorageWarning(`Document preferences could not be saved. ${error.message}`);
    }
    return undefined;
  }, [repo.id, type, options, sections, sectionOrder, hydrated]);

  useEffect(() => {
    if (!hydrated) return undefined;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(currentDraftKey, sanitizeSensitiveContent(markdown).slice(0, MAX_DRAFT_CHARS));
        setStorageWarning("");
      } catch (error) {
        setStorageWarning(`Draft autosave failed. ${error.message}`);
        if (!autosaveToastRef.current) {
          autosaveToastRef.current = true;
          toast.error("Document autosave failed. Check browser storage before leaving this page.");
        }
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [markdown, currentDraftKey, hydrated]);

  useEffect(() => {
    if (!dirty) return undefined;
    const guard = () => {
      try {
        localStorage.setItem(currentDraftKey, sanitizeSensitiveContent(draftRef.current).slice(0, MAX_DRAFT_CHARS));
      } catch (error) {
        toast.error(`Could not autosave this document before leaving. ${error.message}`);
        return false;
      }
      const shouldLeave = window.confirm("This document has unsaved edits. Your draft is autosaved locally; leave without saving a version?");
      if (shouldLeave) setDirty(false);
      return shouldLeave;
    };
    const unregister = registerDocumentLeaveGuard(guard);
    const beforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      unregister();
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [dirty, currentDraftKey]);

  const saveVersion = useCallback(async (content = draftRef.current, label = "Saved version") => {
    const safeContent = sanitizeSensitiveContent(String(content || "")).slice(0, MAX_DRAFT_CHARS);
    try {
      const nextVersions = await historyService.saveDocumentVersion(repo.id, {
        type,
        label,
        content: safeContent,
        wordCount: countWords(safeContent)
      });
      setVersions(nextVersions);
      onRepositoryUpdated?.({ documentVersions: nextVersions });
      localStorage.setItem(currentDraftKey, safeContent);
      setMarkdown(safeContent);
      setUseEditorContentAsBase(true);
      setDirty(false);
      setStatus("Edited");
      setStorageWarning("");
      toast.success("Document version saved");
    } catch (error) {
      toast.error(error.message || "Could not save this document version");
    }
  }, [repo.id, type, currentDraftKey, onRepositoryUpdated]);

  const saveGenerated = useCallback(async (output, mode, cacheOptions = options) => {
    const safeOutput = sanitizeSensitiveContent(String(output || "")).slice(0, MAX_DRAFT_CHARS);
    const now = new Date().toISOString();
    const cacheOptionsHash = hashOptions({ type, options: cacheOptions, sections, sectionOrder });
    setMarkdown(safeOutput);
    setUseEditorContentAsBase(mode === "ai");
    setDirty(false);
    setStatus(mode === "ai" ? "AI generated" : "Draft");
    setGenerationError("");
    try {
      const documents = await historyService.saveGeneratedDocument(repo.id, {
        type,
        cacheKey: `${type}:${mode}:${cacheOptionsHash}`,
        optionsHash: cacheOptionsHash,
        options: { ...cacheOptions, sections, sectionOrder },
        output: safeOutput,
        mode,
        filename: definition.filename,
        createdAt: now
      });
      setGeneratedDocuments(documents);
      const nextVersions = await historyService.saveDocumentVersion(repo.id, {
        type,
        label: mode === "ai" ? "AI generated" : "Quick draft",
        content: safeOutput,
        wordCount: countWords(safeOutput),
        createdAt: now
      });
      setVersions(nextVersions);
      onRepositoryUpdated?.({ generatedDocuments: documents, documentVersions: nextVersions });
      localStorage.setItem(currentDraftKey, safeOutput);
      setStorageWarning("");
    } catch (error) {
      toast.error(error.message || "Document was generated but could not be saved to analysis history.");
    }
  }, [repo.id, type, options, sections, sectionOrder, definition.filename, currentDraftKey, onRepositoryUpdated]);

  const quickDraft = useCallback(async () => {
    const output = buildBaseDocument({
      type,
      analysis: repo,
      sections,
      options: { ...options, sectionOrder }
    });
    await saveGenerated(output, "quick");
    toast.success("Offline draft created");
  }, [type, repo, sections, options, sectionOrder, saveGenerated]);

  const generate = useCallback(async (force = false) => {
    if (!canGenerateWithAi || generating) return;
    const key = `${type}:ai:${settingsHash}`;
    if (!force && status === "Draft" && !dirty) {
      const cached = generatedDocuments.find((item) => item.cacheKey === key);
      if (cached) {
        setMarkdown(sanitizeSensitiveContent(cached.output).slice(0, MAX_DRAFT_CHARS));
        setUseEditorContentAsBase(true);
        setStatus("AI generated");
        setDirty(false);
        toast.success("Loaded the cached AI document");
        return;
      }
    }

    const sequence = ++generationSequenceRef.current;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setGenerating(true);
    setGenerationError("");
    setStreamText("");
    try {
      const baseDraft = useEditorContentAsBase
        ? sanitizeSensitiveContent(markdown).slice(0, MAX_DRAFT_CHARS)
        : buildBaseDocument({
          type,
          analysis: repo,
          sections,
          options: { ...options, sectionOrder }
        });
      const output = await aiService.generateDocument({
        analysisId: repo.id,
        type,
        sections,
        tone: options.tone,
        language: options.language,
        baseDraft,
        signal: controller.signal,
        onChunk: (chunk) => {
          if (sequence === generationSequenceRef.current) setStreamText(sanitizeSensitiveContent(chunk));
        }
      });
      if (sequence !== generationSequenceRef.current || controller.signal.aborted) return;
      await saveGenerated(output, "ai");
      setStreamText("");
      toast.success("AI documentation generated");
    } catch (error) {
      if (error.name === "AbortError" || controller.signal.aborted) {
        setGenerationError("");
        toast("Generation stopped");
      } else {
        setGenerationError(error.message || "Could not generate this document.");
        toast.error(error.message || "Could not generate this document.");
      }
    } finally {
      if (sequence === generationSequenceRef.current) {
        setGenerating(false);
        controllerRef.current = null;
      }
    }
  }, [canGenerateWithAi, generating, type, settingsHash, generatedDocuments, repo, sections, options, sectionOrder, saveGenerated, useEditorContentAsBase, markdown, status, dirty]);

  const stopGeneration = () => {
    generationSequenceRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setGenerating(false);
    setStreamText("");
  };

  const handleChange = (value) => {
    const safeValue = sanitizeSensitiveContent(String(value || "")).slice(0, MAX_DRAFT_CHARS);
    setMarkdown(safeValue);
    setUseEditorContentAsBase(true);
    setDirty(true);
    setStatus("Unsaved changes");
  };

  const changeType = (nextType) => {
    if (nextType === type) return;
    if (!confirmDocumentNavigation()) return;
    const next = new URLSearchParams(searchParams);
    next.set("type", nextType);
    setSearchParams(next);
  };

  const updateSections = (id, checked) => {
    setSections((current) => ({ ...current, [id]: checked }));
    if (type === "gitignore") {
      setOptions((current) => ({ ...current, gitignoreStacks: { ...current.gitignoreStacks, [id]: checked } }));
    }
    setDirty(true);
  };

  const updateOptions = (nextOptions) => {
    setOptions(nextOptions);
    if (type === "gitignore") setSections(nextOptions.gitignoreStacks);
    setDirty(true);
  };

  const insertFormatting = (command) => {
    const editor = editorRef.current;
    if (!editor || isPlainText) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = markdown.slice(start, end);
    const templates = {
      bold: [`**${selected || "bold text"}**`, 2],
      italic: [`*${selected || "italic text"}*`, 1],
      heading: [`## ${selected || "Section heading"}`, 3],
      list: [`- ${selected || "List item"}`, 2],
      code: [`\`\`\`text\n${selected || "code"}\n\`\`\``, 8],
      link: [`[${selected || "link text"}](https://example.com)`, 1],
      table: ["| Column | Column |\n| --- | --- |\n| Value | Value |", 0],
      checklist: [`- [ ] ${selected || "Checklist item"}`, 6],
      badge: ["![License](https://img.shields.io/badge/license-MIT-blue)", 0],
      section: [`\n## ${selected || "New section"}\n\nAdd verified details here.\n`, 4]
    };
    const [replacement, offset] = templates[command] || ["", 0];
    const nextValue = `${markdown.slice(0, start)}${replacement}${markdown.slice(end)}`;
    handleChange(nextValue);
    window.requestAnimationFrame(() => {
      editor.focus();
      const caret = start + Math.min(replacement.length, offset + (selected ? selected.length : 0));
      editor.setSelectionRange(caret, caret);
    });
  };

  const syncScroll = (source) => {
    const editor = editorRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return;
    if (source === editor) {
      const range = editor.scrollHeight - editor.clientHeight;
      if (range > 0) preview.scrollTop = (editor.scrollTop / range) * (preview.scrollHeight - preview.clientHeight);
    } else if (source === preview) {
      const range = preview.scrollHeight - preview.clientHeight;
      if (range > 0) editor.scrollTop = (preview.scrollTop / range) * (editor.scrollHeight - editor.clientHeight);
    }
  };

  const jumpToHeading = (heading) => {
    const editor = editorRef.current;
    if (editor) {
      const lines = markdown.split(/\r?\n/);
      const lineIndex = lines.findIndex((line) => line.replace(/^#{1,6}\s+/, "").replace(/\s+#+$/, "").trim() === heading.text);
      if (lineIndex >= 0) {
        const start = lines.slice(0, lineIndex).reduce((sum, line) => sum + line.length + 1, 0);
        editor.focus();
        editor.setSelectionRange(start, start + lines[lineIndex].length);
        editor.scrollTop = lineIndex * parseFloat(getComputedStyle(editor).lineHeight || "20");
      }
    }
    const target = previewRef.current?.querySelector(`[data-doc-heading="${heading.slug}"]`);
    target?.scrollIntoView({ block: "start" });
  };

  const copyDocument = async () => {
    try {
      await copyToClipboard(markdown);
      toast.success("Document copied");
    } catch (error) {
      toast.error(`Could not copy the document. ${error.message}`);
    }
  };

  const copyHtml = async () => {
    const html = previewRef.current?.innerHTML;
    if (!html) {
      toast.error("Switch to Split or Preview to render HTML first.");
      return;
    }
    try {
      await copyToClipboard(html);
      toast.success("Rendered HTML copied");
    } catch (error) {
      toast.error(`Could not copy rendered HTML. ${error.message}`);
    }
  };

  const downloadDocument = () => downloadText(definition.filename, markdown, isPlainText ? "text/plain" : "text/markdown");

  const downloadZip = async () => {
    try {
      const { default: JSZip } = await import("jszip");
      const saved = await historyService.getGeneratedDocuments(repo.id);
      const sorted = [...new Map(saved.map((item) => [item.cacheKey, item])).values()]
        .sort((a, b) => new Date(a.createdAt || a.updatedAt) - new Date(b.createdAt || b.updatedAt));
      const latestByType = new Map();
      for (const item of sorted) latestByType.set(item.type, item.cacheKey);
      const typeOccurrences = new Map();
      const zip = new JSZip();
      for (const item of sorted) {
        const definitionForDoc = getDocType(item.type);
        const occurrence = (typeOccurrences.get(item.type) || 0) + 1;
        typeOccurrences.set(item.type, occurrence);
        const isLatest = latestByType.get(item.type) === item.cacheKey;
        const timestamp = String(item.createdAt || item.updatedAt || "").replace(/[^0-9]/g, "").slice(0, 14) || occurrence;
        const archivePath = isLatest
          ? `generated/${definitionForDoc.filename}`
          : `generated/history/${item.type}/${timestamp}-${occurrence}-${definitionForDoc.filename}`;
        zip.file(archivePath, sanitizeSensitiveContent(item.output));
      }
      zip.file(`current/${definition.filename}`, sanitizeSensitiveContent(markdown));
      const blob = await zip.generateAsync({ type: "blob" });
      downloadText(`${repo.name}-documents.zip`, blob, "application/zip");
      toast.success("Generated documents downloaded as ZIP");
    } catch (error) {
      toast.error(error.message || "Could not create the documents ZIP.");
    }
  };

  const saveCurrentVersion = () => saveVersion(markdown, `Saved version · ${new Date().toLocaleString()}`);

  const loadVersions = async () => {
    try {
      setVersions(await historyService.getDocumentVersions(repo.id));
    } catch (error) {
      toast.error(error.message || "Could not load document versions.");
    }
  };

  const restoreVersion = async (version) => {
    const content = sanitizeSensitiveContent(version.content).slice(0, MAX_DRAFT_CHARS);
    setMarkdown(content);
    setUseEditorContentAsBase(true);
    setDirty(false);
    setStatus("Edited");
    try {
      localStorage.setItem(currentDraftKey, content);
      toast.success(`Restored ${version.label}`);
    } catch (error) {
      toast.error(`Version restored in the editor but autosave failed. ${error.message}`);
    }
  };

  const renameVersion = async (versionId, label) => {
    try {
      setVersions(await historyService.renameDocumentVersion(repo.id, versionId, label));
      toast.success("Version renamed");
    } catch (error) {
      toast.error(error.message || "Could not rename version.");
    }
  };

  const deleteVersion = async (versionId) => {
    try {
      setVersions(await historyService.removeDocumentVersion(repo.id, versionId));
      toast.success("Version deleted");
    } catch (error) {
      toast.error(error.message || "Could not delete version.");
    }
  };

  const loadExistingReadme = async () => {
    if (!readmeFile) return;
    setLoadingReadme(true);
    setSearchReadmeError("");
    try {
      const content = typeof repo.files?.[readmeFile.path] === "string"
        ? repo.files[readmeFile.path]
        : await repoService.getFile(repo.owner, repo.name, readmeFile.path, readmeFile.size);
      setExistingReadme(sanitizeSensitiveContent(content).slice(0, MAX_DRAFT_CHARS));
      setCompareOpen(true);
    } catch (error) {
      setSearchReadmeError(error.message || "Could not load the repository README.");
      toast.error(error.message || "Could not load the repository README.");
    } finally {
      setLoadingReadme(false);
    }
  };

  const startFromExisting = () => {
    handleChange(existingReadme);
    setCompareOpen(false);
  };

  const openOnGitHub = () => {
    const owner = String(repo.owner || "").trim();
    const name = String(repo.name || "").trim();
    const branch = String(repo.branch || "main").trim();
    if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(name) || !branch) {
      toast.error("Repository details are not available for the GitHub helper.");
      return;
    }
    const url = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/new/${encodeURIComponent(branch)}?filename=${encodeURIComponent(definition.filename)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    const onShortcut = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        saveCurrentVersion();
      } else if (key === "c" && event.shiftKey) {
        event.preventDefault();
        copyDocument();
      } else if (key === "enter" && !event.shiftKey) {
        event.preventDefault();
        if (canGenerateWithAi) generate(true);
        else quickDraft();
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [canGenerateWithAi, generate, quickDraft, saveCurrentVersion, copyDocument]);

  useEffect(() => {
    if (!historyOpen && !compareOpen && !fullscreen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      if (compareOpen) setCompareOpen(false);
      else if (historyOpen) setHistoryOpen(false);
      else setFullscreen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [historyOpen, compareOpen, fullscreen]);

  if (loadingDocs) return <div className="grid gap-3"><Skeleton className="h-12 w-full"/><Skeleton className="h-28 w-full"/><Skeleton className="h-[470px] w-full"/></div>;

  return <div className={`doc-studio ${fullscreen ? "doc-studio-fullscreen" : ""}`}>
    <header className="doc-studio-topbar">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <button type="button" className="icon-btn" onClick={() => setLeftPanelOpen((current) => !current)} aria-label={leftPanelOpen ? "Collapse document options" : "Expand document options"}>{leftPanelOpen ? <PanelLeftClose size={14}/> : <PanelLeftOpen size={14}/>}</button>
        <DocTypeSelector value={type} onChange={changeType}/>
        <span className={`doc-status-chip ${status === "AI generated" ? "ai" : status === "Unsaved changes" ? "unsaved" : ""}`} role="status">{status}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {canGenerateWithAi ? <Button size="sm" onClick={() => generate(status === "AI generated")} disabled={generating} title="Generate or regenerate this document with AI">
          {generating ? <LoaderCircle size={13} className="animate-spin"/> : <Sparkles size={13}/>}
          {status === "AI generated" ? "Regenerate (AI)" : "Generate with AI"}
        </Button> : <span className="tag" title="This document type is generated locally.">Local generation</span>}
        <Button size="sm" variant="secondary" onClick={quickDraft} disabled={generating}><WandSparkles size={13}/>Quick draft</Button>
        {generating && <Button size="sm" variant="danger" onClick={stopGeneration}><Square size={12}/>Stop</Button>}
      </div>
    </header>

    {generationError && <div className="doc-error" role="alert"><span>{generationError}</span><button type="button" onClick={() => setGenerationError("")}>Dismiss</button></div>}
    {storageWarning && <div className="doc-warning" role="status">{storageWarning}</div>}
    {searchReadmeError && <div className="doc-warning" role="status">{searchReadmeError}</div>}
    {generating && <div className="doc-stream-status" role="status" aria-live="polite">
      <span className="inline-flex items-center gap-2"><LoaderCircle size={13} className="animate-spin"/>Generating {definition.label}…</span>
      <span className="doc-stream-preview">{streamText.slice(-240)}</span>
    </div>}

    <div className={`doc-studio-body ${leftPanelOpen ? "" : "sidebar-collapsed"}`}>
      {leftPanelOpen && <aside className="doc-studio-sidebar">
        <DocOptionsPanel type={type} options={options} onChange={updateOptions} onReset={() => {
          const defaults = defaultOptions(repo, type);
          setOptions(defaults);
          setSections(type === "gitignore" ? defaults.gitignoreStacks : getDefaultSections(type));
          setSectionOrder(definition.sections.map((item) => item.id));
          setDirty(true);
        }}/>
        {definition.sections.length
          ? <SectionToggleList sections={definition.sections} order={sectionOrder} enabled={sections} onToggle={updateSections} onReorder={(nextOrder) => { setSectionOrder(nextOrder); setDirty(true); }}/>
          : <p className="doc-legal-note">License terms are kept as a complete text. Do not remove required clauses.</p>}
      </aside>}
      <section className="doc-studio-main" aria-label="Documentation editor">
        <DocToolbar
          filename={definition.filename}
          wordCount={documentStats.words}
          characterCount={documentStats.characters}
          readingMinutes={documentStats.readingMinutes}
          canCompare={type === "readme" && Boolean(readmeFile)}
          isText={isPlainText}
          onCopy={copyDocument}
          onDownload={downloadDocument}
          onCopyHtml={copyHtml}
          onDownloadZip={downloadZip}
          onSaveVersion={saveCurrentVersion}
          onOpenHistory={() => { loadVersions(); setHistoryOpen(true); }}
          onCompare={loadExistingReadme}
          onGithub={openOnGitHub}
          onToggleFullscreen={() => setFullscreen((value) => !value)}
        />
        {readmeFile && type === "readme" && <button type="button" className="doc-compare-link" onClick={loadExistingReadme} disabled={loadingReadme}>
          {loadingReadme ? <LoaderCircle size={12} className="animate-spin"/> : <ChevronRight size={12}/>}
          Compare with current README
        </button>}
        <div className="doc-view-switcher" role="tablist" aria-label="Document view">
          {[["editor", "Editor"], ["split", "Split"], ["preview", "Preview"]].map(([id, label]) => <button type="button" role="tab" aria-selected={view === id} className={view === id ? "active" : ""} key={id} onClick={() => setView(id)}>{label}</button>)}
        </div>
        <div className={`doc-workbench view-${view} ${isPlainText ? "plain-text" : ""}`}>
          <section className={`doc-editor-pane ${view === "preview" ? "hidden" : ""}`}>
            <div className="doc-pane-heading"><span>Editor</span><span>{definition.filename}</span></div>
            <DocEditor value={markdown} onChange={handleChange} textareaRef={editorRef} onScroll={(event) => syncScroll(event.currentTarget)} onFormat={insertFormatting} outputType={definition.outputType || "markdown"}/>
          </section>
          <section className={`doc-preview-pane ${view === "editor" ? "doc-preview-hidden" : ""}`}>
            <DocPreview markdown={markdown} outputType={definition.outputType || "markdown"} previewRef={previewRef} onScroll={syncScroll}/>
          </section>
          <MarkdownOutline markdown={markdown} onSelect={jumpToHeading}/>
        </div>
        <p className="doc-ai-disclaimer">AI-generated documentation may contain mistakes. Review before publishing.</p>
        {copied && <span className="sr-only" role="status">Copied to clipboard</span>}
      </section>
    </div>

    <VersionHistoryDrawer key={type} open={historyOpen} versions={versions.filter((version) => version.type === type)} onClose={() => setHistoryOpen(false)} onRestore={restoreVersion} onRename={renameVersion} onDelete={deleteVersion}/>
    <ExistingReadmeCompare open={compareOpen} existing={existingReadme} current={markdown} onClose={() => setCompareOpen(false)} onStartFromExisting={startFromExisting}/>
  </div>;
}
