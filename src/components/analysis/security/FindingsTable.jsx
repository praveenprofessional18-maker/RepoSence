import FindingCard from "./FindingCard";

export default function FindingsTable({ findings, falsePositives, onToggleFalsePositive, onExplain, onOpenFile }) {
  return <div className="grid min-w-0 gap-3" aria-label="Security findings">
    {findings.map((finding) => <FindingCard
      key={finding.id}
      finding={finding}
      falsePositive={falsePositives.includes(finding.id)}
      onToggleFalsePositive={() => onToggleFalsePositive(finding.id)}
      onExplain={() => onExplain(finding)}
      onOpenFile={() => onOpenFile(finding)}
    />)}
  </div>;
}
