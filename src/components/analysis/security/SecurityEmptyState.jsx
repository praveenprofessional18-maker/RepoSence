import { ShieldCheck } from "lucide-react";

export default function SecurityEmptyState() {
  return <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
    <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400"><ShieldCheck size={20}/></span>
    <h3 className="mb-1 mt-3 text-sm font-semibold">No issues found by heuristic checks</h3>
    <p className="mx-auto mb-0 max-w-lg text-[10px] leading-5 text-muted">This is not a guarantee of security. These checks can miss issues or flag harmless code; review the repository and rotate any credentials that may have been exposed.</p>
  </div>;
}
