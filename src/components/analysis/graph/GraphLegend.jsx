export default function GraphLegend({ colorBy, colors = [] }) {
  return <div className="card flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3" aria-label="Graph legend">
    <span className="text-[9px] font-semibold uppercase tracking-wide text-muted">Legend</span>
    {colors.slice(0, 6).map((item) => <span className="inline-flex items-center gap-1.5 text-[9px] text-muted" key={item.label}>
      <i className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} aria-hidden="true"/>
      {item.label}
    </span>)}
    <span className="inline-flex items-center gap-1.5 text-[9px] text-muted"><i className="h-0.5 w-5 bg-violet-400"/>Import / child edge</span>
    <span className="inline-flex items-center gap-1.5 text-[9px] text-muted"><i className="w-5 border-t-2 border-dashed border-rose-500"/>Circular dependency</span>
    <span className="ml-auto text-[9px] text-muted">Color by {colorBy === "folder" ? "folder" : "file type"}</span>
  </div>;
}
