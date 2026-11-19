import { Archive, Clipboard, Code2, Download, ExternalLink, FileClock, GitCompare, Maximize, Save } from "lucide-react";
import { Button } from "../common";

export default function DocToolbar({
  filename,
  wordCount,
  characterCount,
  readingMinutes,
  canCompare,
  isText,
  onCopy,
  onDownload,
  onCopyHtml,
  onDownloadZip,
  onSaveVersion,
  onOpenHistory,
  onCompare,
  onGithub,
  onToggleFullscreen
}) {
  return <div className="doc-toolbar">
    <div className="doc-toolbar-meta"><span className="tag">{wordCount} words</span><span className="tag">{characterCount} characters</span><span className="tag">{readingMinutes} min read</span></div>
    <div className="doc-toolbar-actions">
      {canCompare && <Button variant="secondary" size="sm" onClick={onCompare} aria-label="Compare with current README"><GitCompare size={13}/><span className="hidden sm:inline">Compare README</span></Button>}
      <Button variant="secondary" size="sm" onClick={onCopy} aria-label="Copy document"><Clipboard size={13}/><span className="hidden sm:inline">Copy</span></Button>
      {!isText && <Button variant="secondary" size="sm" onClick={onCopyHtml} aria-label="Copy as HTML"><Code2 size={13}/><span className="hidden sm:inline">Copy as HTML</span></Button>}
      <Button variant="secondary" size="sm" onClick={onDownload} aria-label={`Download ${filename}`}><Download size={13}/><span className="hidden sm:inline">{filename}</span></Button>
      <Button variant="secondary" size="sm" onClick={onDownloadZip} aria-label="Download all generated documents as ZIP"><Archive size={13}/><span className="hidden sm:inline">ZIP all docs</span></Button>
      <Button variant="secondary" size="sm" onClick={onSaveVersion} aria-label="Save document version"><Save size={13}/><span className="hidden sm:inline">Save version</span></Button>
      <Button variant="secondary" size="sm" onClick={onOpenHistory} aria-label="Open document version history"><FileClock size={13}/><span className="hidden sm:inline">Versions</span></Button>
      <Button variant="secondary" size="sm" onClick={onGithub} aria-label="Copy to GitHub"><ExternalLink size={13}/><span className="hidden sm:inline">Copy to GitHub</span></Button>
      <button type="button" className="icon-btn" onClick={onToggleFullscreen} aria-label="Toggle fullscreen editor" title="Toggle fullscreen"><Maximize size={14}/></button>
    </div>
  </div>;
}
