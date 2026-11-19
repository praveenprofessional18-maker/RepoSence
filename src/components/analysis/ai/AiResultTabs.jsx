export default function AiResultTabs({ active, onChange }) {
  return <div className="ai-result-tabs" role="tablist" aria-label="AI result drawer sections">
    <button type="button" role="tab" aria-selected={active === "result"} className={active === "result" ? "active" : ""} onClick={() => onChange("result")}>Result</button>
    <button type="button" role="tab" aria-selected={active === "history"} className={active === "history" ? "active" : ""} onClick={() => onChange("history")}>History</button>
  </div>;
}
