const levels = [
  ["critical", "Critical", "tag-danger"],
  ["high", "High", "tag-danger"],
  ["medium", "Medium", "tag-warning"],
  ["low", "Low", ""],
  ["info", "Info", ""]
];

export default function SeveritySummary({ summary, selected, onSelect }) {
  return <div className="flex flex-wrap gap-2" aria-label="Findings by severity">
    {levels.map(([level, label, style]) => <button
      type="button"
      key={level}
      className={`tag ${style} ${selected === level ? "ring-1 ring-violet-400" : ""}`}
      aria-pressed={selected === level}
      onClick={() => onSelect(selected === level ? "all" : level)}
    >
      {label}<strong>{summary[level] || 0}</strong>
    </button>)}
  </div>;
}
