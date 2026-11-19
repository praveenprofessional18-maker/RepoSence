import { Layers3 } from "lucide-react";
import { TechBadge } from "../common";

const groups = [
  { key: "shared", label: "Shared stack" },
  { key: "onlyA", label: "Only in Repo A" },
  { key: "onlyB", label: "Only in Repo B" }
];

export default function TechStackDiff({ techStack }) {
  return <section className="card min-w-0">
    <div className="card-header"><h2 className="card-title m-0 flex items-center gap-2"><Layers3 size={14} className="text-violet-400"/>Technology stack</h2></div>
    <div className="grid gap-4 p-4 md:grid-cols-3">
      {groups.map(({ key, label }) => <section key={key}>
        <h3 className="mb-2 text-[10px] font-semibold">{label} <span className="ml-1 text-muted">({techStack[key].length})</span></h3>
        <div className="flex flex-wrap gap-1.5">
          {techStack[key].length ? techStack[key].map((item) => <TechBadge key={item}>{item}</TechBadge>) :
            <span className="text-[9px] text-muted">No framework or library entries.</span>}
        </div>
      </section>)}
    </div>
  </section>;
}
