import { useState } from "react";
import { AlertCircle, Check, ChevronDown, ChevronRight, Clipboard, LoaderCircle, Search, X } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export function Button({ children, variant = "primary", size = "md", className = "", ...props }) {
  const styles = variant === "primary" ? "btn-primary" : variant === "ghost" ? "btn-ghost" : variant === "danger" ? "btn-danger" : "btn-secondary";
  return <button className={`btn ${styles} ${size === "sm" ? "btn-sm" : ""} ${className}`} {...props}>{children}</button>;
}

export function Input({ label, error, className = "", id, ...props }) {
  const errorId = id ? `${id}-error` : undefined;
  return <label className={`block ${className}`}>{label && <span className="mb-2 block text-sm font-medium">{label}</span>}<input id={id} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} className={`input ${error ? "input-error" : ""}`} {...props} />{error && <span id={errorId} role="alert" className="mt-1.5 block text-xs text-rose-400">{error}</span>}</label>;
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return <button className="icon-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title="Toggle theme"><span className="text-base">{theme === "dark" ? "☼" : "☾"}</span></button>;
}

export function Spinner({ label = "Loading..." }) {
  return <span className="inline-flex items-center gap-2 text-sm text-muted"><LoaderCircle size={16} className="animate-spin" aria-hidden="true" />{label}</span>;
}

export function Skeleton({ className = "" }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function EmptyState({ icon: Icon = AlertCircle, title, description, action }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={22} /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function ErrorState({ message = "Something went wrong.", onRetry }) {
  return <div className="empty-state"><span className="empty-icon text-rose-400"><AlertCircle size={22} /></span><h3>We hit a snag</h3><p>{message}</p>{onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}</div>;
}

export function SearchInput({ value, onChange, placeholder = "Search..." }) {
  return <div className="search-wrap"><Search size={16} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} />{value && <button aria-label="Clear search" onClick={() => onChange("")}><X size={14} /></button>}</div>;
}

export function ConfirmModal({ open, title, description, confirmText = "Delete", onConfirm, onCancel, danger = true }) {
  if (!open) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={onCancel} aria-label="Close dialog"><X size={18} /></button><div className="mb-4 text-rose-400"><AlertCircle size={24} /></div><h2 id="modal-title">{title}</h2><p>{description}</p><div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmText}</Button></div></section></div>;
}

export function Accordion({ items }) {
  const [active, setActive] = useState(-1);
  return <div className="divide-y divide-line">{items.map((item, index) => <div key={item.title}><button className="flex w-full items-center justify-between py-4 text-left font-medium hover:text-violet-400" aria-expanded={active === index} onClick={() => setActive(active === index ? -1 : index)}>{item.title}<ChevronDown size={16} className={`transition-transform ${active === index ? "rotate-180" : ""}`} /></button>{active === index && <p className="pb-4 text-sm leading-6 text-muted">{item.content}</p>}</div>)}</div>;
}

export function TechBadge({ children }) {
  return <span className="tag">{children}</span>;
}

export function Breadcrumbs({ items }) {
  return <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 text-xs text-muted">{items.map((item, index) => <span className="inline-flex items-center gap-2" key={item.label}>{index > 0 && <ChevronRight size={12} />}{item.href ? <a href={item.href} className="hover:text-main">{item.label}</a> : <span className="text-main">{item.label}</span>}</span>)}</nav>;
}

export function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { setCopied(false); }
  };
  return <Button variant="secondary" size="sm" onClick={handleCopy}>{copied ? <Check size={14} /> : <Clipboard size={14} />}{copied ? "Copied" : "Copy"}</Button>;
}
