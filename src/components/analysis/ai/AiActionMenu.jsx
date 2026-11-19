import { useEffect, useRef, useState } from "react";
import { Bug, ChevronDown, FlaskConical, MessageSquare, Settings2, Sparkles, Wand2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../common";
import { AI_ACTIONS, readLastAiAction, saveLastAiAction } from "../../../utils/aiActions";
import AiOptionsPopover from "./AiOptionsPopover";

const iconByName = { Sparkles, MessageSquare, Wand2, FlaskConical, Bug };

export default function AiActionMenu({ disabled = false, disabledReason = "", onAction, preferences, onPreferencesChange, trimNotice = "" }) {
  const [lastAction, setLastAction] = useState(readLastAiAction);
  const [menuOpen, setMenuOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const rootRef = useRef(null);
  const activeAction = AI_ACTIONS.find((action) => action.id === lastAction) || AI_ACTIONS[0];
  const ActiveIcon = iconByName[activeAction.icon] || Sparkles;

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setMenuOpen(false);
        setOptionsOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setOptionsOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const chooseAction = (action) => {
    let savedAction = action.id;
    try {
      savedAction = saveLastAiAction(action);
    } catch (error) {
      toast.error(error.message || "Could not save the last-used AI action.");
    }
    setLastAction(savedAction);
    setMenuOpen(false);
    onAction(action.id);
  };

  return <div ref={rootRef} className="ai-action-menu">
    <div className="flex items-center">
      <Button variant="secondary" size="sm" onClick={() => onAction(activeAction.id)} disabled={disabled} title={disabled ? disabledReason : activeAction.description} aria-label={`${activeAction.label} current file`}>
        <ActiveIcon size={13}/>{activeAction.label}
      </Button>
      <button type="button" className="ai-menu-split" aria-label="Choose AI action" aria-haspopup="menu" aria-expanded={menuOpen} disabled={disabled} title={disabled ? disabledReason : "Choose another AI action"} onClick={() => setMenuOpen((open) => !open)}><ChevronDown size={13}/></button>
      <button type="button" className="icon-btn ml-1 !h-8 !w-8" aria-label="AI action options" aria-haspopup="dialog" aria-expanded={optionsOpen} title="AI action options" onClick={() => { setMenuOpen(false); setOptionsOpen((open) => !open); }}><Settings2 size={14}/></button>
    </div>
    {menuOpen && <div className="ai-action-list" role="menu" aria-label="File AI actions">
      {AI_ACTIONS.map((action) => {
        const Icon = iconByName[action.icon] || Sparkles;
        return <button type="button" className="ai-action-option" role="menuitem" key={action.id} onClick={() => chooseAction(action)}>
          <Icon size={14}/>
          <span><strong>{action.label}</strong><small>{action.description}</small></span>
        </button>;
      })}
    </div>}
    <AiOptionsPopover open={optionsOpen} preferences={preferences} onChange={onPreferencesChange} onClose={() => setOptionsOpen(false)}/>
    {trimNotice && <p className="m-0 mt-1 text-right text-[9px] text-amber-400">{trimNotice}</p>}
  </div>;
}
